"""Persistent character-to-voice mapping with deterministic auto-assignment."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from novel_tts_system.schemas import CharacterMetadata, CharacterRole, Gender, VoiceConfig


VOICE_POOL: dict[str, str] = {
    "narration_male": "zh-CN-YunxiNeural",
    "narration_female": "zh-CN-XiaoxiaoNeural",
    "young_male": "zh-CN-YunjieNeural",
    "young_female": "zh-CN-XiaoyiNeural",
    "elder_villain": "zh-CN-YunzeNeural",
}


class CharacterRegistry:
    """Manage stable Azure voice assignments across audiobook runs."""

    def __init__(self, registry_path: Path, narrator_gender: str = "male") -> None:
        self.registry_path = registry_path
        self.narrator_gender = narrator_gender if narrator_gender in {"male", "female"} else "male"
        self._voices: dict[str, VoiceConfig] = {}
        self.registry_path.parent.mkdir(parents=True, exist_ok=True)
        self.load()
        self._ensure_narrator()

    def load(self) -> None:
        """Load the persistent character registry if it exists."""

        if not self.registry_path.exists():
            self._voices = {}
            return

        data = json.loads(self.registry_path.read_text(encoding="utf-8"))
        entries = data.get("characters", data if isinstance(data, dict) else {})
        self._voices = {
            name: VoiceConfig.model_validate(config)
            for name, config in entries.items()
            if isinstance(config, dict)
        }

    def save(self) -> None:
        """Persist the registry as human-readable JSON."""

        payload = {
            "version": 1,
            "characters": {
                name: voice.model_dump(mode="json")
                for name, voice in sorted(self._voices.items(), key=lambda item: item[0])
            },
        }
        self.registry_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    def get_voice(
        self,
        character_name: str,
        metadata: CharacterMetadata | None = None,
        segment_type: str | None = None,
    ) -> VoiceConfig:
        """Return an existing or newly assigned voice for a character."""

        normalized_name = self._normalize_name(character_name, segment_type)
        if normalized_name in self._voices:
            return self._voices[normalized_name]

        voice = self._assign_voice(normalized_name, metadata)
        self._voices[normalized_name] = voice
        self.save()
        return voice

    def sync_from_metadata(self, characters: list[CharacterMetadata]) -> None:
        """Ensure every LLM-discovered character has a stable voice entry."""

        changed = False
        for character in characters:
            if character.name == "旁白":
                continue
            if character.name not in self._voices:
                self._voices[character.name] = self._assign_voice(character.name, character)
                changed = True
        if changed:
            self.save()

    def all_voices(self) -> dict[str, VoiceConfig]:
        """Return a copy of the current registry."""

        return dict(self._voices)

    def _ensure_narrator(self) -> None:
        if "旁白" in self._voices:
            return
        voice_name = VOICE_POOL["narration_female" if self.narrator_gender == "female" else "narration_male"]
        self._voices["旁白"] = VoiceConfig(
            character_name="旁白",
            voice_name=voice_name,
            gender=self.narrator_gender,  # type: ignore[arg-type]
            age_group="adult",
            role="narrator",
            base_style="narration-relaxed",
            rate_offset="+0%",
            pitch_offset="+0%",
        )
        self.save()

    def _assign_voice(self, name: str, metadata: CharacterMetadata | None) -> VoiceConfig:
        gender: Gender = metadata.gender if metadata else "unknown"
        age_group = metadata.age_group if metadata else "unknown"
        role: CharacterRole = metadata.role if metadata else "unknown"

        if role == "villain" or age_group == "elder":
            voice_name = VOICE_POOL["elder_villain"]
            base_rate = -5
            base_pitch = -8
            base_style = "serious"
        elif gender == "female":
            voice_name = VOICE_POOL["young_female"]
            base_rate = 2
            base_pitch = 5 if age_group in {"child", "young"} else 2
            base_style = "chat"
        elif gender == "male":
            voice_name = VOICE_POOL["young_male"]
            base_rate = 0
            base_pitch = -2
            base_style = "chat"
        else:
            voice_name = self._unknown_voice(name)
            base_rate = 0
            base_pitch = 0
            base_style = "chat"

        rate_variation, pitch_variation = self._stable_variation(name)
        return VoiceConfig(
            character_name=name,
            voice_name=voice_name,
            gender=gender,
            age_group=age_group,
            role=role,
            base_style=base_style,
            rate_offset=f"{base_rate + rate_variation:+d}%",
            pitch_offset=f"{base_pitch + pitch_variation:+d}%",
        )

    def _unknown_voice(self, name: str) -> str:
        bucket = self._hash_int(name) % 2
        if bucket == 0:
            return VOICE_POOL["young_male"]
        return VOICE_POOL["young_female"]

    @staticmethod
    def _normalize_name(character_name: str, segment_type: str | None) -> str:
        if segment_type == "narration":
            return "旁白"
        name = (character_name or "").strip()
        return name or "未知角色"

    @staticmethod
    def _hash_int(value: str) -> int:
        digest = hashlib.sha256(value.encode("utf-8")).hexdigest()
        return int(digest[:8], 16)

    def _stable_variation(self, name: str) -> tuple[int, int]:
        seed = self._hash_int(name)
        rate = (seed % 7) - 3
        pitch = ((seed // 7) % 9) - 4
        return rate, pitch
