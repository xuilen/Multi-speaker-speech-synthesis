"""Azure Speech SDK synthesis utilities."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Iterable
from urllib.parse import urlparse

from novel_tts_system.config import AppConfig

try:
    import azure.cognitiveservices.speech as speechsdk
except ImportError:  # pragma: no cover - exercised only when dependency is absent
    speechsdk = None  # type: ignore[assignment]


class SynthesisError(RuntimeError):
    """Raised when Azure Speech synthesis fails."""


class AzureBatchSynthesizer:
    """Batch synthesize SSML documents with Azure Speech SDK."""

    def __init__(self, config: AppConfig) -> None:
        self.config = config

    def synthesize_batch(
        self,
        ssml_documents: Iterable[str],
        output_dir: Path,
        output_format: str = "wav",
        prefix: str = "chunk",
    ) -> list[Path]:
        """Synthesize a sequence of SSML documents in a thread pool."""

        documents = list(ssml_documents)
        output_dir.mkdir(parents=True, exist_ok=True)
        suffix = self._normalize_suffix(output_format)
        jobs = [
            (index, document, output_dir / f"{prefix}_{index:04d}.{suffix}")
            for index, document in enumerate(documents)
        ]

        results: dict[int, Path] = {}
        with ThreadPoolExecutor(max_workers=self.config.max_synthesis_workers) as executor:
            future_map = {
                executor.submit(self.synthesize_ssml, document, path): (index, path)
                for index, document, path in jobs
            }
            for future in as_completed(future_map):
                index, path = future_map[future]
                future.result()
                results[index] = path

        return [results[index] for index in sorted(results)]

    def synthesize_ssml(self, ssml: str, output_path: Path) -> Path:
        """Synthesize one SSML document to a local audio file."""

        if speechsdk is None:
            raise SynthesisError("azure-cognitiveservices-speech is not installed.")
        if not self.config.has_azure_credentials:
            raise SynthesisError("Azure Speech credentials are missing.")

        output_path.parent.mkdir(parents=True, exist_ok=True)
        self._validate_inputs(ssml, output_path)

        try:
            speech_config = self._speech_config(output_path.suffix.lower())
            audio_config = speechsdk.audio.AudioOutputConfig(filename=str(output_path))
            synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)
            result = synthesizer.speak_ssml_async(ssml).get()
            return self._handle_result(result, output_path, len(ssml))
        except SynthesisError:
            raise
        except Exception as exc:
            raise self._sdk_error(exc, output_path, len(ssml)) from exc

    def _handle_result(self, result: object, output_path: Path, ssml_chars: int) -> Path:
        try:
            reason = result.reason
        except Exception as exc:
            raise self._sdk_error(exc, output_path, ssml_chars) from exc

        if reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            return output_path

        if reason == speechsdk.ResultReason.Canceled:
            details = self._cancellation_details(result)
            raise SynthesisError(
                f"Azure synthesis canceled for {output_path.name}: {details}"
            )

        raise SynthesisError(f"Azure synthesis failed for {output_path.name} with result reason: {reason}")

    def _sdk_error(self, exc: Exception, output_path: Path, ssml_chars: int) -> SynthesisError:
        return SynthesisError(
            "Azure Speech SDK rejected or failed to inspect the synthesis request. "
            "Common causes are invalid region/key pairing, malformed SSML, unsupported voice/style SSML, "
            f"or a backend-side invalid-argument response. Chunk={output_path.name}; "
            f"SSML chars={ssml_chars}; original error={exc}"
        )

    @staticmethod
    def _cancellation_details(result: object) -> str:
        try:
            details = result.cancellation_details
            return f"{details.reason}; details={details.error_details}"
        except Exception as exc:
            return f"unable to read cancellation details: {exc}"

    def _speech_config(self, suffix: str) -> object:
        if self.config.azure_use_endpoint and self.config.azure_speech_endpoint:
            self._validate_endpoint(self.config.azure_speech_endpoint)
            speech_config = speechsdk.SpeechConfig(
                subscription=self.config.azure_speech_key,
                endpoint=self.config.azure_speech_endpoint,
            )
        else:
            if not self.config.azure_speech_region:
                raise SynthesisError(
                    "AZURE_SPEECH_REGION is required unless AZURE_SPEECH_USE_ENDPOINT=true "
                    "and AZURE_SPEECH_ENDPOINT is a full Speech endpoint URL."
                )
            speech_config = speechsdk.SpeechConfig(
                subscription=self.config.azure_speech_key,
                region=self.config.azure_speech_region,
            )

        if suffix == ".mp3":
            output_format = speechsdk.SpeechSynthesisOutputFormat.Audio24Khz160KBitRateMonoMp3
        else:
            output_format = speechsdk.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm
        speech_config.set_speech_synthesis_output_format(output_format)
        return speech_config

    def _validate_inputs(self, ssml: str, output_path: Path) -> None:
        if not ssml.strip().startswith("<speak"):
            raise SynthesisError(f"Azure expects a complete SSML document for {output_path.name}.")
        if len(ssml) > self.config.azure_max_ssml_chars:
            raise SynthesisError(
                f"Azure SSML chunk is too large ({len(ssml)} chars). "
                "Lower NOVEL_TTS_MAX_CHARS or raise AZURE_SPEECH_MAX_SSML_CHARS."
            )
        if not self.config.azure_speech_key:
            raise SynthesisError("AZURE_SPEECH_KEY is empty.")

    @staticmethod
    def _validate_endpoint(endpoint: str) -> None:
        parsed = urlparse(endpoint)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise SynthesisError(
                "AZURE_SPEECH_ENDPOINT must be a full URL. Prefer setting AZURE_SPEECH_REGION "
                "and leaving AZURE_SPEECH_USE_ENDPOINT=false."
            )

    @staticmethod
    def _normalize_suffix(output_format: str) -> str:
        value = output_format.lower().lstrip(".")
        if value not in {"wav", "mp3"}:
            raise ValueError("output_format must be 'wav' or 'mp3'.")
        return value
