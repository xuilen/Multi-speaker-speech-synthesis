"""Text cleaning and sliding-window chunking for long-form novels."""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

from novel_tts_system.schemas import NovelChunk


_INVISIBLE_CHARS = re.compile(r"[\u200b-\u200f\u202a-\u202e\u2060\ufeff]")
_BLANK_LINES = re.compile(r"\n\s*\n+")
_SENTENCE_SPLIT = re.compile(r"(?<=[。！？!?；;])")


@dataclass(slots=True)
class SlidingWindowChunker:
    """Clean raw text and split it into context-aware natural chunks."""

    target_chars: int = 850
    min_chars: int = 600
    max_chars: int = 1000
    prefix_context_chars: int = 200

    def clean_text(self, text: str) -> str:
        """Normalize punctuation, quote marks, whitespace, and invisible chars."""

        normalized = unicodedata.normalize("NFC", text)
        normalized = _INVISIBLE_CHARS.sub("", normalized)
        normalized = normalized.replace("\r\n", "\n").replace("\r", "\n")
        normalized = normalized.replace("「", "“").replace("」", "”")
        normalized = normalized.replace("『", "“").replace("』", "”")
        normalized = normalized.replace("‘", "'").replace("’", "'")
        normalized = self._normalize_double_quotes(normalized)
        normalized = self._normalize_cjk_punctuation(normalized)
        normalized = normalized.replace("...", "……")
        normalized = re.sub(r"[ \t]+", " ", normalized)
        normalized = re.sub(r"\n[ \t]+", "\n", normalized)
        normalized = re.sub(r"[。]{2,}", "。", normalized)
        normalized = re.sub(r"[!！]{2,}", "！", normalized)
        normalized = re.sub(r"[?？]{2,}", "？", normalized)
        normalized = _BLANK_LINES.sub("\n\n", normalized)
        return normalized.strip()

    def chunk(self, raw_text: str) -> list[NovelChunk]:
        """Split raw text into target chunks with prefix-only context windows."""

        text = self.clean_text(raw_text)
        if not text:
            return []

        units = self._paragraph_units(text)
        target_texts: list[str] = []
        current: list[str] = []
        current_len = 0

        for unit in units:
            unit_len = len(unit)
            separator_len = 1 if current else 0
            would_exceed = current_len + separator_len + unit_len > self.max_chars

            if current and would_exceed and current_len >= self.min_chars:
                target_texts.append("\n".join(current).strip())
                current = [unit]
                current_len = unit_len
                continue

            if current and current_len >= self.target_chars and unit_len > 0:
                target_texts.append("\n".join(current).strip())
                current = [unit]
                current_len = unit_len
                continue

            current.append(unit)
            current_len += separator_len + unit_len

            if current_len >= self.max_chars:
                target_texts.append("\n".join(current).strip())
                current = []
                current_len = 0

        if current:
            trailing = "\n".join(current).strip()
            if target_texts and len(trailing) < self.min_chars:
                target_texts[-1] = f"{target_texts[-1]}\n{trailing}".strip()
            else:
                target_texts.append(trailing)

        chunks: list[NovelChunk] = []
        cursor = 0
        processed = ""
        for index, target in enumerate(target_texts):
            start = text.find(target, cursor)
            if start < 0:
                start = cursor
            end = start + len(target)
            prefix = processed[-self.prefix_context_chars :]
            chunks.append(
                NovelChunk(
                    index=index,
                    prefix_context=prefix,
                    target_text=target,
                    start_char=start,
                    end_char=end,
                )
            )
            processed = f"{processed}{target}"
            cursor = end

        return chunks

    def _paragraph_units(self, text: str) -> list[str]:
        paragraphs = [paragraph.strip() for paragraph in _BLANK_LINES.split(text) if paragraph.strip()]
        units: list[str] = []
        for paragraph in paragraphs:
            if len(paragraph) <= self.max_chars:
                units.append(paragraph)
                continue
            units.extend(self._split_long_paragraph(paragraph))
        return units

    def _split_long_paragraph(self, paragraph: str) -> list[str]:
        sentences = [sentence.strip() for sentence in _SENTENCE_SPLIT.split(paragraph) if sentence.strip()]
        units: list[str] = []
        current = ""
        for sentence in sentences:
            if not current:
                current = sentence
                continue
            if len(current) + len(sentence) > self.max_chars:
                units.extend(self._hard_split(current))
                current = sentence
            else:
                current = f"{current}{sentence}"
        if current:
            units.extend(self._hard_split(current))
        return units

    def _hard_split(self, text: str) -> list[str]:
        if len(text) <= self.max_chars:
            return [text]
        return [text[i : i + self.max_chars] for i in range(0, len(text), self.max_chars)]

    @staticmethod
    def _normalize_double_quotes(text: str) -> str:
        """Convert straight double quotes into Chinese left/right quotes."""

        result: list[str] = []
        quote_open = True
        for char in text:
            if char == '"':
                result.append("“" if quote_open else "”")
                quote_open = not quote_open
            else:
                result.append(char)
        return "".join(result)

    @staticmethod
    def _normalize_cjk_punctuation(text: str) -> str:
        """Normalize common half-width punctuation used in Chinese prose."""

        translation = str.maketrans(
            {
                ",": "，",
                ":": "：",
                ";": "；",
                "!": "！",
                "?": "？",
            }
        )
        return text.translate(translation)
