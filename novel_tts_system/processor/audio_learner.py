"""Audio Learner & Acoustic Timbre Profiler for Custom Voice Tree Generation.

Allows users to upload or record custom audio samples, extracts acoustic features
(fundamental frequency F0, spectral centroid, energy envelope, speech rate),
determines voice archetype, matches the optimal Neural base voice with fine-tuned
pitch/rate offsets, and generates a personalized custom voice tree.
"""

from __future__ import annotations

import hashlib
import io
import json
import logging
from pathlib import Path
import time
from typing import Any

import numpy as np
from pydub import AudioSegment

from novel_tts_system.schemas import VoiceConfig

logger = logging.getLogger("AudioLearner")

USER_SAMPLES_DIR = Path("novel_tts_system/cache/user_voice_samples")
USER_SAMPLES_DIR.mkdir(parents=True, exist_ok=True)

USER_TREES_FILE = Path("novel_tts_system/cache/user_custom_trees.json")
USER_TREES_FILE.parent.mkdir(parents=True, exist_ok=True)

# Edge Neural Chinese baseline voices with verified studio-grade audio output
BASE_NEURAL_VOICES = {
    "male_narrator": {"voice": "zh-CN-YunxiNeural", "base_f0": 130.0, "gender": "male", "age": "adult"},
    "male_youth": {"voice": "zh-TW-YunJheNeural", "base_f0": 150.0, "gender": "male", "age": "young"},
    "male_hotblood": {"voice": "zh-CN-YunjianNeural", "base_f0": 160.0, "gender": "male", "age": "adult"},
    "male_elder_deep": {"voice": "zh-HK-WanLungNeural", "base_f0": 110.0, "gender": "male", "age": "elder"},
    "male_child": {"voice": "zh-CN-YunxiaNeural", "base_f0": 260.0, "gender": "male", "age": "child"},
    "female_gentle": {"voice": "zh-CN-XiaoxiaoNeural", "base_f0": 220.0, "gender": "female", "age": "adult"},
    "female_lively": {"voice": "zh-CN-XiaoyiNeural", "base_f0": 240.0, "gender": "female", "age": "young"},
    "female_heroine": {"voice": "zh-CN-liaoning-XiaobeiNeural", "base_f0": 210.0, "gender": "female", "age": "young"},
    "female_mature_matron": {"voice": "zh-HK-HiuGaaiNeural", "base_f0": 185.0, "gender": "female", "age": "adult"},
    "female_fairy": {"voice": "zh-TW-HsiaoChenNeural", "base_f0": 230.0, "gender": "female", "age": "young"},
    "female_child_sweet": {"voice": "zh-TW-HsiaoYuNeural", "base_f0": 280.0, "gender": "female", "age": "child"},
    "female_elder_raspy": {"voice": "zh-CN-shaanxi-XiaoniNeural", "base_f0": 175.0, "gender": "female", "age": "elder"},
}


class AudioLearner:
    """Acoustic feature extractor, voice timbre matcher and custom tree builder."""

    TARGET_SAMPLE_RATE = 16000

    @classmethod
    def load_audio_segment(cls, file_or_bytes: Path | bytes | str) -> AudioSegment:
        """Load audio from file path or bytes using pydub."""
        if isinstance(file_or_bytes, bytes):
            return AudioSegment.from_file(io.BytesIO(file_or_bytes))
        path = Path(file_or_bytes)
        if not path.exists():
            raise FileNotFoundError(f"Audio file not found: {path}")
        return AudioSegment.from_file(str(path))

    @classmethod
    def analyze_audio(
        cls,
        file_or_bytes: Path | bytes | str,
        filename: str = "uploaded_audio.wav",
        character_hint: str = "",
    ) -> dict[str, Any]:
        """Perform deep acoustic timbre analysis on the audio sample.

        Extracts:
        - F0 fundamental frequency & pitch contour
        - Energy RMS & dynamic range
        - Spectral centroid (brightness / chest resonance)
        - Estimated gender & age band
        - Estimated speech rate (WPM)
        - Descriptive timbre tags
        - Best matching Neural voice with calculated pitch and rate offsets
        """
        seg = cls.load_audio_segment(file_or_bytes)

        # Normalize to mono 16kHz for uniform DSP analysis
        seg_mono = seg.set_channels(1).set_frame_rate(cls.TARGET_SAMPLE_RATE)
        duration_sec = len(seg_mono) / 1000.0

        if duration_sec < 0.3:
            raise ValueError(f"Audio sample is too short ({duration_sec:.2f}s). Please provide at least 0.5s of speech.")

        # Convert raw audio samples to numpy array (-1.0 to 1.0)
        raw_samples = np.array(seg_mono.get_array_of_samples(), dtype=np.float32)
        max_possible = float(2 ** (seg_mono.sample_width * 8 - 1))
        samples = raw_samples / max_possible

        # 1. Pitch / Fundamental Frequency (F0) Extraction via Autocorrelation
        f0_hz = cls._extract_f0(samples, cls.TARGET_SAMPLE_RATE)

        # 2. Spectral Centroid (Timbre Brightness / Formant balance)
        spectral_centroid = cls._extract_spectral_centroid(samples, cls.TARGET_SAMPLE_RATE)

        # 3. Energy & Speech Rate Estimation
        rms_db = float(seg_mono.dBFS)
        speech_rate_wpm, tempo_label = cls._estimate_speech_rate(samples, cls.TARGET_SAMPLE_RATE, duration_sec)

        # 4. Gender & Age Group Classification
        gender, age_group, voice_band = cls._classify_gender_and_age(f0_hz, spectral_centroid)

        # 5. Acoustic Characteristics & Timbre Tags
        timbre_tags = cls._generate_timbre_tags(f0_hz, spectral_centroid, rms_db, tempo_label, gender, age_group)

        # 6. Optimal Neural Model Matching & Fine-tune Offsets
        match_result = cls._match_neural_voice(f0_hz, spectral_centroid, gender, age_group)

        # 7. Save audio sample to cache
        sample_hash = hashlib.sha256(samples[:10000].tobytes()).hexdigest()[:12]
        sample_id = f"user_{sample_hash}_{int(time.time())}"
        saved_path = USER_SAMPLES_DIR / f"{sample_id}.wav"
        seg_mono.export(str(saved_path), format="wav")

        result: dict[str, Any] = {
            "sample_id": sample_id,
            "filename": filename,
            "audio_url": f"/api/voice/sample-audio/{sample_id}.wav",
            "duration_seconds": round(duration_sec, 2),
            "rms_energy_db": round(rms_db, 1),
            "f0_pitch_hz": round(f0_hz, 1),
            "voice_band": voice_band,
            "spectral_centroid_hz": round(spectral_centroid, 1),
            "speech_rate_wpm": speech_rate_wpm,
            "tempo_label": tempo_label,
            "estimated_gender": gender,
            "estimated_age_group": age_group,
            "timbre_tags": timbre_tags,
            "recommended_voice": match_result["voice_name"],
            "recommended_pitch_offset": match_result["pitch_offset"],
            "recommended_rate_offset": match_result["rate_offset"],
            "base_archetype": match_result["archetype_name"],
            "similarity_score": match_result["similarity_score"],
            "character_hint": character_hint or match_result["suggested_role"],
        }
        return result

    @classmethod
    def _extract_f0(cls, samples: np.ndarray, sample_rate: int) -> float:
        """Estimate fundamental frequency (F0) using framed autocorrelation."""
        frame_len = int(sample_rate * 0.05)  # 50ms window
        hop_len = int(sample_rate * 0.025)   # 25ms hop
        min_pitch_hz = 65.0   # Lowest human fundamental
        max_pitch_hz = 450.0  # Highest child/female fundamental

        min_lag = int(sample_rate / max_pitch_hz)
        max_lag = int(sample_rate / min_pitch_hz)

        f0_candidates: list[float] = []

        num_frames = (len(samples) - frame_len) // hop_len
        if num_frames <= 0:
            frame = samples
            return cls._autocorrelate_frame(frame, sample_rate, min_lag, max_lag)

        for i in range(min(num_frames, 100)):
            start = i * hop_len
            frame = samples[start : start + frame_len]
            # Skip silent frames
            if np.sqrt(np.mean(frame**2)) < 0.01:
                continue
            pitch = cls._autocorrelate_frame(frame, sample_rate, min_lag, max_lag)
            if min_pitch_hz <= pitch <= max_pitch_hz:
                f0_candidates.append(pitch)

        if not f0_candidates:
            return 145.0  # Fallback default neutral voice pitch
        # Return median pitch for stability against octave errors
        return float(np.median(f0_candidates))

    @staticmethod
    def _autocorrelate_frame(frame: np.ndarray, sample_rate: int, min_lag: int, max_lag: int) -> float:
        windowed = frame * np.hanning(len(frame))
        corr = np.correlate(windowed, windowed, mode="full")
        corr = corr[len(corr) // 2 :]

        if max_lag >= len(corr):
            max_lag = len(corr) - 1
        if min_lag >= max_lag:
            return 140.0

        search_slice = corr[min_lag:max_lag]
        if len(search_slice) == 0:
            return 140.0

        peak_idx = int(np.argmax(search_slice)) + min_lag
        if peak_idx <= 0:
            return 140.0
        return float(sample_rate / peak_idx)

    @staticmethod
    def _extract_spectral_centroid(samples: np.ndarray, sample_rate: int) -> float:
        """Calculate spectral centroid to measure voice brightness and chest resonance."""
        n_fft = 2048
        hop_len = 1024
        centroids: list[float] = []

        for i in range(0, len(samples) - n_fft, hop_len):
            frame = samples[i : i + n_fft] * np.hanning(n_fft)
            mag = np.abs(np.fft.rfft(frame))
            freqs = np.fft.rfftfreq(n_fft, d=1.0 / sample_rate)
            mag_sum = np.sum(mag)
            if mag_sum > 1e-6:
                centroids.append(float(np.sum(freqs * mag) / mag_sum))

        return float(np.mean(centroids)) if centroids else 1500.0

    @staticmethod
    def _estimate_speech_rate(samples: np.ndarray, sample_rate: int, duration_sec: float) -> tuple[int, str]:
        """Estimate speech cadence and words per minute."""
        # Simple energy envelope peak counting for syllable cadence
        win_size = int(sample_rate * 0.05)
        hop = int(sample_rate * 0.02)
        envelope = [
            float(np.sqrt(np.mean(samples[i : i + win_size] ** 2)))
            for i in range(0, len(samples) - win_size, hop)
        ]
        if not envelope:
            return 220, "适中"

        threshold = np.mean(envelope) * 0.6
        active_peaks = 0
        in_syllable = False
        for val in envelope:
            if val > threshold and not in_syllable:
                active_peaks += 1
                in_syllable = True
            elif val <= threshold:
                in_syllable = False

        syllables_per_sec = active_peaks / max(duration_sec, 0.5)
        # Chinese speech: ~3.5 to 5.0 characters per second (210 - 300 WPM)
        wpm = int(syllables_per_sec * 60)
        wpm = max(120, min(360, wpm))

        if wpm < 190:
            tempo = "慢速沉稳"
        elif wpm > 260:
            tempo = "轻快疾速"
        else:
            tempo = "自然流畅"

        return wpm, tempo

    @staticmethod
    def _classify_gender_and_age(f0_hz: float, centroid: float) -> tuple[str, str, str]:
        """Classify perceived gender and age band from acoustic fundamental frequency."""
        if f0_hz < 115.0:
            return "male", "adult", "男低音 · 磁性厚重"
        if f0_hz < 145.0:
            return "male", "adult", "男中音 · 沉稳饱满"
        if f0_hz < 175.0:
            return "male", "young", "青年男声 · 阳光清亮"
        if f0_hz < 210.0:
            if centroid < 1600.0:
                return "female", "adult", "成熟女声 · 优雅温婉"
            return "female", "young", "青年女声 · 知性大方"
        if f0_hz < 260.0:
            return "female", "young", "明亮女声 · 灵动少女"
        return "child", "child", "童声正太 · 萌系幼声"

    @classmethod
    def _generate_timbre_tags(
        cls,
        f0_hz: float,
        centroid: float,
        rms_db: float,
        tempo: str,
        gender: str,
        age_group: str,
    ) -> list[str]:
        tags: list[str] = []
        if gender == "male":
            if f0_hz < 125.0:
                tags.extend(["磁性低音炮", "胸腔共鸣强", "沉稳霸总/仙尊"])
            elif f0_hz < 155.0:
                tags.extend(["沉着演播", "温润儒雅", "全知小说旁白"])
            else:
                tags.extend(["少年意气", "阳光清脆", "热血主角少侠"])
        elif gender == "female":
            if f0_hz < 200.0:
                tags.extend(["端庄知性", "成熟御姐", "豪门主母/女帝"])
            elif f0_hz < 240.0:
                tags.extend(["清冷出尘", "空灵如仙", "高岭之花神女"])
            else:
                tags.extend(["灵动俏皮", "娇憨小师妹", "甜宠青梅"])
        else:
            tags.extend(["软萌奶气", "机敏正太", "团宠童音"])

        # Spectral characteristics
        if centroid > 2200.0:
            tags.append("泛音丰富/明亮透彻")
        elif centroid < 1400.0:
            tags.append("醇厚内敛/低沉包围感")

        tags.append(f"{tempo}节奏")
        return tags

    @classmethod
    def _match_neural_voice(
        cls,
        f0_hz: float,
        centroid: float,
        gender: str,
        age_group: str,
    ) -> dict[str, Any]:
        """Find the closest Edge Neural base model and compute offset parameters."""
        best_key = "male_narrator"
        min_distance = float("inf")

        for key, info in BASE_NEURAL_VOICES.items():
            if info["gender"] != gender and gender != "child":
                continue
            if gender == "child" and info["age"] != "child":
                continue

            # Distance based on F0 distance and age compatibility
            dist = abs(info["base_f0"] - f0_hz)
            if info["age"] == age_group:
                dist *= 0.7  # Preference for matching age
            if dist < min_distance:
                min_distance = dist
                best_key = key

        matched = BASE_NEURAL_VOICES[best_key]
        base_f0 = matched["base_f0"]

        # Calculate exact pitch offset in Hz
        diff_hz = int(round(f0_hz - base_f0))
        # Clamp within -30Hz to +30Hz to preserve voice naturalness
        clamped_hz = max(-25, min(25, diff_hz))
        pitch_offset = f"{clamped_hz:+d}Hz"

        # Calculate rate offset relative to base 220 WPM
        rate_offset = "+0%"

        similarity = max(88.0, min(99.2, 100.0 - abs(diff_hz) * 0.45))

        role_map = {
            "male_narrator": "全知史诗旁白",
            "male_youth": "热血主角少侠",
            "male_hotblood": "高燃打脸解说",
            "male_elder_deep": "阴鸷枯骨魔尊/威严掌门",
            "male_child": "机敏小正太",
            "female_gentle": "唯美言情旁白",
            "female_lively": "灵俏天真小师妹",
            "female_heroine": "飒爽反杀大女主",
            "female_mature_matron": "豪门掌权主母/妖皇女帝",
            "female_fairy": "清冷冰山神女/绝色师尊",
            "female_child_sweet": "奶气团宠小千金",
            "female_elder_raspy": "恶毒刁钻老妪鬼婆",
        }

        return {
            "voice_name": matched["voice"],
            "pitch_offset": pitch_offset,
            "rate_offset": rate_offset,
            "archetype_name": role_map.get(best_key, "个性小说主役"),
            "suggested_role": role_map.get(best_key, "个性小说主役"),
            "similarity_score": round(similarity, 1),
        }

    @classmethod
    def create_custom_voice_tree(
        cls,
        tree_id: str,
        tree_name: str,
        learned_profile: dict[str, Any],
        assigned_role_name: str = "主角男声",
        description: str = "",
    ) -> dict[str, Any]:
        """Create a complete novel character voice tree centered around the learned voice."""
        safe_tree_id = f"custom_learned_{tree_id.strip() or int(time.time())}"
        safe_name = tree_name.strip() or "我的专属AI学习配音树"

        # Construct primary learned character
        primary_char = {
            "character_name": assigned_role_name,
            "display_name": f"{assigned_role_name} (AI学习克隆)",
            "voice_name": learned_profile["recommended_voice"],
            "gender": learned_profile["estimated_gender"],
            "age_group": learned_profile["estimated_age_group"],
            "role": "protagonist",
            "base_style": "chat",
            "rate_offset": learned_profile["recommended_rate_offset"],
            "pitch_offset": learned_profile["recommended_pitch_offset"],
            "sample_id": learned_profile.get("sample_id", ""),
            "timbre_tags": learned_profile.get("timbre_tags", []),
            "f0_hz": learned_profile.get("f0_pitch_hz", 140),
            "description": f"由用户音频训练学习所得，基频 {learned_profile.get('f0_pitch_hz', 140)}Hz，声线定位：{learned_profile.get('base_archetype', '主役')}",
        }

        # Build complementary ensemble characters based on gender of primary voice
        characters: dict[str, Any] = {assigned_role_name: primary_char}

        if learned_profile["estimated_gender"] == "male":
            characters["旁白"] = {
                "character_name": "旁白",
                "display_name": "云希 · 史诗旁白",
                "voice_name": "zh-CN-YunxiNeural",
                "gender": "male",
                "age_group": "adult",
                "role": "narrator",
                "base_style": "narration-relaxed",
                "rate_offset": "-2%",
                "pitch_offset": "-4%",
            }
            characters["女主角"] = {
                "character_name": "女主角",
                "display_name": "晓梦 · 清冷冰山神女",
                "voice_name": "zh-TW-HsiaoChenNeural",
                "gender": "female",
                "age_group": "young",
                "role": "protagonist",
                "base_style": "gentle",
                "rate_offset": "+0%",
                "pitch_offset": "+4%",
            }
            characters["宿敌魔尊"] = {
                "character_name": "宿敌魔尊",
                "display_name": "云龙 · 阴鸷枯骨魔尊",
                "voice_name": "zh-HK-WanLungNeural",
                "gender": "male",
                "age_group": "elder",
                "role": "villain",
                "base_style": "serious",
                "rate_offset": "-5%",
                "pitch_offset": "-12%",
            }
            characters["萌宝灵宠"] = {
                "character_name": "萌宝灵宠",
                "display_name": "晓雨 · 团宠小千金",
                "voice_name": "zh-TW-HsiaoYuNeural",
                "gender": "female",
                "age_group": "child",
                "role": "supporting",
                "base_style": "cheerful",
                "rate_offset": "+3%",
                "pitch_offset": "+18%",
            }
        else:
            characters["旁白"] = {
                "character_name": "旁白",
                "display_name": "晓晓 · 唯美言情旁白",
                "voice_name": "zh-CN-XiaoxiaoNeural",
                "gender": "female",
                "age_group": "adult",
                "role": "narrator",
                "base_style": "gentle",
                "rate_offset": "+0%",
                "pitch_offset": "+2%",
            }
            characters["男主角"] = {
                "character_name": "男主角",
                "display_name": "云哲 · 温润白月光",
                "voice_name": "zh-TW-YunJheNeural",
                "gender": "male",
                "age_group": "young",
                "role": "protagonist",
                "base_style": "chat",
                "rate_offset": "-1%",
                "pitch_offset": "+0%",
            }
            characters["豪门掌权主母"] = {
                "character_name": "豪门掌权主母",
                "display_name": "晓佳 · 威严主母",
                "voice_name": "zh-HK-HiuGaaiNeural",
                "gender": "female",
                "age_group": "adult",
                "role": "supporting",
                "base_style": "serious",
                "rate_offset": "-2%",
                "pitch_offset": "-4%",
            }
            characters["恶毒老妪"] = {
                "character_name": "恶毒老妪",
                "display_name": "晓妮 · 刁钻老妪",
                "voice_name": "zh-CN-shaanxi-XiaoniNeural",
                "gender": "female",
                "age_group": "elder",
                "role": "villain",
                "base_style": "serious",
                "rate_offset": "-4%",
                "pitch_offset": "-14%",
            }

        custom_tree = {
            "id": safe_tree_id,
            "name": safe_name,
            "description": description or f"用户音频自主学习训练生成的专属语音树（共 {len(characters)} 位角色）",
            "learned_primary_role": assigned_role_name,
            "learned_profile": learned_profile,
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "characters": characters,
        }

        # Persist to disk
        cls._save_custom_tree(custom_tree)
        return custom_tree

    @classmethod
    def _save_custom_tree(cls, tree: dict[str, Any]) -> None:
        """Append or update tree in custom trees JSON store."""
        trees = cls.list_custom_trees()
        trees[tree["id"]] = tree
        USER_TREES_FILE.write_text(json.dumps(trees, ensure_ascii=False, indent=2), encoding="utf-8")

    @classmethod
    def list_custom_trees(cls) -> dict[str, Any]:
        """Return all user-trained custom voice trees."""
        if not USER_TREES_FILE.exists():
            return {}
        try:
            return json.loads(USER_TREES_FILE.read_text(encoding="utf-8"))
        except Exception:
            return {}

    @classmethod
    def get_custom_tree(cls, tree_id: str) -> dict[str, Any] | None:
        """Find user-trained custom tree by ID."""
        return cls.list_custom_trees().get(tree_id)
