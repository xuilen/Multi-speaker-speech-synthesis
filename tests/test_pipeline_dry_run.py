"""Smoke tests for the local, no-cloud pipeline path."""

from __future__ import annotations

import json

from dataclasses import replace

from novel_tts_system.config import load_config
from novel_tts_system.main import SAMPLE_CHINESE_CHAPTER, pause_after_segments, read_novel_text, run_pipeline
from novel_tts_system.processor.character_planner import CharacterPlanner
from novel_tts_system.processor.chunker import SlidingWindowChunker
from novel_tts_system.processor.extractor import LLMExtractor
from novel_tts_system.schemas import DialogueSegment
from novel_tts_system.tts.progress import ProgressManifest


def test_dry_run_generates_manifest_and_registry(tmp_path):
    config = load_config(base_dir=tmp_path)
    result = run_pipeline(
        raw_text=SAMPLE_CHINESE_CHAPTER,
        output_path=tmp_path / "demo.mp3",
        config=config,
        force_heuristic=True,
        dry_run=True,
    )

    assert result.exists()
    assert config.registry_path.exists()
    manifest = json.loads(result.read_text(encoding="utf-8"))
    assert manifest[0]["segments"]
    assert (config.ssml_dir / "chunk_0000.ssml").exists()


def test_read_novel_text_auto_detects_gb18030(tmp_path):
    source = tmp_path / "chapter.txt"
    source.write_bytes("第一章\n“你好。”她说。".encode("gb18030"))

    assert "第一章" in read_novel_text(source, "auto")


def test_chunker_normalizes_quotes_and_preserves_chinese_punctuation():
    chunker = SlidingWindowChunker(target_chars=20, min_chars=10, max_chars=40, prefix_context_chars=8)

    chunks = chunker.chunk('她说:"你好!"\u200b\n\n第二段。')

    assert chunks[0].target_text.startswith("她说：“你好！”")
    assert "\u200b" not in chunks[0].target_text
    assert "。" in chunks[-1].target_text


def test_heuristic_uses_carry_over_context_for_pronouns(tmp_path):
    config = load_config(base_dir=tmp_path)
    config = replace(config, carry_context_chars=120)
    chunks = SlidingWindowChunker(target_chars=45, min_chars=20, max_chars=70, prefix_context_chars=20).chunk(
        "林晚站在窗边，指尖轻轻敲着木框。“你终于来了。”\n\n她回头看向沈砚。“别再骗我。”"
    )

    results = LLMExtractor(config=config, force_heuristic=True).extract_many(chunks)
    speakers = [segment.speaker for result in results for segment in result.segments if segment.type == "dialogue"]

    assert "林晚" in speakers


def test_extractor_recovers_json_inside_text(tmp_path):
    config = load_config(base_dir=tmp_path)
    extractor = LLMExtractor(config=config, force_heuristic=True)
    result = extractor._parse_json_content(
        '```json\n{"chunk_index": 0, "segments": [{"index": 0, "speaker": "旁白", "type": "narration", "text": "风停了。"}]}\n```',
        0,
    )

    assert result.segments[0].text == "风停了。"


def test_character_planner_infers_first_chapter_characters():
    planned = CharacterPlanner().plan_from_text(
        "沈砚低声说：“走。” 林晚轻声问：“去哪？” 灰袍老者冷笑道：“留下。”",
        max_chars=100,
    )
    names = {character.name for character in planned}

    assert {"沈砚", "林晚", "灰袍老者"} <= names


def test_progress_manifest_reuses_matching_completed_job(tmp_path):
    output = tmp_path / "chunk.wav"
    output.write_bytes(b"audio")
    manifest = ProgressManifest(tmp_path / "progress.json")

    manifest.mark_complete("chunk_0000", "hash", output, "silent")

    assert manifest.is_complete("chunk_0000", "hash", output)
    assert not manifest.is_complete("chunk_0000", "changed", output)


def test_silent_backend_generates_resumable_audio(tmp_path):
    config = load_config(base_dir=tmp_path)
    config = replace(config, tts_backend="silent", output_dir=tmp_path / "output", cache_dir=tmp_path / "cache")
    config = replace(
        config,
        registry_path=config.cache_dir / "characters.json",
        temp_audio_dir=config.output_dir / "chunks",
        ssml_dir=config.output_dir / "ssml",
        progress_manifest_path=config.output_dir / "generation_progress.json",
    )

    output = run_pipeline(
        raw_text=SAMPLE_CHINESE_CHAPTER,
        output_path=tmp_path / "demo.wav",
        config=config,
        force_heuristic=True,
        dry_run=False,
    )

    assert output.exists()
    assert config.progress_manifest_path.exists()


def test_dynamic_pause_responds_to_emotion_and_ellipsis():
    pause = pause_after_segments(
        [
            DialogueSegment(
                index=0,
                speaker="林晚",
                type="dialogue",
                text="你真的要走吗……",
                emotion="sad",
            )
        ],
        default_ms=250,
        dynamic=True,
    )

    assert pause > 450
