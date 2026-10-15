"""Unit tests for EPUB file parsing and book extraction."""

from __future__ import annotations

import io
from pathlib import Path
import zipfile
import pytest

from novel_tts_system.processor.epub_reader import (
    EpubParseError,
    parse_epub_book,
    read_epub_sections,
    read_epub_text,
)


def _create_mock_epub(
    book_title: str = "雪中悍刀行测试版",
    author: str = "烽火戏诸侯",
    multi_heading_section: bool = False,
) -> bytes:
    """Helper to create an in-memory valid EPUB 2.0/3.0 archive."""
    bio = io.BytesIO()
    with zipfile.ZipFile(bio, "w", zipfile.ZIP_DEFLATED) as zf:
        # 1. mimetype (uncompressed in standard epub, but standard zip is accepted)
        zf.writestr("mimetype", "application/epub+zip")

        # 2. META-INF/container.xml
        container_xml = """<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>"""
        zf.writestr("META-INF/container.xml", container_xml)

        # 3. OEBPS/content.opf
        opf_xml = f"""<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>{book_title}</dc:title>
    <dc:creator>{author}</dc:creator>
    <dc:language>zh-CN</dc:language>
  </metadata>
  <manifest>
    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="chapter2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="cover"/>
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
  </spine>
</package>"""
        zf.writestr("OEBPS/content.opf", opf_xml)

        # 4. Cover page (should be filtered out by content heuristic)
        cover_html = """<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>封面</title></head>
<body><h1>封面</h1><p>本书由网络整理。</p></body>
</html>"""
        zf.writestr("OEBPS/cover.xhtml", cover_html)

        # 5. Chapter 1
        if multi_heading_section:
            ch1_html = """<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>合卷第一卷</title></head>
<body>
  <h2>第一章 小二上酒</h2>
  <p>北椋王府门前，老仆牵马，风雪漫天。徐凤年披着羊皮裘，走进了客栈。</p>
  <h2>第二章 白狐儿脸</h2>
  <p>天下英雄如过江之鲫，唯有一袭白衣胜雪，双刀纵横。</p>
</body>
</html>"""
        else:
            ch1_html = """<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>第一章 小二上酒</title></head>
<body>
  <h1>第一章 小二上酒</h1>
  <p>北椋王府门前，老仆牵瘦马，风雪漫天。世子徐凤年一身寒酸，抬脚踢开厚重的木门。</p>
  <p>“小二，切二斤熟牛肉，来一壶陈年老黄酒！”</p>
</body>
</html>"""
        zf.writestr("OEBPS/chapter1.xhtml", ch1_html)

        # 6. Chapter 2
        ch2_html = """<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>第二章 剑气长存</title></head>
<body>
  <h1>第二章 剑气长存</h1>
  <p>老黄嘿嘿一笑，露出缺了门牙的牙齿，把剑匣放在石桌上。</p>
  <p>大黄庭运转全身，九千里江湖路，风起云涌。</p>
</body>
</html>"""
        zf.writestr("OEBPS/chapter2.xhtml", ch2_html)

    return bio.getvalue()


def test_parse_epub_book_from_bytes(tmp_path: Path):
    """Verify parse_epub_book parses an EPUB in memory directly."""
    epub_bytes = _create_mock_epub(book_title="雪中测试", author="烽火")
    result = parse_epub_book(epub_bytes, min_chapter_chars=10)

    assert result["status"] == "ok"
    assert result["title"] == "雪中测试"
    assert result["author"] == "烽火"
    assert result["total_chapters"] >= 2
    assert "第一章 小二上酒" in result["chapters"][0]["title"]
    assert "徐凤年" in result["chapters"][0]["content"]
    assert "第二章 剑气长存" in result["chapters"][1]["title"]
    assert "老黄" in result["chapters"][1]["content"]
    assert len(result["full_text"]) > 50


def test_parse_epub_book_from_file_path(tmp_path: Path):
    """Verify parse_epub_book works seamlessly when given a file Path."""
    epub_bytes = _create_mock_epub(book_title="剑来测试", author="烽火戏诸侯")
    file_path = tmp_path / "jianlai.epub"
    file_path.write_bytes(epub_bytes)

    result = parse_epub_book(file_path, min_chapter_chars=10)
    assert result["status"] == "ok"
    assert result["title"] == "剑来测试"
    assert result["author"] == "烽火戏诸侯"
    assert len(result["chapters"]) >= 2

    # Also test legacy read_epub_text
    raw_text = read_epub_text(file_path, min_body_chars=10)
    assert "小二上酒" in raw_text
    assert "剑气长存" in raw_text


def test_parse_epub_multi_heading_section_split():
    """Verify sections bundling multiple chapters are cleanly split by heading."""
    epub_bytes = _create_mock_epub(book_title="合卷测试", multi_heading_section=True)
    result = parse_epub_book(epub_bytes, min_chapter_chars=5)

    assert result["status"] == "ok"
    titles = [c["title"] for c in result["chapters"]]
    assert any("第一章 小二上酒" in t for t in titles)
    assert any("第二章 白狐儿脸" in t for t in titles)


def test_parse_epub_invalid_archive():
    """Verify corrupted / non-zip data raises clean EpubParseError."""
    with pytest.raises(EpubParseError):
        parse_epub_book(b"NOT_A_VALID_ZIP_ARCHIVE")
