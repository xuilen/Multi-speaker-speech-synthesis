

# Novel-Audiobook-TTS

Convert long-form Chinese TXT/EPUB novels into multi-character audiobook audio using LLM-based dialogue extraction and pluggable TTS synthesis. The project does not use voice cloning.

## What It Supports

- `azure` backend: multi-voice SSML with Azure Speech.
- `edge` backend: lower-cost Edge-TTS segment synthesis with local chunk assembly.
- `silent` backend: offline placeholder audio for pipeline/resume testing.
- LLM extraction with OpenAI-compatible APIs, plus a deterministic fallback parser.
- Carry-over context memory to reduce cross-chunk pronoun mistakes.
- First-chapters character prepass for stable voice assignment.
- Retry, rate limiting, concurrent synthesis, and resumable progress manifests.
- Dynamic pauses, optional crossfade, and optional BGM underlay.

## Setup

```powershell
cd D:\xiaoshuo
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e .
```

Install `ffmpeg` separately and make sure `ffmpeg` is available on `PATH`; `pydub` needs it for MP3 export.

## Configure Secrets

Edit [`.env`](.env) locally:

```dotenv
BIGMODEL_API_KEY=...
BIGMODEL_BASE_URL=https://open.bigmodel.cn/api/paas/v4/
BIGMODEL_MODEL=glm-4-flash
NOVEL_TTS_BACKEND=edge
NOVEL_TTS_INPUT_PATH=documents/sanguoyanyi.txt
NOVEL_TTS_CHAPTER_LIMIT=2
```

For Azure TTS, also set:

```dotenv
AZURE_SPEECH_KEY=...
AZURE_SPEECH_REGION=eastus
NOVEL_TTS_BACKEND=azure
AZURE_SPEECH_ENABLE_STYLES=false
```

For DeepSeek, leave `OPENAI_API_KEY` and `BIGMODEL_API_KEY` empty and set:

```dotenv
DEEPSEEK_API_KEY=...
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

The app automatically loads `.env` from the project root. Shell environment variables take priority over `.env` values.

Useful backend settings:

```dotenv
NOVEL_TTS_BACKEND=azure   # azure, edge, or silent
NOVEL_TTS_RESUME=true
NOVEL_TTS_RATE_LIMIT_PER_MINUTE=0
LLM_RATE_LIMIT_PER_MINUTE=0
NOVEL_TTS_CHARACTER_PREPASS=true
NOVEL_TTS_CARRY_CONTEXT_CHARS=300
```

## Sanguoyanyi First-Two-Chapters Trial

Put the novel file here:

```text
documents\sanguoyanyi.epub
```

The default `.env` is already set to process only the first two chapter headings:

```dotenv
NOVEL_TTS_INPUT_PATH=documents/sanguoyanyi.epub
NOVEL_TTS_CHAPTER_LIMIT=2
NOVEL_TTS_CHAPTER_MIN_CHARS=500
BIGMODEL_BASE_URL=https://open.bigmodel.cn/api/paas/v4/
BIGMODEL_MODEL=glm-4-flash
```

Generate audio with the lower-cost Edge-TTS backend:

```powershell
python -m novel_tts_system.main --output output\sanguoyanyi_first2.mp3
```

Inspect only the extraction and SSML first:

```powershell
python -m novel_tts_system.main --dry-run
```

Override the limit from the command line:

```powershell
python -m novel_tts_system.main --chapter-limit 2 --output output\sanguoyanyi_first2.mp3
```

If your TXT has a table of contents that is still being picked up, increase the body-length filter:

```powershell
python -m novel_tts_system.main --chapter-limit 2 --chapter-min-chars 1200 --dry-run
```

## Smoke Test Without Cloud Audio

```powershell
python -m novel_tts_system.main --dry-run --force-heuristic
```

Or test the file-input path:

```powershell
python -m novel_tts_system.main --input sample_inputs\demo_chapter.txt --dry-run --force-heuristic
```

Test the full audio pipeline without network calls:

```powershell
python -m novel_tts_system.main --input sample_inputs\demo_chapter.txt --tts-backend silent --force-heuristic --output output\silent_demo.wav
```

This writes:

- `output/extraction_manifest.json`
- `output/ssml/chunk_0000.ssml`
- `cache/characters.json`
- `output/generation_progress.json` for non-dry synthesis runs

## Convert A Book

Put a `.txt` novel file anywhere, then run:

```powershell
python -m novel_tts_system.main --input D:\books\chapter01.txt --output output\chapter01.mp3
```

Lower-cost Edge-TTS route:

```powershell
python -m novel_tts_system.main --input D:\books\chapter01.txt --tts-backend edge --output output\chapter01.mp3
```

For older Chinese text files, encoding can be auto-detected across UTF-8 and common Chinese encodings:

```powershell
python -m novel_tts_system.main --input D:\books\novel.txt --encoding auto --output output\novel.mp3
```

Recommended first pass for a full book:

```powershell
python -m novel_tts_system.main --input D:\books\novel.txt --dry-run
```

Inspect `output/extraction_manifest.json` and `cache/characters.json` before running real Azure synthesis. You can manually tune character voices in `cache/characters.json`; future runs reuse that registry.

## Resume And Rate Limits

Synthesis progress is recorded in `output/generation_progress.json`. If a run is interrupted, the next run reuses completed chunk audio when the payload hash still matches.

```powershell
python -m novel_tts_system.main --input D:\books\novel.txt --tts-backend edge --resume
```

Disable reuse when you want a clean regeneration:

```powershell
python -m novel_tts_system.main --input D:\books\novel.txt --tts-backend edge --no-resume
```

Throttle provider calls when a backend starts rate-limiting:

```powershell
python -m novel_tts_system.main --input D:\books\novel.txt --tts-rate-limit-per-minute 20
```

## Audio Polish

Dynamic pauses are on by default. You can add a subtle crossfade and BGM underlay:

```powershell
python -m novel_tts_system.main --input D:\books\novel.txt --tts-backend edge --crossfade-ms 60 --bgm D:\music\ambient.mp3 --output output\novel.mp3
```

## Browser App

The pure frontend single-page app lives in `web_app/index.html`. Open it directly in Chrome or Edge to import `.txt` / `.md` text, adjust chapters, preview with Web Speech, record WAV audio from the current tab when supported, or connect an optional online TTS endpoint for MP3/WAV generation.

## Useful Files

- [novel_tts_system/config.py](novel_tts_system/config.py): `.env` loading and typed config
- [novel_tts_system/processor/chunker.py](novel_tts_system/processor/chunker.py): novel cleaning and chunking
- [novel_tts_system/processor/context_memory.py](novel_tts_system/processor/context_memory.py): carry-over memory for chunk coherence
- [novel_tts_system/processor/character_planner.py](novel_tts_system/processor/character_planner.py): early-book voice preplanning
- [novel_tts_system/processor/extractor.py](novel_tts_system/processor/extractor.py): LLM JSON extraction
- [novel_tts_system/processor/character_registry.py](novel_tts_system/processor/character_registry.py): stable character voice assignment
- [novel_tts_system/tts/ssml_builder.py](novel_tts_system/tts/ssml_builder.py): Azure SSML assembly
- [novel_tts_system/tts/providers.py](novel_tts_system/tts/providers.py): Azure, Edge-TTS, and silent provider adapters
- [novel_tts_system/tts/progress.py](novel_tts_system/tts/progress.py): resumable synthesis manifest
- [novel_tts_system/tts/azure_synth.py](novel_tts_system/tts/azure_synth.py): Azure batch synthesis
- [novel_tts_system/audio/merger.py](novel_tts_system/audio/merger.py): merge, trim, normalize

Overall Architecture
<img width="322" height="494" alt="image" src="https://github.com/user-attachments/assets/0d22818d-a1b3-4dd6-8c96-aa00b4d78a98" />


Visual interface
<img width="1280" height="594" alt="image" src="https://github.com/user-attachments/assets/1a6ea666-b88c-48f4-81cb-03a242b9b818" />
