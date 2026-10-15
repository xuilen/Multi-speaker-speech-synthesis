"""Unit tests for Microsoft Voice Catalog, character voice swap, transfer, and preset schemes."""

import json
from pathlib import Path
import pytest

from novel_tts_system.processor.character_registry import (
    AI_MANGA_VOICE_CATALOG,
    AI_MANGA_VOICE_MAP,
    BUILTIN_VOICE_SCHEMES,
    GITHUB_AI_VOICE_CATALOG,
    GITHUB_AI_VOICE_MAP,
    MS_VOICE_CATALOG,
    MS_VOICE_TREE,
    CharacterRegistry,
)
from novel_tts_system.schemas import CharacterMetadata, VoiceConfig


def test_ms_voice_catalog_and_tree_integrity():
    assert len(MS_VOICE_CATALOG) >= 38
    assert "narrator" in MS_VOICE_TREE
    assert "youngMale" in MS_VOICE_TREE
    assert "youngFemale" in MS_VOICE_TREE
    assert "elderVillain" in MS_VOICE_TREE
    assert "child" in MS_VOICE_TREE
    assert "dialect" in MS_VOICE_TREE

    for voice in MS_VOICE_CATALOG:
        assert voice["id"].startswith("zh-")
        assert voice["name"]
        assert voice["archetype"]
        assert voice["category"] in MS_VOICE_TREE
        assert len(voice["styles"]) > 0


def test_character_registry_swap_voices(tmp_path: Path):
    reg_path = tmp_path / "characters.json"
    registry = CharacterRegistry(reg_path)

    # Assign distinct voices
    voice_a = registry.get_voice("刘备", CharacterMetadata(name="刘备", gender="male", age_group="adult", role="protagonist"))
    voice_b = registry.get_voice("张飞", CharacterMetadata(name="张飞", gender="male", age_group="adult", role="supporting"))

    # Explicitly configure distinct voice names
    registry.set_voice("刘备", voice_a.model_copy(update={"voice_name": "zh-CN-YunyeNeural", "base_style": "serious"}))
    registry.set_voice("张飞", voice_b.model_copy(update={"voice_name": "zh-CN-YunjianNeural", "base_style": "angry"}))

    new_a, new_b = registry.swap_voices("刘备", "张飞")

    assert new_a.character_name == "刘备"
    assert new_a.voice_name == "zh-CN-YunjianNeural"
    assert new_a.base_style == "angry"

    assert new_b.character_name == "张飞"
    assert new_b.voice_name == "zh-CN-YunyeNeural"
    assert new_b.base_style == "serious"

    # Reload from disk and verify persistence
    reloaded = CharacterRegistry(reg_path)
    assert reloaded.get_voice("刘备").voice_name == "zh-CN-YunjianNeural"
    assert reloaded.get_voice("张飞").voice_name == "zh-CN-YunyeNeural"


def test_character_registry_transfer_voice(tmp_path: Path):
    reg_path = tmp_path / "characters.json"
    registry = CharacterRegistry(reg_path)

    src = registry.get_voice("诸葛亮", CharacterMetadata(name="诸葛亮", gender="male", age_group="young", role="protagonist"))
    registry.set_voice(
        "诸葛亮",
        src.model_copy(
            update={
                "voice_name": "zh-CN-YunfengNeural",
                "base_style": "gentle",
                "rate_offset": "-2%",
                "pitch_offset": "+1%",
            }
        ),
    )

    # Transfer to a new character
    target_voice = registry.transfer_voice("诸葛亮", "徐庶")
    assert target_voice.character_name == "徐庶"
    assert target_voice.voice_name == "zh-CN-YunfengNeural"
    assert target_voice.base_style == "gentle"
    assert target_voice.rate_offset == "-2%"
    assert target_voice.pitch_offset == "+1%"

    # Copy to multiple characters
    many = registry.copy_voice_to_many("诸葛亮", ["庞统", "法正"])
    assert len(many) == 2
    assert registry.get_voice("庞统").voice_name == "zh-CN-YunfengNeural"
    assert registry.get_voice("法正").voice_name == "zh-CN-YunfengNeural"


def test_character_registry_export_and_import_scheme(tmp_path: Path):
    novel_a_path = tmp_path / "novel_a_registry.json"
    novel_b_path = tmp_path / "novel_b_registry.json"
    export_file = tmp_path / "exported_scheme.json"

    reg_a = CharacterRegistry(novel_a_path)
    reg_a.set_voice(
        "萧炎",
        VoiceConfig(
            character_name="萧炎",
            voice_name="zh-CN-YunjieNeural",
            gender="male",
            age_group="young",
            role="protagonist",
            base_style="chat",
            rate_offset="+3%",
            pitch_offset="+1%",
        ),
    )
    reg_a.set_voice(
        "药老",
        VoiceConfig(
            character_name="药老",
            voice_name="zh-CN-YunzeNeural",
            gender="male",
            age_group="elder",
            role="supporting",
            base_style="serious",
            rate_offset="-5%",
            pitch_offset="-6%",
        ),
    )

    scheme_data = reg_a.export_scheme(export_file, name="斗破苍穹配音树")
    assert export_file.exists()
    assert scheme_data["scheme_name"] == "斗破苍穹配音树"
    assert "萧炎" in scheme_data["characters"]

    # Import into novel B with character remapping
    reg_b = CharacterRegistry(novel_b_path)
    count = reg_b.import_scheme(
        export_file,
        remapping={"萧炎": "沈砚", "药老": "师尊"},
        overwrite=True,
    )
    assert count >= 2
    shen = reg_b.get_voice("沈砚")
    assert shen.voice_name == "zh-CN-YunjieNeural"
    assert shen.rate_offset == "+3%"

    master = reg_b.get_voice("师尊")
    assert master.voice_name == "zh-CN-YunzeNeural"
    assert master.rate_offset == "-5%"


def test_builtin_schemes_application(tmp_path: Path):
    reg_path = tmp_path / "builtin_test.json"
    registry = CharacterRegistry(reg_path)

    assert "xianxia" in BUILTIN_VOICE_SCHEMES
    assert "historical" in BUILTIN_VOICE_SCHEMES

    count = registry.apply_builtin_scheme("xianxia", character_mapping={"男主角": "韩立", "女主角": "南宫婉"})
    assert count >= 5
    assert registry.get_voice("韩立").voice_name == "zh-CN-YunjieNeural"
    assert registry.get_voice("南宫婉").voice_name == "zh-CN-XiaohanNeural"

    tree = registry.get_character_tree()
    assert len(tree["narrator"]) >= 1
    assert len(tree["protagonist"]) >= 2


def test_github_ai_voice_catalog_integrity():
    assert len(GITHUB_AI_VOICE_CATALOG) >= 18
    repos = {v["repo"] for v in GITHUB_AI_VOICE_CATALOG}
    assert "Finrandojin/alexandria-audiobook" in repos
    assert "FunAudioLLM/CosyVoice" in repos
    assert "2noise/ChatTTS" in repos
    assert "SWivid/F5-TTS" in repos
    assert "RVC-Boss/GPT-SoVITS" in repos
    assert "fishaudio/fish-speech" in repos

    for voice in GITHUB_AI_VOICE_CATALOG:
        assert voice["id"].startswith("github-")
        assert voice["name"]
        assert voice["repo"]
        assert voice["modelTech"]
        assert voice["archetype"]
        assert len(voice["styles"]) > 0
        assert voice["id"] in GITHUB_AI_VOICE_MAP


def test_apply_new_builtin_schemes(tmp_path: Path):
    reg_path = tmp_path / "new_schemes_test.json"
    registry = CharacterRegistry(reg_path)

    new_scheme_keys = [
        "azure_official_full",
        "alexandria_qwen3",
        "cosyvoice_universe",
        "chattts_dialogue",
        "f5_scifi",
        "gpt_sovits_legends",
    ]

    for key in new_scheme_keys:
        assert key in BUILTIN_VOICE_SCHEMES
        scheme = BUILTIN_VOICE_SCHEMES[key]
        assert "characters" in scheme
        assert len(scheme["characters"]) >= 2
        # Apply scheme
        count = registry.apply_builtin_scheme(key)
        assert count >= 2


def test_ai_manga_voice_catalog_integrity():
    """Verify AI Manga all-age voice catalog completeness, diversity, and metadata."""
    assert len(AI_MANGA_VOICE_CATALOG) >= 20
    assert len(AI_MANGA_VOICE_CATALOG) == len(AI_MANGA_VOICE_MAP)

    genders = {v["gender"] for v in AI_MANGA_VOICE_CATALOG}
    assert "male" in genders
    assert "female" in genders

    age_groups = {v["ageGroup"] for v in AI_MANGA_VOICE_CATALOG}
    assert "child" in age_groups
    assert "young" in age_groups
    assert "adult" in age_groups
    assert "elder" in age_groups

    # Ensure genuine male voice options are available across multiple age bands
    male_voices = [v for v in AI_MANGA_VOICE_CATALOG if v["gender"] == "male"]
    assert len(male_voices) >= 8
    male_ids = {v["id"] for v in male_voices}
    assert "zh-CN-YunxiNeural" in male_ids  # Narrator / Epic
    assert "zh-CN-YunjieNeural" in male_ids  # Youth Protagonist
    assert "zh-CN-YunyeNeural" in male_ids   # Baritone CEO / Emperor
    assert "zh-CN-YunzeNeural" in male_ids   # Deep Elder Demon

    # Verify classmethod accessors
    listed = CharacterRegistry.list_ai_manga_voices()
    assert len(listed) == len(AI_MANGA_VOICE_CATALOG)
    single = CharacterRegistry.get_ai_manga_voice("zh-CN-YunxiNeural")
    assert single is not None
    assert "史诗旁白" in single["name"]


def test_ai_manga_builtin_schemes(tmp_path: Path):
    """Verify all 4 AI Manga built-in schemes can be applied to a novel."""
    schemes = [
        "aimanga_universe",
        "aimanga_cultivation",
        "aimanga_urban_ceo",
        "aimanga_rebirth_romance",
    ]

    for key in schemes:
        reg_path = tmp_path / f"{key}_registry.json"
        registry = CharacterRegistry(reg_path)
        assert key in BUILTIN_VOICE_SCHEMES

        scheme = BUILTIN_VOICE_SCHEMES[key]
        assert "characters" in scheme
        assert len(scheme["characters"]) >= 5

        # Apply without remapping
        count = registry.apply_builtin_scheme(key)
        assert count >= 5

        # Check narrator is always configured
        assert "旁白" in registry.get_character_tree()["narrator"] or "旁白" in registry._voices

