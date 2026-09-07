"""Runtime configuration for Novel-Audiobook-TTS.

Configuration is environment-driven and can be populated from a local ``.env``
file. Secrets are loaded once here so the rest of the project can consume a
typed ``AppConfig`` instead of reading key material directly.
"""

import json
import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(slots=True)
class AppConfig:
    """Application settings loaded from environment variables."""

    azure_speech_key: str | None
    azure_speech_region: str | None
    azure_speech_endpoint: str | None
    azure_use_endpoint: bool
    azure_enable_styles: bool
    azure_max_ssml_chars: int
    llm_api_key: str | None
    llm_base_url: str | None
    llm_model: str
    llm_temperature: float
    llm_max_retries: int
    llm_retry_base_delay: float
    llm_retry_max_delay: float
    llm_rate_limit_per_minute: int
    fallback_to_heuristic: bool
    target_chunk_chars: int
    min_chunk_chars: int
    max_chunk_chars: int
    prefix_context_chars: int
    carry_context_chars: int
    character_prepass_enabled: bool
    character_prepass_chars: int
    output_dir: Path
    cache_dir: Path
    registry_path: Path
    temp_audio_dir: Path
    ssml_dir: Path
    progress_manifest_path: Path
    tts_backend: str
    max_synthesis_workers: int
    tts_retry_max_attempts: int
    tts_retry_base_delay: float
    tts_retry_max_delay: float
    tts_rate_limit_per_minute: int
    resume_enabled: bool
    default_language: str
    narrator_gender: str
    target_dbfs: float
    inter_chunk_silence_ms: int
    speaker_break_ms: int
    audio_crossfade_ms: int
    dynamic_pause_enabled: bool
    bgm_path: Path | None
    bgm_gain_db: float
    edge_default_voice: str
    edge_voice_map: dict[str, str]
    input_path: Path | None
    input_encoding: str
    chapter_limit: int
    chapter_min_chars: int
    loaded_env_files: tuple[Path, ...]

    @property
    def has_llm_credentials(self) -> bool:
        """Return True when an OpenAI-compatible API key is configured."""

        return bool(self.llm_api_key)

    @property
    def has_azure_credentials(self) -> bool:
        """Return True when Azure Speech credentials are configured."""

        return bool(self.azure_speech_key and (self.azure_speech_region or self.azure_speech_endpoint))

    def ensure_directories(self) -> None:
        """Create output, cache, SSML, and temporary audio directories."""

        for path in (self.output_dir, self.cache_dir, self.temp_audio_dir, self.ssml_dir):
            path.mkdir(parents=True, exist_ok=True)


def _bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def _int_env(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _float_env(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        return default


def _clean_env(name: str) -> str | None:
    """Return a stripped env var, treating blanks/placeholders as missing."""

    value = os.getenv(name)
    if value is None:
        return None
    stripped = value.strip()
    if not stripped:
        return None
    if stripped.lower() in {"none", "null", "your_key_here", "your_azure_speech_key"}:
        return None
    return stripped


def _strip_inline_comment(value: str) -> str:
    """Strip unquoted inline comments from a dotenv value."""

    in_single = False
    in_double = False
    escaped = False
    for index, char in enumerate(value):
        if escaped:
            escaped = False
            continue
        if char == "\\":
            escaped = True
            continue
        if char == "'" and not in_double:
            in_single = not in_single
            continue
        if char == '"' and not in_single:
            in_double = not in_double
            continue
        if char == "#" and not in_single and not in_double:
            previous = value[index - 1] if index > 0 else " "
            if previous.isspace():
                return value[:index].rstrip()
    return value.strip()


def _parse_dotenv_value(value: str) -> str:
    value = _strip_inline_comment(value.strip())
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        value = value[1:-1]
    return value.replace("\\n", "\n")


def load_dotenv(env_file: Path, override: bool = False) -> bool:
    """Load a simple ``KEY=value`` dotenv file into ``os.environ``.

    Existing shell variables win by default. The parser intentionally supports
    the practical subset needed for secrets and paths without executing shell
    syntax.
    """

    if not env_file.exists():
        return False

    for raw_line in env_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :].strip()
        if "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        if not key:
            continue
        if not override and key in os.environ:
            continue
        os.environ[key] = _parse_dotenv_value(value)

    return True


def _candidate_env_files(project_root: Path, package_dir: Path, explicit_env_file: Path | None) -> list[Path]:
    candidates: list[Path] = []
    if explicit_env_file:
        candidates.append(explicit_env_file)
    candidates.extend([Path.cwd() / ".env", project_root / ".env", package_dir / ".env"])

    seen: set[Path] = set()
    unique: list[Path] = []
    for path in candidates:
        resolved = path.expanduser().resolve()
        if resolved in seen:
            continue
        seen.add(resolved)
        unique.append(resolved)
    return unique


def _load_dotenv_candidates(project_root: Path, package_dir: Path, explicit_env_file: Path | None) -> tuple[Path, ...]:
    loaded: list[Path] = []
    for env_file in _candidate_env_files(project_root, package_dir, explicit_env_file):
        if load_dotenv(env_file):
            loaded.append(env_file)
    return tuple(loaded)


def _path_from_env(name: str, default: Path, root: Path) -> Path:
    value = os.getenv(name)
    path = Path(value).expanduser() if value else default
    if path.is_absolute():
        return path
    return root / path


def _optional_path_from_env(name: str, root: Path) -> Path | None:
    value = os.getenv(name)
    if not value:
        return None
    path = Path(value).expanduser()
    if path.is_absolute():
        return path
    return root / path


def _dict_env(name: str, default: dict[str, str]) -> dict[str, str]:
    value = os.getenv(name)
    if not value:
        return default
    try:
        loaded = json.loads(value)
    except Exception:
        return default
    if not isinstance(loaded, dict):
        return default
    return {str(key): str(item) for key, item in loaded.items()}


def load_config(base_dir: Path | None = None, env_file: Path | None = None) -> AppConfig:
    """Load configuration from environment variables.

    Recognized variables include:
    - ``AZURE_SPEECH_KEY``, ``AZURE_SPEECH_REGION``, ``AZURE_SPEECH_ENDPOINT``
    - ``OPENAI_API_KEY``, ``OPENAI_BASE_URL``, ``OPENAI_MODEL``
    - ``DEEPSEEK_API_KEY``, ``DEEPSEEK_BASE_URL``
    - ``NOVEL_TTS_OUTPUT_DIR``, ``NOVEL_TTS_CACHE_DIR``
    """

    package_dir = Path(__file__).resolve().parent
    project_root = package_dir.parent
    loaded_env_files = _load_dotenv_candidates(project_root, package_dir, env_file)
    root = base_dir or _path_from_env("NOVEL_TTS_HOME", project_root, project_root)

    openai_key = os.getenv("OPENAI_API_KEY")
    bigmodel_key = os.getenv("BIGMODEL_API_KEY") or os.getenv("ZHIPUAI_API_KEY")
    deepseek_key = os.getenv("DEEPSEEK_API_KEY")
    llm_api_key = openai_key or bigmodel_key or deepseek_key
    using_bigmodel = bool(bigmodel_key and not openai_key)
    using_deepseek = bool(deepseek_key and not openai_key and not bigmodel_key)
    llm_base_url = os.getenv("OPENAI_BASE_URL") or os.getenv("OPENAI_API_BASE") or None
    if using_bigmodel:
        llm_base_url = llm_base_url or os.getenv("BIGMODEL_BASE_URL") or "https://open.bigmodel.cn/api/paas/v4/"
    if using_deepseek:
        llm_base_url = llm_base_url or os.getenv("DEEPSEEK_BASE_URL") or "https://api.deepseek.com"

    if using_bigmodel:
        default_model = os.getenv("BIGMODEL_MODEL", "glm-4-flash")
    elif using_deepseek:
        default_model = "deepseek-chat"
    else:
        default_model = "gpt-4o-mini"
    output_dir = _path_from_env("NOVEL_TTS_OUTPUT_DIR", root / "output", root)
    cache_dir = _path_from_env("NOVEL_TTS_CACHE_DIR", root / "cache", root)
    progress_manifest_path = _path_from_env(
        "NOVEL_TTS_PROGRESS_MANIFEST_PATH",
        output_dir / "generation_progress.json",
        root,
    )
    if using_bigmodel:
        llm_model = os.getenv("LLM_MODEL") or os.getenv("BIGMODEL_MODEL") or default_model
    else:
        llm_model = os.getenv("LLM_MODEL") or os.getenv("OPENAI_MODEL") or default_model

    return AppConfig(
        azure_speech_key=_clean_env("AZURE_SPEECH_KEY") or _clean_env("SPEECH_KEY"),
        azure_speech_region=_clean_env("AZURE_SPEECH_REGION") or _clean_env("SPEECH_REGION"),
        azure_speech_endpoint=_clean_env("AZURE_SPEECH_ENDPOINT"),
        azure_use_endpoint=_bool_env("AZURE_SPEECH_USE_ENDPOINT", False),
        azure_enable_styles=_bool_env("AZURE_SPEECH_ENABLE_STYLES", True),
        azure_max_ssml_chars=_int_env("AZURE_SPEECH_MAX_SSML_CHARS", 4500),
        llm_api_key=llm_api_key,
        llm_base_url=llm_base_url,
        llm_model=llm_model,
        llm_temperature=_float_env("LLM_TEMPERATURE", 0.0),
        llm_max_retries=_int_env("LLM_MAX_RETRIES", 2),
        llm_retry_base_delay=_float_env("LLM_RETRY_BASE_DELAY", 1.0),
        llm_retry_max_delay=_float_env("LLM_RETRY_MAX_DELAY", 20.0),
        llm_rate_limit_per_minute=_int_env("LLM_RATE_LIMIT_PER_MINUTE", 0),
        fallback_to_heuristic=_bool_env("NOVEL_TTS_FALLBACK_HEURISTIC", True),
        target_chunk_chars=_int_env("NOVEL_TTS_TARGET_CHARS", 850),
        min_chunk_chars=_int_env("NOVEL_TTS_MIN_CHARS", 600),
        max_chunk_chars=_int_env("NOVEL_TTS_MAX_CHARS", 1000),
        prefix_context_chars=_int_env("NOVEL_TTS_PREFIX_CONTEXT_CHARS", 200),
        carry_context_chars=_int_env("NOVEL_TTS_CARRY_CONTEXT_CHARS", 300),
        character_prepass_enabled=_bool_env("NOVEL_TTS_CHARACTER_PREPASS", True),
        character_prepass_chars=_int_env("NOVEL_TTS_CHARACTER_PREPASS_CHARS", 30000),
        output_dir=output_dir,
        cache_dir=cache_dir,
        registry_path=_path_from_env("NOVEL_TTS_REGISTRY_PATH", cache_dir / "characters.json", root),
        temp_audio_dir=_path_from_env("NOVEL_TTS_TEMP_AUDIO_DIR", output_dir / "chunks", root),
        ssml_dir=_path_from_env("NOVEL_TTS_SSML_DIR", output_dir / "ssml", root),
        progress_manifest_path=progress_manifest_path,
        tts_backend=os.getenv("NOVEL_TTS_BACKEND", "azure").strip().lower(),
        max_synthesis_workers=_int_env("NOVEL_TTS_SYNTH_WORKERS", 3),
        tts_retry_max_attempts=_int_env("NOVEL_TTS_RETRY_MAX_ATTEMPTS", 4),
        tts_retry_base_delay=_float_env("NOVEL_TTS_RETRY_BASE_DELAY", 1.0),
        tts_retry_max_delay=_float_env("NOVEL_TTS_RETRY_MAX_DELAY", 30.0),
        tts_rate_limit_per_minute=_int_env("NOVEL_TTS_RATE_LIMIT_PER_MINUTE", 0),
        resume_enabled=_bool_env("NOVEL_TTS_RESUME", True),
        default_language=os.getenv("NOVEL_TTS_LANGUAGE", "zh-CN"),
        narrator_gender=os.getenv("NOVEL_TTS_NARRATOR_GENDER", "male"),
        target_dbfs=_float_env("NOVEL_TTS_TARGET_DBFS", -18.0),
        inter_chunk_silence_ms=_int_env("NOVEL_TTS_INTER_CHUNK_SILENCE_MS", 250),
        speaker_break_ms=_int_env("NOVEL_TTS_SPEAKER_BREAK_MS", 300),
        audio_crossfade_ms=_int_env("NOVEL_TTS_AUDIO_CROSSFADE_MS", 0),
        dynamic_pause_enabled=_bool_env("NOVEL_TTS_DYNAMIC_PAUSES", True),
        bgm_path=_optional_path_from_env("NOVEL_TTS_BGM_PATH", root),
        bgm_gain_db=_float_env("NOVEL_TTS_BGM_GAIN_DB", -24.0),
        edge_default_voice=os.getenv("EDGE_TTS_DEFAULT_VOICE", "zh-CN-XiaoxiaoNeural"),
        edge_voice_map=_dict_env(
            "EDGE_TTS_VOICE_MAP",
            {
                "zh-CN-YunxiNeural": "zh-CN-YunxiNeural",
                "zh-CN-XiaoxiaoNeural": "zh-CN-XiaoxiaoNeural",
                "zh-CN-YunjieNeural": "zh-CN-YunjieNeural",
                "zh-CN-XiaoyiNeural": "zh-CN-XiaoyiNeural",
                "zh-CN-YunzeNeural": "zh-CN-YunzeNeural",
            },
        ),
        input_path=_optional_path_from_env("NOVEL_TTS_INPUT_PATH", root),
        input_encoding=os.getenv("NOVEL_TTS_INPUT_ENCODING", "auto"),
        chapter_limit=_int_env("NOVEL_TTS_CHAPTER_LIMIT", 0),
        chapter_min_chars=_int_env("NOVEL_TTS_CHAPTER_MIN_CHARS", 500),
        loaded_env_files=loaded_env_files,
    )
