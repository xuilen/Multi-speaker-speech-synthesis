"""Audio splicing, silence trimming, and volume normalization."""

from __future__ import annotations

from pathlib import Path
from typing import Iterable, Sequence
import wave

try:
    from pydub import AudioSegment
except ImportError:  # pragma: no cover - exercised only when dependency is absent
    AudioSegment = None  # type: ignore[assignment]


def pydub_available() -> bool:
    """Return whether pydub is installed and importable."""

    return AudioSegment is not None


class AudioMergeError(RuntimeError):
    """Raised when audio merging or export fails."""


class AudioMerger:
    """Merge synthesized chunks into one normalized audiobook file."""

    def __init__(
        self,
        target_dbfs: float = -18.0,
        inter_chunk_silence_ms: int = 250,
        silence_threshold_dbfs: float = -48.0,
        edge_keep_silence_ms: int = 120,
        crossfade_ms: int = 0,
        dynamic_pause_enabled: bool = True,
        bgm_path: Path | None = None,
        bgm_gain_db: float = -24.0,
    ) -> None:
        self.target_dbfs = target_dbfs
        self.inter_chunk_silence_ms = inter_chunk_silence_ms
        self.silence_threshold_dbfs = silence_threshold_dbfs
        self.edge_keep_silence_ms = edge_keep_silence_ms
        self.crossfade_ms = max(0, crossfade_ms)
        self.dynamic_pause_enabled = dynamic_pause_enabled
        self.bgm_path = bgm_path
        self.bgm_gain_db = bgm_gain_db

    def merge_files(
        self,
        audio_files: Iterable[Path],
        output_path: Path,
        pause_ms: Sequence[int] | None = None,
        normalize: bool = True,
    ) -> Path:
        """Load, trim, merge, normalize, and export audio files."""

        files = [Path(path) for path in audio_files]
        if not files:
            raise AudioMergeError("No synthesized audio files were provided.")
        missing = [str(path) for path in files if not path.exists()]
        if missing:
            raise AudioMergeError(f"Missing audio files: {', '.join(missing)}")

        if AudioSegment is None:
            return self._merge_wav_files_without_pydub(files, output_path, pause_ms)

        merged = AudioSegment.silent(duration=0)
        for index, path in enumerate(files):
            segment = AudioSegment.from_file(path)
            segment = self.trim_edge_silence(segment)
            if index > 0:
                transition_ms = self._pause_for_index(index - 1, pause_ms)
                gap = AudioSegment.silent(duration=transition_ms)
                if self.crossfade_ms > 0 and len(merged) > self.crossfade_ms and len(segment) > self.crossfade_ms:
                    merged = merged.append(gap + segment, crossfade=min(self.crossfade_ms, transition_ms))
                else:
                    merged += gap + segment
            else:
                merged += segment

        if self.bgm_path:
            merged = self.mix_background(merged, self.bgm_path, self.bgm_gain_db)
        if normalize:
            merged = self.normalize_volume(merged)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        export_format = output_path.suffix.lower().lstrip(".") or "mp3"
        merged.export(output_path, format=export_format)
        return output_path

    def trim_edge_silence(self, segment: "AudioSegment") -> "AudioSegment":
        """Trim excessive leading/trailing silence while keeping a natural pad."""

        if len(segment) == 0:
            return segment
        start_trim = self._detect_leading_silence(segment)
        end_trim = self._detect_leading_silence(segment.reverse())
        start = max(0, start_trim - self.edge_keep_silence_ms)
        end = len(segment) - max(0, end_trim - self.edge_keep_silence_ms)
        if start >= end:
            return segment
        return segment[start:end]

    def normalize_volume(self, segment: "AudioSegment") -> "AudioSegment":
        """Normalize average loudness toward the configured dBFS target.

        Pydub exposes dBFS rather than true integrated LUFS. This provides a
        practical target-loudness normalization without adding another runtime
        dependency.
        """

        if segment.dBFS == float("-inf"):
            return segment
        gain = self.target_dbfs - segment.dBFS
        return segment.apply_gain(gain)

    def mix_background(self, foreground: "AudioSegment", bgm_path: Path, gain_db: float = -24.0) -> "AudioSegment":
        """Loop and underlay a background music bed beneath the foreground."""

        if not bgm_path.exists():
            raise AudioMergeError(f"BGM file does not exist: {bgm_path}")
        bgm = AudioSegment.from_file(bgm_path).apply_gain(gain_db)
        if len(bgm) == 0:
            return foreground

        loops = (len(foreground) // len(bgm)) + 1
        bed = sum((bgm for _ in range(loops)), AudioSegment.silent(duration=0))[: len(foreground)]
        fade_ms = min(2500, max(250, len(bed) // 20))
        bed = bed.fade_in(fade_ms).fade_out(fade_ms)
        return foreground.overlay(bed)

    def _pause_for_index(self, index: int, pause_ms: Sequence[int] | None) -> int:
        if pause_ms and index < len(pause_ms):
            return max(0, int(pause_ms[index]))
        return self.inter_chunk_silence_ms

    def _detect_leading_silence(self, segment: "AudioSegment", chunk_size_ms: int = 10) -> int:
        trim_ms = 0
        while trim_ms < len(segment):
            chunk = segment[trim_ms : trim_ms + chunk_size_ms]
            if chunk.dBFS > self.silence_threshold_dbfs:
                break
            trim_ms += chunk_size_ms
        return trim_ms

    def _merge_wav_files_without_pydub(
        self,
        files: list[Path],
        output_path: Path,
        pause_ms: Sequence[int] | None,
    ) -> Path:
        """Fallback WAV concatenation when pydub is unavailable."""

        if output_path.suffix.lower() != ".wav":
            raise AudioMergeError(
                "MP3/non-WAV export requires pydub and ffmpeg. "
                "Use a .wav output path or install the audio export dependencies."
            )

        params: wave._wave_params | None = None
        frames: list[bytes] = []
        for index, path in enumerate(files):
            with wave.open(str(path), "rb") as source:
                source_params = source.getparams()
                if params is None:
                    params = source_params
                elif source_params[:3] != params[:3]:
                    raise AudioMergeError("WAV fallback requires matching channels, sample width, and sample rate.")
                if index > 0 and params is not None:
                    frames.append(self._wav_silence(params, self._pause_for_index(index - 1, pause_ms)))
                frames.append(source.readframes(source.getnframes()))

        if params is None:
            raise AudioMergeError("No WAV frames were loaded.")

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with wave.open(str(output_path), "wb") as target:
            target.setnchannels(params.nchannels)
            target.setsampwidth(params.sampwidth)
            target.setframerate(params.framerate)
            target.writeframes(b"".join(frames))
        return output_path

    @staticmethod
    def _wav_silence(params: wave._wave_params, duration_ms: int) -> bytes:
        frames = int(params.framerate * duration_ms / 1000)
        return b"\x00" * frames * params.nchannels * params.sampwidth
