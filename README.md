Novel-Audiobook-TTS (小说多角色智能语音合成系统)
基于大语言模型（LLM）对话语义提取与语音合成（SSML/TTS）技术，将长篇中文小说文本转换为多角色有声书音频。本项目不依赖声音克隆技术（暂时不支持后续会完善改进），专注于原生高质量多音色演绎与上下文一致性。
核心功能与支持特性
多后端 TTS 支持：
azure：基于 Azure Speech 的高质量多角色 SSML 合成。
edge：低成本/免费的 Edge-TTS 分段合成，并在本地完成片段拼接。
silent：离线占位静音音频生成，便于快速测试完整数据流及断点续传逻辑。
智能语义抽取与消歧：支持兼容 OpenAI API 规范的 LLM（如 GLM-4-Flash、DeepSeek 等），并内置基于规则的确定性兜底提取器。
上下文记忆（Carry-over Context）：跨分块携带上下文摘要与代词指代记忆，显著减少分块边界处的角色误判。
开篇角色预扫描（Character Prepass）：提前分析小说前几个章节，全局统一规划角色性格与音色映射，确保整本书声线稳定。
健壮工程特性：支持速率限制（Rate Limiting）、指数退避重试、多任务并发合成以及基于文件哈希的断点续传机制。
音频后期润色：支持依据标点动态调整停顿、音频交叉淡入淡出（Crossfade）以及背景音乐（BGM）铺底混合。
系统架构与目录结构
xiaoshuo/
├── .env.example                 # 环境变量配置示例模板（API Key、Endpoint 等）
├── .gitignore                   # Git 忽略文件配置
├── cache/                       # 角色与系统全局缓存目录
│   └── characters.json          # 自动生成的角色与音色映射缓存表
├── documents/                   # 原始文档与测试小说资源
│   └── sanguoyanyi.epub         # 示例小说（如三国演义等）
├── novel_tts_system/            # 核心系统代码包
│   ├── __init__.py
│   ├── config.py                # 全局配置管理（加载环境变量、默认参数）
│   ├── schemas.py               # 数据结构与 Pydantic 模型定义
│   ├── main.py                  # 系统主执行入口
│   ├── requirements.txt         # 项目 Python 依赖清单
│   ├── processor/               # 文本与语义处理模块
│   │   ├── __init__.py
│   │   ├── epub_reader.py       # EPUB 电子书解析与章节提取
│   │   ├── chunker.py           # 文本分块与滑窗切片
│   │   ├── extractor.py         # LLM 驱动的人物对话与情节提取
│   │   ├── character_registry.py# 角色花名册与音色注册管理
│   │   ├── character_planner.py # 角色规划与音色自动匹配策略
│   │   └── context_memory.py    # 长上下文剧情记忆维护
│   ├── tts/                     # 语音合成模块
│   │   ├── __init__.py
│   │   ├── providers.py         # TTS 服务提供商接口抽象
│   │   ├── azure_synth.py       # Azure Speech 语音合成实现
│   │   ├── ssml_builder.py      # SSML 标签构建与格式化器
│   │   └── progress.py          # 批处理合成进度条与状态跟踪
│   ├── audio/                   # 音频后处理模块
│   │   ├── __init__.py
│   │   └── merger.py            # 音频切片无缝合并与格式转换
│   └── utils/                   # 工具类库
│       ├── __init__.py
│       └── retry.py             # 网络请求与合成重试装饰器
└── output/                      # 生成产物输出目录
    ├── chunks/                  # 各分段合成音频片段 (*.wav)
    ├── ssml/                    # 各分段中间产物 SSML 文件 (*.ssml)
    └── extraction_manifest.json # 文本提取元数据清单


环境配置
推荐使用虚拟环境进行安装：
# 1. 进入项目根目录并创建虚拟环境
python -m venv .venv

# 2. 激活虚拟环境 (Windows PowerShell)
.\.venv\Scripts\Activate.ps1
# Linux/macOS: source .venv/bin/activate

# 3. 安装项目依赖
pip install -e .


注：请确保系统已安装 ffmpeg 并将其添加至系统环境变量 PATH 中，pydub 导出 MP3 时需要依赖该工具。
配置环境变量
在项目根目录创建或编辑 .env 文件：
# --- LLM API 配置 (智谱 GLM 示例) ---
BIGMODEL_API_KEY=your_api_key_here
BIGMODEL_BASE_URL=https://open.bigmodel.cn/api/paas/v4/
BIGMODEL_MODEL=glm-4-flash

# --- 或使用 DeepSeek (留空 BIGMODEL 相关配置) ---
# DEEPSEEK_API_KEY=your_deepseek_key
# DEEPSEEK_BASE_URL=https://api.deepseek.com
# DEEPSEEK_MODEL=deepseek-chat

# --- TTS 后端配置 ---
NOVEL_TTS_BACKEND=edge          # 可选: edge, azure, silent

# 若使用 Azure TTS，需填写：
# AZURE_SPEECH_KEY=your_azure_key
# AZURE_SPEECH_REGION=eastus

# --- 系统运行参数 ---
NOVEL_TTS_INPUT_PATH=documents/sanguoyanyi.epub
NOVEL_TTS_CHAPTER_LIMIT=2
NOVEL_TTS_RESUME=true
NOVEL_TTS_CHARACTER_PREPASS=true
NOVEL_TTS_CARRY_CONTEXT_CHARS=300


快速上手与常用命令
1. 试运行（以《三国演义》前两章为例）
使用低成本的 Edge-TTS 后端生成音频：
python -m novel_tts_system.main --output output\sanguoyanyi_first2.mp3
仅预演提取结果与 SSML，不发起 TTS 合成请求：
python -m novel_tts_system.main --dry-run
2. 离线冒烟测试（无需网络与 API）
python -m novel_tts_system.main --input sample_inputs\demo_chapter.txt --tts-backend silent --force-heuristic --output output\silent_demo.wav
3. 转换整本小说
# 使用 Edge-TTS 后端转换
python -m novel_tts_system.main --input D:\books\novel.txt --tts-backend edge --output output\novel.mp3

# 自动检测文本编码 (支持 GBK / UTF-8 等)
python -m novel_tts_system.main --input D:\books\novel.txt --encoding auto --output output\novel.mp3

# 启用断点续传并限制请求速率
python -m novel_tts_system.main --input D:\books\novel.txt --resume --tts-rate-limit-per-minute 20

# 添加淡入淡出与背景音乐
python -m novel_tts_system.main --input D:\books\novel.txt --crossfade-ms 60 --bgm D:\music\bgm.mp3 --output output\novel.mp3


核心模块概览
模块 / 文件
职责描述
 
processor/chunker.py                 长篇小说文本规范化、章节标题正则识别与滑动窗口分块切分。

processor/extractor.py               调用大模型提取对话、旁白、说话人及情绪，并内置基于双引号规则的兜底解析。

processor/context_memory.py          维护跨分块的前置记忆与代词状态，保证篇章连续性。

processor/character_planner.py       分析开篇文本，自动规划角色的性别、年龄、性格及建议音色。

processor/character_registry.py       持久化管理角色声线库（cache/characters.json），支持人工干预微调。

tts/ssml_builder.py                   将结构化对话组装为带语速、情绪、停顿属性的标准 Azure SSML 标记。

tts/providers.py                       统一多 TTS 引擎接口（Azure, Edge-TTS, Silent），实现标准化音频生成。

tts/progress.py                        记录分块生成进度清单，提供哈希校验与断点续传能力。

audio/merger.py                        音频切片无缝合并、响度标准化（Loudness Normalization）与 BGM 混合。

可视化界面：
<img width="1280" height="594" alt="image" src="https://github.com/user-attachments/assets/1a6ea666-b88c-48f4-81cb-03a242b9b818" />







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



xiaoshuo/
├── novel_tts_system/               # 核心系统代码库
│   ├── audio/                      # 音频处理与合成
│   │   └── merger.py               # 分段音频拼接与最终导出
│   ├── processor/                  # 文本解析与角色处理核心
│   │   ├── character_planner.py    # 角色音色分配与规划策略
│   │   ├── character_registry.py   # 角色库注册与管理
│   │   ├── chunker.py              # 长文本分块与章节切分
│   │   ├── context_memory.py       # 上下文记忆与多轮对话追踪
│   │   └── extractor.py            # LLM 角色对话与旁白提取器
│   ├── tts/                        # TTS 适配层
│   │   ├── azure_synth.py          # Azure TTS 引擎驱动
│   │   ├── progress.py             # 任务进度跟踪
│   │   ├── providers.py            # 语音供应商接口规范
│   │   └── ssml_builder.py         # SSML 标签构建引擎
│   ├── utils/                      # 工具库
│   │   └── retry.py                # 接口重试与容错机制
│   ├── cache/                      # 角色音色配置与缓存
│   │   └── characters.json         # 角色-音色映射表
│   ├── config.py                   # 全局配置管理
│   ├── main.py                     # 程序入口
│   └── schemas.py                  # Pydantic 数据契约与类型定义
├── sample_inputs/                  # 输入样例目录
│   └── demo_chapter.txt            # 测试小说文本
├── output/                         # 生成结果输出
│   ├── chunks/                     # 分片音频临时目录
│   ├── ssml/                       # 生成的 SSML 中间文件
│   └── extraction_manifest.json    # 结构化抽取元数据
├── tests/                          # 单元测试与流水线测试
├── .env.example                    # 环境变量模版
├── pyproject.toml                  # 项目依赖与配置
└── requirements.txt                # 运行依赖项

Visual interface
<img width="1280" height="594" alt="image" src="https://github.com/user-attachments/assets/1a6ea666-b88c-48f4-81cb-03a242b9b818" />
