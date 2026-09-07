"""Text-to-speech provider adapters with async concurrency and resume support."""

from __future__ import annotations

import asyncio
import hashlib
import json
import wave
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from novel_tts_system.audio.merger import AudioMerger
from novel_tts_system.config import AppConfig
from novel_tts_system.processor.character_registry import CharacterRegistry
from novel_tts_system.schemas import DialogueSegment
from novel_tts_system.tts.azure_synth import AzureBatchSynthesizer, SynthesisError
from novel_tts_system.tts.progress import ProgressManifest
from novel_tts_system.tts.ssml_builder import SSMLBuilder
from novel_tts_system.utils.retry import AsyncRateLimiter, AsyncRetryPolicy


@dataclass(slots=True)
class SynthesisJob:
    """A chunk-level synthesis job consumed by provider adapters."""

    index: int
    segments: list[DialogueSegment]
    ssml: str
    ssml_path: Path
    output_path: Path
    pause_ms: int

    @property
    def key(self) -> str:
        """Stable manifest key for this job."""

        return f"chunk_{self.index:04d}"

    def payload_hash(self, backend: str) -> str:
        """Hash provider-relevant content so stale resumes are avoided."""

        payload = {
            "backend": backend,
            "segments": [segment.model_dump(mode="json") for segment in self.segments],
            "ssml": self.ssml,
        }
        raw = json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
        return hashlib.sha256(raw).hexdigest()


class TTSProvider(Protocol):
    """Common interface for all synthesis backends."""

    backend_name: str
    file_extension: str

    async def synthesize_many(
        self,
        jobs: list[SynthesisJob],
        progress: ProgressManifest,
        resume: bool = True,
    ) -> list[Path]:
        """Synthesize jobs and return output files in chunk order."""


class BaseTTSProvider:
    """Base implementation for concurrency, retries, rate limiting, and resume."""

    backend_name = "base"
    file_extension = "wav"

    def __init__(self, config: AppConfig, registry: CharacterRegistry) -> None:
        self.config = config
        self.registry = registry
        self.retry_policy = AsyncRetryPolicy(
            max_attempts=config.tts_retry_max_attempts,
            base_delay=config.tts_retry_base_delay,
            max_delay=config.tts_retry_max_delay,
        )
        self.rate_limiter = AsyncRateLimiter(config.tts_rate_limit_per_minute)

    async def synthesize_many(
        self,
        jobs: list[SynthesisJob],
        progress: ProgressManifest,
        resume: bool = True,
    ) -> list[Path]:
        """Synthesize jobs concurrently and persist progress after each job."""

        semaphore = asyncio.Semaphore(max(1, self.config.max_synthesis_workers))

        async def run_job(job: SynthesisJob) -> tuple[int, Path]:
            async with semaphore:
                payload_hash = job.payload_hash(self.backend_name)
                if resume and progress.is_complete(job.key, payload_hash, job.output_path):
                    return job.index, job.output_path

                progress.mark_started(job.key, payload_hash, job.output_path, self.backend_name)
                try:
                    await self.rate_limiter.wait()
                    path = await self.retry_policy.run(lambda: self._synthesize_job(job))
                    progress.mark_complete(job.key, payload_hash, path, self.backend_name)
                    return job.index, path
                except Exception as exc:
                    progress.mark_failed(job.key, payload_hash, job.output_path, self.backend_name, str(exc))
                    raise

        results = await asyncio.gather(*(run_job(job) for job in jobs))
        return [path for _, path in sorted(results, key=lambda item: item[0])]

    async def _synthesize_job(self, job: SynthesisJob) -> Path:
        raise NotImplementedError


class AzureTTSProvider(BaseTTSProvider):
    """Azure Speech provider using chunk-level SSML."""

    backend_name = "azure"
    file_extension = "wav"

    async def _synthesize_job(self, job: SynthesisJob) -> Path:
        synthesizer = AzureBatchSynthesizer(self.config)
        try:
            return await asyncio.to_thread(synthesizer.synthesize_ssml, job.ssml, job.output_path)
        except Exception as exc:
            fallback_ssml = SSMLBuilder(
                registry=self.registry,
                language=self.config.default_language,
                speaker_break_ms=self.config.speaker_break_ms,
                enable_styles=False,
            ).build_chunk_ssml(job.segments)
            try:
                return await asyncio.to_thread(synthesizer.synthesize_ssml, fallback_ssml, job.output_path)
            except Exception as fallback_exc:
                raise SynthesisError(
                    f"Azure failed rich SSML and plain fallback for {job.key}. "
                    f"Rich error: {exc}; plain fallback error: {fallback_exc}"
                ) from fallback_exc


class EdgeTTSProvider(BaseTTSProvider):
    """Edge-TTS provider that synthesizes segments and assembles local chunks."""

    backend_name = "edge"
    file_extension = "mp3"

    async def _synthesize_job(self, job: SynthesisJob) -> Path:
        try:
            import edge_tts
        except ImportError as exc:  # pragma: no cover - depends on optional package
            raise SynthesisError("edge-tts is not installed. Install requirements or use --tts-backend azure.") from exc

        segment_dir = job.output_path.parent / f"{job.output_path.stem}_segments"
        segment_dir.mkdir(parents=True, exist_ok=True)
        segment_files: list[Path] = []

        for segment in job.segments:
            segment_path = segment_dir / f"segment_{segment.index:04d}.mp3"
            voice_config = self.registry.get_voice(segment.speaker, segment_type=segment.type)
            voice_name = self.config.edge_voice_map.get(voice_config.voice_name, self.config.edge_default_voice)
            rate = self._combine_percent(voice_config.rate_offset, segment.rate_offset)
            pitch = self._percent_to_hz(self._combine_percent(voice_config.pitch_offset, segment.pitch_offset))
            communicate = edge_tts.Communicate(segment.text, voice=voice_name, rate=rate, pitch=pitch)
            await communicate.save(str(segment_path))
            segment_files.append(segment_path)

        merger = AudioMerger(
            target_dbfs=self.config.target_dbfs,
            inter_chunk_silence_ms=job.pause_ms,
            crossfade_ms=self.config.audio_crossfade_ms,
            dynamic_pause_enabled=self.config.dynamic_pause_enabled,
        )
        merger.merge_files(segment_files, job.output_path, normalize=False)
        return job.output_path

    @staticmethod
    def _combine_percent(base: str, offset: str) -> str:
        def parse(value: str) -> int:
            try:
                return int(float(value.replace("%", "")))
            except ValueError:
                return 0

        return f"{max(-50, min(50, parse(base) + parse(offset))):+d}%"

    @staticmethod
    def _percent_to_hz(percent: str) -> str:
        try:
            value = int(float(percent.replace("%", "")))
        except ValueError:
            value = 0
        return f"{max(-50, min(50, value * 2)):+d}Hz"


class SilentTTSProvider(BaseTTSProvider):
    """Offline test provider that creates valid silent WAV files."""

    backend_name = "silent"
    file_extension = "wav"

    async def _synthesize_job(self, job: SynthesisJob) -> Path:
        await asyncio.sleep(0)
        total_chars = sum(len(segment.text) for segment in job.segments)
        duration_ms = max(400, min(15000, total_chars * 85 + job.pause_ms * max(0, len(job.segments) - 1)))
        self._write_silence(job.output_path, duration_ms)
        return job.output_path

    @staticmethod
    def _write_silence(output_path: Path, duration_ms: int, sample_rate: int = 24000) -> None:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        frames = int(sample_rate * duration_ms / 1000)
        with wave.open(str(output_path), "wb") as handle:
            handle.setnchannels(1)
            handle.setsampwidth(2)
            handle.setframerate(sample_rate)
            handle.writeframes(b"\x00\x00" * frames)


def create_tts_provider(config: AppConfig, registry: CharacterRegistry) -> BaseTTSProvider:
    """Create the configured TTS backend provider."""

    backend = config.tts_backend.lower()
    if backend == "azure":
        return AzureTTSProvider(config, registry)
    if backend == "edge":
        return EdgeTTSProvider(config, registry)
    if backend == "silent":
        return SilentTTSProvider(config, registry)
    raise ValueError("NOVEL_TTS_BACKEND must be one of: azure, edge, silent.")
