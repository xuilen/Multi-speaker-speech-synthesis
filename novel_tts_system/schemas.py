"""Pydantic schemas shared across extraction, voice assignment, and TTS."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field, root_validator, validator


SegmentType = Literal["narration", "dialogue"]
Gender = Literal["male", "female", "unknown"]
AgeGroup = Literal["child", "young", "adult", "elder", "unknown"]
CharacterRole = Literal["protagonist", "supporting", "villain", "narrator", "unknown"]

AZURE_EXPRESSIVE_STYLES: set[str] = {
    "affectionate",
    "angry",
    "assistant",
    "calm",
    "chat",
    "cheerful",
    "customerservice",
    "depressed",
    "disgruntled",
    "documentary-narration",
    "embarrassed",
    "empathetic",
    "envious",
    "excited",
    "fearful",
    "friendly",
    "gentle",
    "hopeful",
    "lyrical",
    "narration-professional",
    "narration-relaxed",
    "newscast",
    "newscast-casual",
    "newscast-formal",
    "poetry-reading",
    "sad",
    "serious",
    "shouting",
    "sports-commentary",
    "sports-commentary-excited",
    "terrified",
    "unfriendly",
    "whispering",
}

STYLE_ALIASES: dict[str, str] = {
    "neutral": "general",
    "default": "general",
    "narration": "narration-relaxed",
    "relaxed": "narration-relaxed",
    "professional": "narration-professional",
    "happy": "cheerful",
    "joyful": "cheerful",
    "fear": "fearful",
    "scared": "fearful",
    "stern": "serious",
}

_PERCENT_PATTERN = re.compile(r"^[+-]\d{1,3}%$")


class SchemaBaseModel(BaseModel):
    """Small compatibility layer for Pydantic v1 and v2 projects."""

    if not hasattr(BaseModel, "model_validate"):

        @classmethod
        def model_validate(cls, obj: object) -> "SchemaBaseModel":
            return cls.parse_obj(obj)

    if not hasattr(BaseModel, "model_dump"):

        def model_dump(self, mode: str = "python", **kwargs: object) -> dict[str, object]:
            return self.dict(**{key: value for key, value in kwargs.items() if key in {"include", "exclude", "by_alias", "exclude_unset", "exclude_defaults", "exclude_none"}})


def _normalize_percent_value(value: object) -> str:
    if value is None or value == "":
        return "+0%"
    if isinstance(value, (int, float)):
        return f"{value:+.0f}%"
    text = str(value).strip().replace("％", "%")
    if not text.endswith("%"):
        text = f"{text}%"
    if not text.startswith(("+", "-")):
        text = f"+{text}"
    return text


def _validate_percent_value(value: str) -> str:
    if not _PERCENT_PATTERN.match(value):
        raise ValueError("percentage offsets must look like '+0%' or '-5%'")
    return value


class NovelChunk(SchemaBaseModel):
    """A text chunk plus left-side context for semantic extraction."""

    index: int = Field(ge=0)
    prefix_context: str = ""
    target_text: str = Field(min_length=1)
    start_char: int = Field(ge=0)
    end_char: int = Field(ge=0)

    class Config:
        extra = "forbid"

    @property
    def full_context(self) -> str:
        """Return prefix context followed by target text."""

        return f"{self.prefix_context}{self.target_text}"


class CharacterMetadata(SchemaBaseModel):
    """Character attributes inferred by the LLM for stable voice assignment."""

    name: str = Field(min_length=1)
    gender: Gender = "unknown"
    age_group: AgeGroup = "unknown"
    role: CharacterRole = "unknown"
    traits: list[str] = Field(default_factory=list)

    class Config:
        extra = "ignore"

    @validator("name", pre=True, allow_reuse=True)
    def normalize_name(cls, value: object) -> str:
        text = str(value or "").strip()
        return text or "未知角色"

    @validator("gender", pre=True, allow_reuse=True)
    def normalize_gender(cls, value: object) -> Gender:
        text = str(value or "unknown").strip().lower()
        if text in {"男", "男性", "male", "m"}:
            return "male"
        if text in {"女", "女性", "female", "f"}:
            return "female"
        return "unknown"

    @validator("age_group", pre=True, allow_reuse=True)
    def normalize_age_group(cls, value: object) -> AgeGroup:
        text = str(value or "unknown").strip().lower()
        aliases = {
            "儿童": "child",
            "孩子": "child",
            "少年": "young",
            "少女": "young",
            "青年": "young",
            "年轻": "young",
            "成年": "adult",
            "中年": "adult",
            "老人": "elder",
            "老年": "elder",
        }
        return aliases.get(text, text if text in {"child", "young", "adult", "elder"} else "unknown")  # type: ignore[return-value]

    @validator("role", pre=True, allow_reuse=True)
    def normalize_role(cls, value: object) -> CharacterRole:
        text = str(value or "unknown").strip().lower()
        aliases = {
            "主角": "protagonist",
            "配角": "supporting",
            "反派": "villain",
            "旁白": "narrator",
            "叙述者": "narrator",
        }
        return aliases.get(text, text if text in {"protagonist", "supporting", "villain", "narrator"} else "unknown")  # type: ignore[return-value]


class DialogueSegment(SchemaBaseModel):
    """One synthesis-ready narration or dialogue segment."""

    index: int = Field(ge=0)
    speaker: str = Field(default="旁白", min_length=1)
    type: SegmentType
    text: str = Field(min_length=1)
    emotion: str = "general"
    style_degree: float = Field(default=1.0, ge=0.5, le=2.0)
    rate_offset: str = "+0%"
    pitch_offset: str = "+0%"

    class Config:
        extra = "ignore"

    @validator("speaker", pre=True, allow_reuse=True)
    def normalize_speaker(cls, value: object) -> str:
        speaker = str(value or "旁白").strip()
        return speaker or "旁白"

    @validator("text", pre=True, allow_reuse=True)
    def normalize_text(cls, value: object) -> str:
        text = str(value or "").strip()
        return re.sub(r"\s+", " ", text)

    @validator("emotion", pre=True, allow_reuse=True)
    def normalize_emotion(cls, value: object) -> str:
        style = str(value or "general").strip().lower()
        style = STYLE_ALIASES.get(style, style)
        if style == "general" or style in AZURE_EXPRESSIVE_STYLES:
            return style
        return "serious"

    @validator("rate_offset", "pitch_offset", pre=True, allow_reuse=True)
    def normalize_percent(cls, value: object) -> str:
        return _normalize_percent_value(value)

    @validator("rate_offset", "pitch_offset", allow_reuse=True)
    def validate_percent(cls, value: str) -> str:
        return _validate_percent_value(value)

    @root_validator(skip_on_failure=True, allow_reuse=True)
    def normalize_narration_speaker(cls, values: dict[str, object]) -> dict[str, object]:
        if values.get("type") == "narration":
            values["speaker"] = "旁白"
        return values


class ExtractionResult(SchemaBaseModel):
    """Validated LLM or heuristic extraction result for a single chunk."""

    chunk_index: int = Field(ge=0)
    segments: list[DialogueSegment] = Field(default_factory=list)
    characters: list[CharacterMetadata] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)

    class Config:
        extra = "ignore"


class VoiceConfig(SchemaBaseModel):
    """Persistent Azure voice assignment for one character."""

    character_name: str
    voice_name: str
    gender: Gender = "unknown"
    age_group: AgeGroup = "unknown"
    role: CharacterRole = "unknown"
    base_style: str = "chat"
    rate_offset: str = "+0%"
    pitch_offset: str = "+0%"
    assigned_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    class Config:
        extra = "ignore"

    @validator("base_style", pre=True, allow_reuse=True)
    def normalize_style(cls, value: object) -> str:
        style = STYLE_ALIASES.get(str(value or "chat").strip().lower(), str(value or "chat").strip().lower())
        if style == "general" or style in AZURE_EXPRESSIVE_STYLES:
            return style
        return "chat"

    @validator("rate_offset", "pitch_offset", pre=True, allow_reuse=True)
    def normalize_percent(cls, value: object) -> str:
        return _normalize_percent_value(value)

    @validator("rate_offset", "pitch_offset", allow_reuse=True)
    def validate_percent(cls, value: str) -> str:
        return _validate_percent_value(value)
