"""Azure SSML assembly for validated audiobook segments."""

from __future__ import annotations

import re
from xml.sax.saxutils import escape

from novel_tts_system.processor.character_registry import CharacterRegistry
from novel_tts_system.schemas import AZURE_EXPRESSIVE_STYLES, DialogueSegment


_XML_INVALID_CHARS = re.compile(
    "[\x00-\x08\x0b\x0c\x0e-\x1f\ufffe\uffff]"
)


class SSMLBuilder:
    """Convert dialogue segments into Azure Speech SSML."""

    def __init__(
        self,
        registry: CharacterRegistry,
        language: str = "zh-CN",
        speaker_break_ms: int = 300,
        enable_styles: bool = True,
    ) -> None:
        self.registry = registry
        self.language = language
        self.speaker_break_ms = speaker_break_ms
        self.enable_styles = enable_styles

    def build_chunk_ssml(self, segments: list[DialogueSegment]) -> str:
        """Build one complete SSML document for a chunk."""

        lines = [
            (
                f'<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" '
                f'xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="{escape(self.language)}">'
            )
        ]

        previous_speaker: str | None = None
        for segment in segments:
            leading_break_ms = (
                self.speaker_break_ms
                if previous_speaker is not None and segment.speaker != previous_speaker
                else None
            )
            lines.append(self._segment_to_ssml(segment, leading_break_ms=leading_break_ms))
            previous_speaker = segment.speaker

        lines.append("</speak>")
        return "\n".join(lines)

    def build_many(self, segment_groups: list[list[DialogueSegment]]) -> list[str]:
        """Build SSML documents for several chunks."""

        return [self.build_chunk_ssml(segments) for segments in segment_groups]

    def _segment_to_ssml(self, segment: DialogueSegment, leading_break_ms: int | None = None) -> str:
        voice = self.registry.get_voice(segment.speaker, segment_type=segment.type)
        style = segment.emotion if segment.emotion in AZURE_EXPRESSIVE_STYLES else voice.base_style
        rate = self._combine_percent(voice.rate_offset, segment.rate_offset)
        pitch = self._combine_percent(voice.pitch_offset, segment.pitch_offset)
        text = escape(self._sanitize_xml_text(segment.text))

        break_tag = f'<break time="{max(0, leading_break_ms)}ms"/>' if leading_break_ms is not None else ""
        prosody = f'<prosody rate="{rate}" pitch="{pitch}">{text}</prosody>'
        if self.enable_styles and style in AZURE_EXPRESSIVE_STYLES:
            body = f'{break_tag}<mstts:express-as style="{escape(style)}" styledegree="{segment.style_degree:.1f}">{prosody}</mstts:express-as>'
        else:
            body = f"{break_tag}{prosody}"
        return f'  <voice name="{escape(voice.voice_name)}">{body}</voice>'

    @staticmethod
    def _sanitize_xml_text(text: str) -> str:
        """Remove XML-invalid control characters before Azure receives SSML."""

        return _XML_INVALID_CHARS.sub("", text)

    @staticmethod
    def _combine_percent(base: str, offset: str) -> str:
        def parse(value: str) -> int:
            cleaned = value.strip().replace("%", "")
            try:
                return int(float(cleaned))
            except ValueError:
                return 0

        combined = max(-50, min(50, parse(base) + parse(offset)))
        return f"{combined:+d}%"
