"""CLI entry point for the Novel-Audiobook-TTS pipeline."""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from dataclasses import replace
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.append(str(Path(__file__).resolve().parent.parent))

from novel_tts_system.audio.merger import AudioMerger, pydub_available
from novel_tts_system.config import AppConfig, load_config
from novel_tts_system.processor.character_registry import (
    BUILTIN_VOICE_SCHEMES,
    MS_VOICE_CATALOG,
    MS_VOICE_TREE,
    CharacterRegistry,
)
from novel_tts_system.processor.character_planner import CharacterPlanner
from novel_tts_system.processor.chunker import SlidingWindowChunker
from novel_tts_system.processor.epub_reader import read_epub_text
from novel_tts_system.processor.extractor import LLMExtractor
from novel_tts_system.schemas import DialogueSegment
from novel_tts_system.tts.azure_synth import SynthesisError
from novel_tts_system.tts.progress import ProgressManifest
from novel_tts_system.tts.providers import SynthesisJob, create_tts_provider
from novel_tts_system.tts.ssml_builder import SSMLBuilder


SAMPLE_CHINESE_CHAPTER = """
夜色压在临安城的屋脊上，雨丝像断了线的银针，密密落进青石巷。

沈砚把油纸伞压低，望着巷口那盏将熄未熄的灯。三年前，他就是在这里失去了师父留下的玉佩。

“你果然还是来了。”一个清冷的声音从檐下传来。

沈砚停住脚步，指尖按住袖中的短刀。“林姑娘，我只想知道真相。”

林晚没有立刻回答。她披着一件素白斗篷，雨水顺着帽檐滑落，眼神却比雨夜还静。

“真相不会救你。”她轻声说，“它只会让你再也回不了头。”

巷子深处忽然传来一声冷笑。灰袍老者拄着乌木杖走出阴影，声音沙哑而缓慢：“年轻人，总爱把执念当成勇气。”

沈砚抬眼，雨水从他的眉骨滚落。“那就让我看看，今晚是谁的勇气先碎。”
""".strip()


def read_novel_text(
    path: Path,
    encoding: str = "auto",
    chapter_limit: int = 0,
    chapter_min_chars: int = 500,
) -> str:
    """Read a TXT or EPUB novel source with practical Chinese fallbacks."""

    if path.suffix.lower() == ".epub":
        return read_epub_text(path, chapter_limit=chapter_limit, min_body_chars=chapter_min_chars)

    if encoding and encoding.lower() != "auto":
        return path.read_text(encoding=encoding)

    encodings = ("utf-8-sig", "utf-8", "gb18030", "gbk", "big5")
    errors: list[str] = []
    for candidate in encodings:
        try:
            return path.read_text(encoding=candidate)
        except UnicodeDecodeError as exc:
            errors.append(f"{candidate}: {exc}")
    raise UnicodeDecodeError(
        "auto",
        b"",
        0,
        1,
            f"Unable to decode {path}. Tried: {'； '.join(errors)}",
    )


_CHAPTER_HEADING = re.compile(
    r"(?m)^\s*(第\s*[0-9〇零一二两三四五六七八九十百千万]+\s*[章节回卷部][^\n\r]*)\s*$"
)


def limit_text_to_chapters(text: str, chapter_limit: int, min_body_chars: int = 500) -> str:
    """Return only the first ``chapter_limit`` chapter blocks when headings exist."""

    if chapter_limit <= 0:
        return text

    matches = list(_CHAPTER_HEADING.finditer(text))
    if not matches:
        return text

    chapter_indices = _body_chapter_indices(text, matches, min_body_chars)
    if len(chapter_indices) < chapter_limit:
        chapter_indices = list(range(len(matches)))

    start = matches[chapter_indices[0]].start()
    end = matches[chapter_indices[chapter_limit]].start() if len(chapter_indices) > chapter_limit else len(text)
    return text[start:end].strip()


def _body_chapter_indices(text: str, matches: list[re.Match[str]], min_body_chars: int) -> list[int]:
    """Filter headings that look like real chapter starts rather than TOC rows."""

    if min_body_chars <= 0:
        return list(range(len(matches)))

    indices: list[int] = []
    for index, match in enumerate(matches):
        next_start = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        body_len = next_start - match.end()
        if body_len >= min_body_chars:
            indices.append(index)
    return indices


def resolve_input_path(cli_input: Path | None, config: AppConfig) -> Path | None:
    """Resolve the novel source path from CLI, .env, or bundled demo fallback."""

    if cli_input:
        return cli_input
    if config.input_path:
        if config.input_path.exists():
            return config.input_path
        raise FileNotFoundError(
            f"Configured novel file does not exist: {config.input_path}. "
            "Update NOVEL_TTS_INPUT_PATH or pass --input."
        )
    return None


def run_pipeline(
    raw_text: str,
    output_path: Path,
    config: AppConfig,
    force_heuristic: bool = False,
    dry_run: bool = False,
    export_voice_scheme: Path | None = None,
) -> Path:
    """Run chunking, extraction, SSML creation, synthesis, and audio merging."""

    config.ensure_directories()
    cleanup_generated_ssml(config.ssml_dir)

    chunker = SlidingWindowChunker(
        target_chars=config.target_chunk_chars,
        min_chars=config.min_chunk_chars,
        max_chars=config.max_chunk_chars,
        prefix_context_chars=config.prefix_context_chars,
    )
    chunks = chunker.chunk(raw_text)
    if not chunks:
        raise ValueError("Input text is empty after cleaning.")

    extractor = LLMExtractor(config=config, force_heuristic=force_heuristic)
    registry = CharacterRegistry(config.registry_path, narrator_gender=config.narrator_gender)
    if config.voice_scheme:
        scheme_arg = config.voice_scheme.strip()
        scheme_path = Path(scheme_arg)
        if scheme_path.exists():
            registry.import_scheme(scheme_path)
        elif scheme_arg.lower() in BUILTIN_VOICE_SCHEMES:
            registry.apply_builtin_scheme(scheme_arg.lower())

    if config.character_prepass_enabled:
        planned_characters = CharacterPlanner().plan_from_text(raw_text, config.character_prepass_chars)
        registry.sync_from_metadata(planned_characters)

    ssml_builder = SSMLBuilder(
        registry=registry,
        language=config.default_language,
        speaker_break_ms=config.speaker_break_ms,
        enable_styles=config.azure_enable_styles,
    )

    provider = create_tts_provider(config, registry)
    extractions = extractor.extract_many(chunks)
    synthesis_jobs: list[SynthesisJob] = []
    manifest: list[dict[str, object]] = []
    for chunk, extraction in zip(chunks, extractions):
        registry.sync_from_metadata(extraction.characters)
        ssml = ssml_builder.build_chunk_ssml(extraction.segments)
        ssml_path = config.ssml_dir / f"chunk_{chunk.index:04d}.ssml"
        ssml_path.write_text(ssml, encoding="utf-8")
        pause_ms = pause_after_segments(
            extraction.segments,
            default_ms=config.inter_chunk_silence_ms,
            dynamic=config.dynamic_pause_enabled,
        )
        segment_groups = split_segments_for_tts(
            extraction.segments,
            ssml_builder=ssml_builder,
            max_ssml_chars=config.azure_max_ssml_chars if config.tts_backend == "azure" else 0,
        )
        for part_index, segment_group in enumerate(segment_groups):
            part_ssml = ssml_builder.build_chunk_ssml(segment_group)
            part_ssml_path = config.ssml_dir / f"chunk_{chunk.index:04d}_part_{part_index:02d}.ssml"
            part_ssml_path.write_text(part_ssml, encoding="utf-8")
            job_index = len(synthesis_jobs)
            synthesis_jobs.append(
                SynthesisJob(
                    index=job_index,
                    segments=segment_group,
                    ssml=part_ssml,
                    ssml_path=part_ssml_path,
                    output_path=config.temp_audio_dir / f"chunk_{job_index:04d}.{provider.file_extension}",
                    pause_ms=pause_ms if part_index == len(segment_groups) - 1 else config.speaker_break_ms,
                )
            )
        manifest.append(
            {
                "chunk_index": chunk.index,
                "start_char": chunk.start_char,
                "end_char": chunk.end_char,
                "segments": [segment.model_dump(mode="json") for segment in extraction.segments],
                "characters": [character.model_dump(mode="json") for character in extraction.characters],
                "warnings": extraction.warnings,
                "ssml_path": str(ssml_path),
                "tts_parts": [str(config.ssml_dir / f"chunk_{chunk.index:04d}_part_{part_index:02d}.ssml") for part_index in range(len(segment_groups))],
                "pause_after_ms": pause_ms,
            }
        )

    manifest_path = config.output_dir / "extraction_manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    registry.save()
    if export_voice_scheme:
        registry.export_scheme(export_voice_scheme)

    if dry_run:
        return manifest_path

    if config.tts_backend == "azure" and not config.has_azure_credentials:
        raise SynthesisError(
            "Azure Speech credentials are required for audio export. "
            "Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION, choose --tts-backend edge/silent, or run with --dry-run."
        )

    progress = ProgressManifest(config.progress_manifest_path)
    chunk_audio_files = asyncio.run(
        provider.synthesize_many(
            synthesis_jobs,
            progress=progress,
            resume=config.resume_enabled,
        )
    )
    merger = AudioMerger(
        target_dbfs=config.target_dbfs,
        inter_chunk_silence_ms=config.inter_chunk_silence_ms,
        crossfade_ms=config.audio_crossfade_ms,
        dynamic_pause_enabled=config.dynamic_pause_enabled,
        bgm_path=config.bgm_path,
        bgm_gain_db=config.bgm_gain_db,
    )
    pause_ms = [job.pause_ms for job in synthesis_jobs[:-1]]
    final_output_path = output_path
    if output_path.suffix.lower() != ".wav" and not pydub_available():
        final_output_path = output_path.with_suffix(".wav")
    return merger.merge_files(chunk_audio_files, final_output_path, pause_ms=pause_ms)


def pause_after_segments(segments: list[object], default_ms: int = 250, dynamic: bool = True) -> int:
    """Infer a natural pause length after a chunk or segment group."""

    if not dynamic or not segments:
        return default_ms

    last = segments[-1]
    text = str(getattr(last, "text", ""))
    segment_type = str(getattr(last, "type", ""))
    emotion = str(getattr(last, "emotion", ""))

    pause = default_ms
    if segment_type == "narration":
        pause += 80
    if text.endswith(("。", ".", "”")):
        pause += 60
    if text.endswith(("！", "!", "？", "?")):
        pause += 140
    if "……" in text or text.endswith(("…", "...")):
        pause += 220
    if emotion in {"sad", "fearful", "serious"}:
        pause += 80
    return max(120, min(900, pause))


def cleanup_generated_ssml(ssml_dir: Path) -> None:
    """Remove stale generated SSML files before writing a new manifest."""

    for pattern in ("chunk_*.ssml", "chunk_*_part_*.ssml"):
        for path in ssml_dir.glob(pattern):
            path.unlink(missing_ok=True)


def split_segments_for_tts(
    segments: list[DialogueSegment],
    ssml_builder: SSMLBuilder,
    max_ssml_chars: int = 0,
) -> list[list[DialogueSegment]]:
    """Split segment groups so Azure receives bounded SSML documents."""

    if max_ssml_chars <= 0 or len(ssml_builder.build_chunk_ssml(segments)) <= max_ssml_chars:
        return [segments]

    groups: list[list[DialogueSegment]] = []
    current: list[DialogueSegment] = []
    for segment in segments:
        for piece in _split_oversized_segment(segment, ssml_builder, max_ssml_chars):
            candidate = [*current, piece]
            if current and len(ssml_builder.build_chunk_ssml(candidate)) > max_ssml_chars:
                groups.append(current)
                current = [piece]
            else:
                current = candidate

    if current:
        groups.append(current)

    for group_index, group in enumerate(groups):
        for segment_index, segment in enumerate(group):
            group[segment_index] = clone_segment(segment, index=segment_index)
    return groups


def _split_oversized_segment(
    segment: DialogueSegment,
    ssml_builder: SSMLBuilder,
    max_ssml_chars: int,
) -> list[DialogueSegment]:
    if len(ssml_builder.build_chunk_ssml([segment])) <= max_ssml_chars:
        return [segment]

    overhead = max(300, len(ssml_builder.build_chunk_ssml([segment])) - len(segment.text))
    target_chars = max(120, min(700, max_ssml_chars - overhead - 100))
    pieces = _split_text_naturally(segment.text, target_chars)
    return [
        clone_segment(segment, index=index, text=piece)
        for index, piece in enumerate(pieces)
        if piece.strip()
    ]


def clone_segment(segment: DialogueSegment, **updates: object) -> DialogueSegment:
    """Clone a segment without triggering Pydantic v2 copy deprecation warnings."""

    if hasattr(segment, "model_copy"):
        return segment.model_copy(update=updates)
    return segment.copy(update=updates)


def _split_text_naturally(text: str, target_chars: int) -> list[str]:
    sentences = [part.strip() for part in re.split(r"(?<=[。！？；.!?;])", text) if part.strip()]
    pieces: list[str] = []
    current = ""
    for sentence in sentences:
        if current and len(current) + len(sentence) > target_chars:
            pieces.append(current)
            current = sentence
        else:
            current = f"{current}{sentence}"
    if current:
        pieces.append(current)

    hard_split: list[str] = []
    for piece in pieces or [text]:
        if len(piece) <= target_chars:
            hard_split.append(piece)
            continue
        hard_split.extend(piece[index : index + target_chars] for index in range(0, len(piece), target_chars))
    return hard_split


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse command-line arguments."""

    parser = argparse.ArgumentParser(description="Convert a Chinese novel chapter into a multi-voice audiobook.")
    parser.add_argument("--input", type=Path, help="TXT or EPUB novel file. If omitted, NOVEL_TTS_INPUT_PATH is used.")
    parser.add_argument("--output", type=Path, default=Path("output/demo_audiobook.mp3"))
    parser.add_argument("--env-file", type=Path, help="Optional path to a .env file. Defaults to project .env.")
    parser.add_argument("--registry", type=Path, help="Path to persistent characters.json registry.")
    parser.add_argument("--encoding", default=None, help="Input text encoding, or 'auto' for UTF-8/GB18030 fallback.")
    parser.add_argument("--chapter-limit", type=int, help="Only process the first N chapter headings. Use 0 for full text.")
    parser.add_argument("--chapter-min-chars", type=int, help="Minimum body length used to skip table-of-contents headings.")
    parser.add_argument("--dry-run", action="store_true", help="Generate extraction JSON and SSML without Azure audio synthesis.")
    parser.add_argument("--force-heuristic", action="store_true", help="Skip LLM extraction and use the local heuristic parser.")
    parser.add_argument("--tts-backend", choices=["azure", "edge", "silent"], help="TTS backend adapter.")
    parser.add_argument("--resume", action=argparse.BooleanOptionalAction, default=None, help="Resume completed synthesis chunks.")
    parser.add_argument("--narrator-gender", choices=["male", "female"], help="Default narration voice gender.")
    parser.add_argument("--llm-model", help="Override OPENAI_MODEL/LLM_MODEL.")
    parser.add_argument("--llm-base-url", help="OpenAI-compatible base URL, e.g. DeepSeek.")
    parser.add_argument("--target-chars", type=int, help="Target characters per chunk.")
    parser.add_argument("--min-chars", type=int, help="Minimum characters per chunk.")
    parser.add_argument("--max-chars", type=int, help="Maximum characters per chunk.")
    parser.add_argument("--character-prepass-chars", type=int, help="Characters from the beginning used for voice preplanning.")
    parser.add_argument("--skip-character-prepass", action="store_true", help="Disable whole-book character voice preplanning.")
    parser.add_argument("--bgm", type=Path, help="Optional background music file mixed under the final audiobook.")
    parser.add_argument("--crossfade-ms", type=int, help="Crossfade duration between chunks.")
    parser.add_argument("--dynamic-pauses", action=argparse.BooleanOptionalAction, default=None, help="Use punctuation/emotion-aware pauses.")
    parser.add_argument("--tts-rate-limit-per-minute", type=int, help="Throttle TTS backend requests.")
    parser.add_argument("--voice-scheme", help="Predefined novel voice scheme (xianxia, historical, romance, mystery) or JSON file path.")
    parser.add_argument("--export-voice-scheme", type=Path, help="Export novel character voice tree as a JSON scheme file.")
    parser.add_argument("--list-voice-schemes", action="store_true", help="Print available novel voice schemes and exit.")
    parser.add_argument("--list-voices", action="store_true", help="Print the Microsoft voice catalog and exit.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    """Run the command-line demo or file conversion."""

    args = parse_args(argv)

    if args.list_voice_schemes:
        print("\n=== 内置小说角色配音树方案 ===")
        for key, scheme in BUILTIN_VOICE_SCHEMES.items():
            print(f"- {key}: {scheme['name']} ({len(scheme['characters'])} 个角色配置)")
            print(f"  说明: {scheme['description']}")
        print()
        return 0

    if args.list_voices:
        print("\n=== 微软语音角色分类树库 ===")
        for cat_key, cat_data in MS_VOICE_TREE.items():
            print(f"\n【{cat_data['label']}】({len(cat_data['voices'])} 个音色) - {cat_data['description']}")
            for voice in cat_data["voices"]:
                gender_str = "男" if voice["gender"] == "male" else "女"
                print(f"  • {voice['name']} ({voice['fullName']}) [{gender_str}] {voice['archetype']}")
        print()
        return 0

    config = load_config(env_file=args.env_file)
    overrides: dict[str, object] = {}
    if args.registry:
        overrides["registry_path"] = args.registry
    if args.narrator_gender:
        overrides["narrator_gender"] = args.narrator_gender
    if args.llm_model:
        overrides["llm_model"] = args.llm_model
    if args.llm_base_url:
        overrides["llm_base_url"] = args.llm_base_url
    if args.tts_backend:
        overrides["tts_backend"] = args.tts_backend
    if args.resume is not None:
        overrides["resume_enabled"] = args.resume
    if args.target_chars:
        overrides["target_chunk_chars"] = args.target_chars
    if args.min_chars:
        overrides["min_chunk_chars"] = args.min_chars
    if args.max_chars:
        overrides["max_chunk_chars"] = args.max_chars
    if args.encoding:
        overrides["input_encoding"] = args.encoding
    if args.chapter_limit is not None:
        overrides["chapter_limit"] = args.chapter_limit
    if args.chapter_min_chars is not None:
        overrides["chapter_min_chars"] = args.chapter_min_chars
    if args.character_prepass_chars:
        overrides["character_prepass_chars"] = args.character_prepass_chars
    if args.skip_character_prepass:
        overrides["character_prepass_enabled"] = False
    if args.bgm:
        overrides["bgm_path"] = args.bgm
    if args.crossfade_ms is not None:
        overrides["audio_crossfade_ms"] = args.crossfade_ms
    if args.dynamic_pauses is not None:
        overrides["dynamic_pause_enabled"] = args.dynamic_pauses
    if args.tts_rate_limit_per_minute is not None:
        overrides["tts_rate_limit_per_minute"] = args.tts_rate_limit_per_minute
    if args.voice_scheme:
        overrides["voice_scheme"] = args.voice_scheme
    if overrides:
        config = replace(config, **overrides)

    input_path = resolve_input_path(args.input, config)
    if input_path:
        raw_text = read_novel_text(
            input_path,
            config.input_encoding,
            chapter_limit=config.chapter_limit,
            chapter_min_chars=config.chapter_min_chars,
        )
        if input_path.suffix.lower() != ".epub":
            raw_text = limit_text_to_chapters(raw_text, config.chapter_limit, config.chapter_min_chars)
    else:
        raw_text = SAMPLE_CHINESE_CHAPTER
    output_path = args.output if args.output.is_absolute() else Path.cwd() / args.output

    try:
        result_path = run_pipeline(
            raw_text=raw_text,
            output_path=output_path,
            config=config,
            force_heuristic=args.force_heuristic,
            dry_run=args.dry_run,
            export_voice_scheme=args.export_voice_scheme,
        )
    except Exception as exc:
        print(f"Pipeline failed: {exc}", file=sys.stderr)
        return 1

    if args.dry_run:
        print(f"Dry run complete. Manifest written to: {result_path}")
        print(f"SSML chunks written to: {config.ssml_dir}")
    else:
        if result_path != output_path:
            print(
                "Requested non-WAV output requires pydub and ffmpeg; "
                f"exported WAV fallback instead: {result_path}"
            )
        print(f"Audiobook exported to: {result_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
