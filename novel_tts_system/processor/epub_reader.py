"""EPUB parsing utilities for extracting readable novel text."""

from __future__ import annotations

import html
import io
import posixpath
import re
import zipfile
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import PurePosixPath, Path
from typing import Any, BinaryIO
from urllib.parse import unquote
from xml.etree import ElementTree as ET


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


def _open_epub_archive(epub_source: Path | str | bytes | BinaryIO) -> zipfile.ZipFile:
    """Open an EPUB archive from Path, string path, bytes, or file-like object."""
    if isinstance(epub_source, (bytes, bytearray)):
        bio = io.BytesIO(epub_source)
        if not zipfile.is_zipfile(bio):
            raise EpubParseError("上传的数据不是有效的 EPUB/ZIP 文件格式")
        bio.seek(0)
        return zipfile.ZipFile(bio)
    if hasattr(epub_source, "read") and hasattr(epub_source, "seek"):
        if not zipfile.is_zipfile(epub_source):
            raise EpubParseError("输入流不是有效的 EPUB/ZIP 文件")
        epub_source.seek(0)
        return zipfile.ZipFile(epub_source)
    p = Path(epub_source)
    if not p.exists():
        raise FileNotFoundError(f"EPUB 文件不存在: {p}")
    if not zipfile.is_zipfile(p):
        raise EpubParseError(f"文件不是有效的 EPUB/ZIP 压缩包: {p}")
    return zipfile.ZipFile(p)


def read_epub_text(epub_path: Path | str | bytes, chapter_limit: int = 0, min_body_chars: int = 500) -> str:
    """Extract text from an EPUB, optionally limiting to the first N chapter sections."""

    sections = read_epub_sections(epub_path)
    selected = select_chapter_sections(sections, chapter_limit=chapter_limit, min_body_chars=min_body_chars)
    text = "\n\n".join(section.text for section in selected if section.text.strip()).strip()
    if not text:
        raise EpubParseError(f"No readable text found in EPUB: {epub_path}")
    return text


def read_epub_sections(epub_path: Path | str | bytes) -> list[EpubSection]:
    """Read text-bearing spine sections from an EPUB file or in-memory byte buffer."""

    with _open_epub_archive(epub_path) as archive:
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


def _parse_opf_metadata(opf_xml: str) -> dict[str, str]:
    """Extract title, creator, language, and description metadata from OPF."""
    meta: dict[str, str] = {}
    try:
        root = ET.fromstring(opf_xml)
        title_elem = root.find(".//{*}metadata/{*}title")
        if title_elem is None:
            title_elem = root.find(".//{*}title")
        if title_elem is not None and title_elem.text:
            meta["title"] = title_elem.text.strip()

        creator_elem = root.find(".//{*}metadata/{*}creator")
        if creator_elem is None:
            creator_elem = root.find(".//{*}creator")
        if creator_elem is not None and creator_elem.text:
            meta["creator"] = creator_elem.text.strip()

        lang_elem = root.find(".//{*}metadata/{*}language")
        if lang_elem is not None and lang_elem.text:
            meta["language"] = lang_elem.text.strip()

        desc_elem = root.find(".//{*}metadata/{*}description")
        if desc_elem is not None and desc_elem.text:
            meta["description"] = desc_elem.text.strip()
    except Exception:
        pass
    return meta


def _looks_like_chapter_title(title: str) -> bool:
    """Check if title looks like a novel chapter heading."""
    if not title:
        return False
    return bool(re.search(r"第\s*[0-9〇零一二两三四五六七八九十百千万]+\s*[章节回卷部]", title)) or bool(
        re.search(r"^(Chapter|Episode|Section)\s*\d+", title, re.IGNORECASE)
    )


def _split_section_into_subchapters(section: EpubSection) -> list[dict[str, Any]]:
    """Intelligently split a section if it contains multiple chapter headings inside."""
    lines = section.text.splitlines()
    sub_chapters: list[dict[str, Any]] = []
    heading_pattern = re.compile(r"^\s*(第\s*[0-9〇零一二两三四五六七八九十百千万]+\s*[章节回卷部][^\n]*)$")

    found_headings = [i for i, line in enumerate(lines) if heading_pattern.match(line.strip())]

    if len(found_headings) >= 2:
        # Multiple chapters within this single section
        for idx, line_idx in enumerate(found_headings):
            title = lines[line_idx].strip()
            next_line_idx = found_headings[idx + 1] if idx + 1 < len(found_headings) else len(lines)
            body = "\n".join(lines[line_idx + 1:next_line_idx]).strip()
            sub_chapters.append({
                "title": title,
                "text": body,
                "href": f"{section.href}#part{idx + 1}",
            })
    else:
        # Section is a single chapter
        sub_chapters.append({
            "title": section.title or (lines[0].strip() if lines else ""),
            "text": section.text,
            "href": section.href,
        })
    return sub_chapters


def parse_epub_book(
    epub_source: Path | str | bytes,
    chapter_limit: int = 0,
    min_chapter_chars: int = 30,
) -> dict[str, Any]:
    """Parse an EPUB archive into structured book metadata, chapters, and full text.

    Supports files on disk (Path / str) or in-memory byte buffers directly.
    """
    with _open_epub_archive(epub_source) as archive:
        rootfile = _find_rootfile(archive)
        opf_xml = _read_archive_text(archive, rootfile)
        manifest, spine = _parse_opf(opf_xml)
        meta = _parse_opf_metadata(opf_xml)
        base_dir = PurePosixPath(rootfile).parent.as_posix()

        raw_sections: list[EpubSection] = []
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
            raw_sections.append(EpubSection(index=len(raw_sections), href=archive_name, title=title, text=text))

    if not raw_sections:
        raise EpubParseError("EPUB 电子书中未找到任何可读文本章节内容")

    # Filter out pure cover / TOC / copyright notices unless that is all that exists
    content_sections = [
        s for s in raw_sections
        if _looks_like_content(s, min_body_chars=min_chapter_chars)
    ]
    if not content_sections:
        content_sections = [s for s in raw_sections if s.text.strip()]

    # Check if sections need splitting into subchapters
    expanded: list[dict[str, Any]] = []
    for sec in content_sections:
        sub_chapters = _split_section_into_subchapters(sec)
        for sub in sub_chapters:
            if len(sub["text"].strip()) >= min_chapter_chars or _looks_like_chapter_title(sub["title"]):
                expanded.append(sub)

    if not expanded:
        for sec in content_sections:
            expanded.append({
                "title": sec.title or f"第{len(expanded) + 1}节",
                "text": sec.text,
                "href": sec.href,
            })

    if chapter_limit > 0:
        expanded = expanded[:chapter_limit]

    # Clean and index chapters
    result_chapters: list[dict[str, Any]] = []
    for idx, c in enumerate(expanded):
        c_title = c["title"].strip() or f"第{idx + 1}章"
        c_text = c["text"].strip()
        result_chapters.append({
            "id": idx + 1,
            "title": c_title,
            "content": c_text,
            "char_count": len(c_text),
            "href": c.get("href", ""),
        })

    book_title = meta.get("title", "")
    if not book_title:
        if isinstance(epub_source, (str, Path)):
            book_title = Path(epub_source).stem
        elif result_chapters:
            book_title = result_chapters[0]["title"]
        else:
            book_title = "未命名电子书"

    # Assemble full text for studio editor view
    full_text = "\n\n".join(f"{c['title']}\n{c['content']}" for c in result_chapters)

    return {
        "status": "ok",
        "title": book_title,
        "author": meta.get("creator", ""),
        "language": meta.get("language", "zh-CN"),
        "total_chapters": len(result_chapters),
        "total_chars": sum(c["char_count"] for c in result_chapters),
        "chapters": result_chapters,
        "full_text": full_text,
    }


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
