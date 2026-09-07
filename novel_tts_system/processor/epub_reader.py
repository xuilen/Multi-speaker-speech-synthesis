"""EPUB parsing utilities for extracting readable novel text."""

from __future__ import annotations

import html
import posixpath
import re
import zipfile
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import PurePosixPath
from urllib.parse import unquote
from xml.etree import ElementTree as ET

from pathlib import Path


class EpubParseError(RuntimeError):
    """Raised when an EPUB cannot be parsed as a readable book."""


@dataclass(slots=True)
class EpubSection:
    """One text-bearing EPUB spine section."""

    index: int
    href: str
    title: str
    text: str

    @property
    def body_length(self) -> int:
        """Return length excluding the title line."""

        if self.title and self.text.startswith(self.title):
            return max(0, len(self.text) - len(self.title))
        return len(self.text)


class _XhtmlTextExtractor(HTMLParser):
    """Extract human-readable paragraph text from XHTML/HTML."""

    _BLOCK_TAGS = {
        "address",
        "article",
        "aside",
        "blockquote",
        "br",
        "dd",
        "div",
        "dl",
        "dt",
        "figcaption",
        "figure",
        "footer",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "header",
        "hr",
        "li",
        "main",
        "nav",
        "ol",
        "p",
        "pre",
        "section",
        "table",
        "td",
        "th",
        "tr",
        "ul",
    }
    _SKIP_TAGS = {"script", "style", "svg", "audio", "video"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.heading_parts: list[str] = []
        self._skip_depth = 0
        self._heading_depth = 0

    @property
    def text(self) -> str:
        """Return normalized extracted text."""

        raw = "".join(self.parts)
        raw = html.unescape(raw)
        raw = re.sub(r"[ \t\u3000]+", " ", raw)
        raw = re.sub(r"\n[ \t]+", "\n", raw)
        raw = re.sub(r"\n{3,}", "\n\n", raw)
        return _collapse_duplicate_lines(raw.strip())

    @property
    def title(self) -> str:
        """Return the first heading text, if one was found."""

        title = "".join(self.heading_parts)
        title = html.unescape(title)
        title = re.sub(r"\s+", " ", title)
        return title.strip()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        if tag in self._SKIP_TAGS:
            self._skip_depth += 1
            return
        if self._skip_depth:
            return
        if tag in self._BLOCK_TAGS:
            self._append_break()
        if tag in {"h1", "h2", "h3"}:
            self._heading_depth += 1

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in self._SKIP_TAGS and self._skip_depth:
            self._skip_depth -= 1
            return
        if self._skip_depth:
            return
        if tag in {"h1", "h2", "h3"} and self._heading_depth:
            self._heading_depth -= 1
        if tag in self._BLOCK_TAGS:
            self._append_break()

    def handle_data(self, data: str) -> None:
        if self._skip_depth:
            return
        text = data.replace("\xa0", " ")
        if not text.strip():
            return
        self.parts.append(text)
        if self._heading_depth:
            self.heading_parts.append(text)

    def _append_break(self) -> None:
        if not self.parts:
            return
        if not self.parts[-1].endswith("\n"):
            self.parts.append("\n")


def read_epub_text(epub_path: Path, chapter_limit: int = 0, min_body_chars: int = 500) -> str:
    """Extract text from an EPUB, optionally limiting to the first N chapter sections."""

    sections = read_epub_sections(epub_path)
    selected = select_chapter_sections(sections, chapter_limit=chapter_limit, min_body_chars=min_body_chars)
    text = "\n\n".join(section.text for section in selected if section.text.strip()).strip()
    if not text:
        raise EpubParseError(f"No readable text found in EPUB: {epub_path}")
    return text


def read_epub_sections(epub_path: Path) -> list[EpubSection]:
    """Read text-bearing spine sections from an EPUB file."""

    if not epub_path.exists():
        raise FileNotFoundError(epub_path)
    if not zipfile.is_zipfile(epub_path):
        raise EpubParseError(f"Not a valid EPUB/ZIP file: {epub_path}")

    with zipfile.ZipFile(epub_path) as archive:
        rootfile = _find_rootfile(archive)
        opf_xml = _read_archive_text(archive, rootfile)
        manifest, spine = _parse_opf(opf_xml)
        base_dir = PurePosixPath(rootfile).parent.as_posix()
        sections: list[EpubSection] = []

        for itemref in spine:
            manifest_item = manifest.get(itemref)
            if not manifest_item:
                continue
            href, media_type = manifest_item
            if not _is_text_media(media_type, href):
                continue
            archive_name = _join_epub_path(base_dir, href)
            try:
                content = _read_archive_text(archive, archive_name)
            except KeyError:
                continue
            title, text = _extract_xhtml_text(content)
            if not text:
                continue
            sections.append(EpubSection(index=len(sections), href=archive_name, title=title, text=text))

    if not sections:
        raise EpubParseError(f"No text spine sections found in EPUB: {epub_path}")
    return sections


def select_chapter_sections(
    sections: list[EpubSection],
    chapter_limit: int = 0,
    min_body_chars: int = 500,
) -> list[EpubSection]:
    """Select likely real chapter sections, skipping cover/toc/preface where possible."""

    if chapter_limit <= 0:
        return sections

    chapter_like = [
        section
        for section in sections
        if _looks_like_chapter(section) and section.body_length >= max(0, min_body_chars)
    ]
    if len(chapter_like) >= chapter_limit:
        return chapter_like[:chapter_limit]

    content_sections = [section for section in sections if _looks_like_content(section, min_body_chars)]
    if len(content_sections) >= chapter_limit:
        return content_sections[:chapter_limit]

    readable = [section for section in sections if section.text.strip()]
    return readable[:chapter_limit]


def _find_rootfile(archive: zipfile.ZipFile) -> str:
    try:
        container_xml = _read_archive_text(archive, "META-INF/container.xml")
    except KeyError as exc:
        raise EpubParseError("EPUB is missing META-INF/container.xml") from exc

    root = ET.fromstring(container_xml)
    rootfile = root.find(".//{*}rootfile")
    if rootfile is None:
        raise EpubParseError("EPUB container has no rootfile entry")
    full_path = rootfile.attrib.get("full-path")
    if not full_path:
        raise EpubParseError("EPUB rootfile has no full-path")
    return unquote(full_path)


def _parse_opf(opf_xml: str) -> tuple[dict[str, tuple[str, str]], list[str]]:
    root = ET.fromstring(opf_xml)
    manifest: dict[str, tuple[str, str]] = {}
    for item in root.findall(".//{*}manifest/{*}item"):
        item_id = item.attrib.get("id")
        href = item.attrib.get("href")
        media_type = item.attrib.get("media-type", "")
        if item_id and href:
            manifest[item_id] = (unquote(href), media_type)

    spine: list[str] = []
    for itemref in root.findall(".//{*}spine/{*}itemref"):
        if itemref.attrib.get("linear", "yes").lower() == "no":
            continue
        item_id = itemref.attrib.get("idref")
        if item_id:
            spine.append(item_id)

    if not manifest or not spine:
        raise EpubParseError("EPUB OPF is missing manifest or spine entries")
    return manifest, spine


def _extract_xhtml_text(content: str) -> tuple[str, str]:
    parser = _XhtmlTextExtractor()
    parser.feed(content)
    parser.close()
    text = parser.text
    title = parser.title or _first_nonempty_line(text)
    if title and text and not text.startswith(title):
        text = f"{title}\n{text}"
    return title, text


def _read_archive_text(archive: zipfile.ZipFile, name: str) -> str:
    data = archive.read(name)
    for encoding in ("utf-8-sig", "utf-8", "gb18030"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="ignore")


def _join_epub_path(base_dir: str, href: str) -> str:
    href = href.split("#", 1)[0]
    path = posixpath.normpath(posixpath.join(base_dir, href))
    return path.lstrip("./")


def _is_text_media(media_type: str, href: str) -> bool:
    suffix = PurePosixPath(href).suffix.lower()
    return media_type in {"application/xhtml+xml", "text/html"} or suffix in {".xhtml", ".html", ".htm"}


def _looks_like_chapter(section: EpubSection) -> bool:
    title = section.title or _first_nonempty_line(section.text)
    if not title:
        return False
    return bool(re.search(r"第\s*[0-9〇零一二两三四五六七八九十百千万]+\s*[章节回卷部]", title))


def _looks_like_content(section: EpubSection, min_body_chars: int) -> bool:
    title = (section.title or "").lower()
    href = section.href.lower()
    if any(token in title or token in href for token in ("cover", "toc", "目录", "版权", "copyright")):
        return False
    return section.body_length >= max(0, min_body_chars)


def _first_nonempty_line(text: str) -> str:
    for line in text.splitlines():
        stripped = line.strip()
        if stripped:
            return stripped
    return ""


def _collapse_duplicate_lines(text: str) -> str:
    """Collapse repeated adjacent lines commonly produced by EPUB headings."""

    collapsed: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped and collapsed and stripped == collapsed[-1].strip():
            continue
        collapsed.append(line)
    return "\n".join(collapsed).strip()
