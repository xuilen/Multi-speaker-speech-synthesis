"""Unit tests for AudioLearner acoustic analysis, timbre extraction and custom tree generation."""

import io
from pathlib import Path
import numpy as np
from pydub import AudioSegment
import pytest

from novel_tts_system.processor.audio_learner import AudioLearner, BASE_NEURAL_VOICES
from novel_tts_system.serve_tts import TTSRequestHandler, VOICE_EDGE_MAPPING, EDGE_VALID_ZH_VOICES


def _generate_synthetic_wav(freq_hz: float, duration: float = 1.5, sample_rate: int = 16000) -> bytes:
    """Generate a clean sinusoidal audio tone with harmonics for testing."""
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    # Fundamental + 2nd harmonic
    signal = 0.5 * np.sin(2 * np.pi * freq_hz * t) + 0.25 * np.sin(2 * np.pi * freq_hz * 2 * t)
    int_samples = (signal * 32767).astype(np.int16)
    seg = AudioSegment(int_samples.tobytes(), frame_rate=sample_rate, sample_width=2, channels=1)
    buf = io.BytesIO()
    seg.export(buf, format="wav")
    return buf.getvalue()


def test_audio_learner_male_baritone():
    """Verify deep baritone male voice extraction around 120 Hz."""
    audio_bytes = _generate_synthetic_wav(120.0, duration=1.5)
    analysis = AudioLearner.analyze_audio(audio_bytes, filename="baritone_ceo.wav", character_hint="霸总男主")

    assert analysis["estimated_gender"] == "male"
    assert analysis["estimated_age_group"] in {"adult", "young"}
    assert 105.0 <= analysis["f0_pitch_hz"] <= 135.0
    assert "男" in analysis["voice_band"]
    assert "zh-CN-YunxiNeural" in analysis["recommended_voice"] or "WanLung" in analysis["recommended_voice"]
    assert len(analysis["timbre_tags"]) >= 2
    assert analysis["similarity_score"] >= 88.0


def test_audio_learner_female_fairy():
    """Verify clear higher-pitch female voice extraction around 225 Hz."""
    audio_bytes = _generate_synthetic_wav(225.0, duration=1.5)
    analysis = AudioLearner.analyze_audio(audio_bytes, filename="fairy_master.wav", character_hint="清冷师尊")

    assert analysis["estimated_gender"] == "female"
    assert 210.0 <= analysis["f0_pitch_hz"] <= 245.0
    assert "女" in analysis["voice_band"]
    assert analysis["recommended_voice"] in {"zh-CN-XiaoxiaoNeural", "zh-TW-HsiaoChenNeural", "zh-CN-XiaoyiNeural", "zh-HK-HiuGaaiNeural"}
    assert analysis["similarity_score"] >= 88.0


def test_audio_learner_child_sweet():
    """Verify high-pitched child voice extraction around 285 Hz."""
    audio_bytes = _generate_synthetic_wav(285.0, duration=1.5)
    analysis = AudioLearner.analyze_audio(audio_bytes, filename="baby_daughter.wav", character_hint="萌宝千金")

    assert analysis["estimated_gender"] in {"child", "female"}
    assert 260.0 <= analysis["f0_pitch_hz"] <= 310.0
    assert analysis["recommended_voice"] in {"zh-TW-HsiaoYuNeural", "zh-CN-YunxiaNeural", "zh-CN-XiaoyiNeural"}


def test_custom_voice_tree_creation(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """Verify complete personalized voice tree generation and persistence."""
    fake_tree_file = tmp_path / "custom_trees.json"
    monkeypatch.setattr("novel_tts_system.processor.audio_learner.USER_TREES_FILE", fake_tree_file)

    audio_bytes = _generate_synthetic_wav(135.0, duration=1.2)
    analysis = AudioLearner.analyze_audio(audio_bytes, filename="custom_lead.wav")

    tree = AudioLearner.create_custom_voice_tree(
        tree_id="test_custom_001",
        tree_name="我的玄幻专属配音树",
        learned_profile=analysis,
        assigned_role_name="主角林动",
        description="由用户音频提取生成的专属玄幻树",
    )

    assert tree["id"] == "custom_learned_test_custom_001"
    assert tree["name"] == "我的玄幻专属配音树"
    assert "主角林动" in tree["characters"]
    assert "旁白" in tree["characters"]
    assert tree["characters"]["主角林动"]["voice_name"] == analysis["recommended_voice"]

    # Verify persistence
    loaded = AudioLearner.list_custom_trees()
    assert "custom_learned_test_custom_001" in loaded
    single = AudioLearner.get_custom_tree("custom_learned_test_custom_001")
    assert single is not None
    assert single["name"] == "我的玄幻专属配音树"


def test_serve_tts_voice_resolution_safety():
    """Ensure all non-Edge voices map to valid, working Edge neural models."""
    handler = TTSRequestHandler

    # 1. Edge-supported voices must pass directly
    for edge_v in EDGE_VALID_ZH_VOICES:
        v, r, p = handler._resolve_voice(handler, edge_v, "+0%", "+0Hz")
        assert v == edge_v

    # 2. Non-Edge voices must resolve to an Edge-supported voice
    test_non_edge = [
        "zh-CN-YunyeNeural",
        "zh-CN-YunzeNeural",
        "zh-CN-YunhaiNeural",
        "zh-CN-YunfengNeural",
        "zh-CN-XiaomengNeural",
        "zh-CN-XiaoyouNeural",
        "zh-CN-XiaomoNeural",
        "github-alexandria-demonlord",
        "github-alexandria-foxjunior",
        "github-cosyvoice-foxempress",
        "github-cosyvoice-zenmonk",
    ]

    for req_v in test_non_edge:
        v, r, p = handler._resolve_voice(handler, req_v, "+0%", "+0Hz")
        assert v in EDGE_VALID_ZH_VOICES
        assert p  # Has pitch adjustment
        assert r  # Has rate adjustment
