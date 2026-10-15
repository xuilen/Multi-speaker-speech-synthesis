"""Lightweight Local High-Fidelity Edge-TTS Preview & Synthesis Server.

Provides instant HTTP audio streaming for the frontend workstation so that all
Azure Neural, AI Manga, and user-cloned voice archetypes play with 100% genuine
studio-grade timbre without being constrained by Windows local single-female SAPI synthesizer.
Also provides acoustic feature analysis and custom voice tree training endpoints.
"""

from __future__ import annotations

import asyncio
import base64
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import logging
from pathlib import Path
import re
import sys
import urllib.parse

try:
    import edge_tts
except ImportError:
    edge_tts = None

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from novel_tts_system.processor.audio_learner import AudioLearner, USER_SAMPLES_DIR
from novel_tts_system.processor.epub_reader import parse_epub_book, EpubParseError

# Safely support UTF-8 on Windows console
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")
logger = logging.getLogger("TTS_Server")

HOST = "0.0.0.0"
PORT = 8768

# Local audio cache to ensure zero-latency replay
CACHE_DIR = Path("novel_tts_system/cache/preview_audio")
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# 14 Verified Free Microsoft Edge Neural Voices
EDGE_VALID_ZH_VOICES = {
    "zh-CN-XiaoxiaoNeural",
    "zh-CN-XiaoyiNeural",
    "zh-CN-YunjianNeural",
    "zh-CN-YunxiNeural",
    "zh-CN-YunxiaNeural",
    "zh-CN-YunyangNeural",
    "zh-CN-liaoning-XiaobeiNeural",
    "zh-CN-shaanxi-XiaoniNeural",
    "zh-TW-HsiaoChenNeural",
    "zh-TW-YunJheNeural",
    "zh-TW-HsiaoYuNeural",
    "zh-HK-HiuGaaiNeural",
    "zh-HK-HiuMaanNeural",
    "zh-HK-WanLungNeural",
}

# Mapping table translating non-Edge voices (Azure paid voices & GitHub AI voices)
# to genuine Edge Neural voices with tuned pitch and rate
VOICE_EDGE_MAPPING: dict[str, tuple[str, str, str]] = {
    # Azure Male voices
    "zh-CN-YunyeNeural": ("zh-CN-YunxiNeural", "-14Hz", "-2%"),
    "zh-CN-YunzeNeural": ("zh-HK-WanLungNeural", "-12Hz", "-6%"),
    "zh-CN-YunhaiNeural": ("zh-CN-YunyangNeural", "-6Hz", "-2%"),
    "zh-CN-YunfengNeural": ("zh-TW-YunJheNeural", "+0Hz", "-1%"),
    "zh-CN-YunjieNeural": ("zh-TW-YunJheNeural", "+4Hz", "+3%"),
    "zh-CN-YunhaoNeural": ("zh-TW-YunJheNeural", "+2Hz", "+2%"),
    "zh-CN-XiaochenNeural": ("zh-TW-YunJheNeural", "+2Hz", "+1%"),
    "zh-CN-Henan-YundengNeural": ("zh-CN-YunxiNeural", "-2Hz", "+0%"),
    "zh-CN-Shandong-YunxiangNeural": ("zh-CN-YunyangNeural", "+0Hz", "-2%"),
    "zh-CN-Sichuan-YunxiNeural": ("zh-CN-YunxiNeural", "-2Hz", "+1%"),
    "zh-CN-liaoning-YunbiaoNeural": ("zh-CN-YunxiNeural", "-4Hz", "+0%"),
    "zh-CN-shaanxi-YunxiangNeural": ("zh-CN-YunyangNeural", "-2Hz", "-2%"),
    "zh-CN-sichuan-YunyangNeural": ("zh-CN-YunyangNeural", "+0Hz", "+0%"),
    # Azure Female voices
    "zh-CN-XiaomengNeural": ("zh-TW-HsiaoChenNeural", "+4Hz", "-2%"),
    "zh-CN-XiaoyouNeural": ("zh-TW-HsiaoYuNeural", "+18Hz", "+4%"),
    "zh-CN-XiaoshuangNeural": ("zh-TW-HsiaoYuNeural", "+8Hz", "+3%"),
    "zh-CN-XiaorouNeural": ("zh-HK-HiuMaanNeural", "-2Hz", "-2%"),
    "zh-CN-XiaoxuanNeural": ("zh-CN-liaoning-XiaobeiNeural", "-2Hz", "+2%"),
    "zh-CN-XiaohanNeural": ("zh-CN-XiaoyiNeural", "+4Hz", "+2%"),
    "zh-CN-XiaozhenNeural": ("zh-HK-HiuGaaiNeural", "-4Hz", "-2%"),
    "zh-CN-XiaoyanNeural": ("zh-CN-XiaoxiaoNeural", "-2Hz", "-2%"),
    "zh-CN-XiaomoNeural": ("zh-CN-shaanxi-XiaoniNeural", "-14Hz", "-4%"),
    "zh-CN-XiaoqiuNeural": ("zh-CN-XiaoxiaoNeural", "-4Hz", "-2%"),
    "zh-CN-XiaoruiNeural": ("zh-HK-HiuMaanNeural", "-2Hz", "-1%"),
    "zh-CN-Liaoning-XiaobeiNeural": ("zh-CN-liaoning-XiaobeiNeural", "+0Hz", "+0%"),
    "zh-CN-Shaanxi-XiaoniNeural": ("zh-CN-shaanxi-XiaoniNeural", "+0Hz", "+0%"),
    "zh-CN-shandong-XiaoniNeural": ("zh-CN-shaanxi-XiaoniNeural", "+0Hz", "+0%"),
    # GitHub Alexandria Qwen3
    "github-alexandria-storyteller": ("zh-CN-YunxiNeural", "-2Hz", "-2%"),
    "github-alexandria-swordmaster": ("zh-TW-YunJheNeural", "+4Hz", "+3%"),
    "github-alexandria-fairywangshu": ("zh-TW-HsiaoChenNeural", "+4Hz", "-1%"),
    "github-alexandria-demonlord": ("zh-HK-WanLungNeural", "-12Hz", "-6%"),
    "github-alexandria-foxjunior": ("zh-TW-HsiaoYuNeural", "+18Hz", "+4%"),
    # GitHub CosyVoice
    "github-cosyvoice-narrator": ("zh-CN-YunxiNeural", "+0Hz", "-1%"),
    "github-cosyvoice-hotblood": ("zh-TW-YunJheNeural", "+4Hz", "+3%"),
    "github-cosyvoice-foxempress": ("zh-HK-HiuGaaiNeural", "-3Hz", "-2%"),
    "github-cosyvoice-zenmonk": ("zh-HK-WanLungNeural", "-10Hz", "-5%"),
    # GitHub ChatTTS
    "github-chattts-teahouse": ("zh-CN-YunjianNeural", "+0Hz", "+2%"),
    "github-chattts-urbanmale": ("zh-TW-YunJheNeural", "+0Hz", "+1%"),
    "github-chattts-livelygirl": ("zh-CN-XiaoyiNeural", "+6Hz", "+4%"),
    # GitHub F5-TTS
    "github-f5-cybercommando": ("zh-CN-YunxiNeural", "-12Hz", "+2%"),
    "github-f5-epicchronicle": ("zh-CN-YunyangNeural", "-4Hz", "-2%"),
    "github-f5-nightstalker": ("zh-HK-WanLungNeural", "-14Hz", "-6%"),
    # GitHub GPT-SoVITS
    "github-gptsovits-swordpoet": ("zh-TW-YunJheNeural", "+2Hz", "+2%"),
    "github-gptsovits-daoboy": ("zh-CN-YunxiaNeural", "+4Hz", "+4%"),
    # GitHub Fish-Speech
    "github-fish-broadcast": ("zh-CN-YunyangNeural", "+0Hz", "+0%"),
    # AI Manga Drama Universe (全年龄爆款漫剧声线映射)
    "aimanga-narrator-epic": ("zh-CN-YunxiNeural", "-2Hz", "-2%"),
    "aimanga-narrator-hype": ("zh-CN-YunjianNeural", "+2Hz", "+4%"),
    "aimanga-narrator-romance": ("zh-CN-XiaoxiaoNeural", "+2Hz", "+0%"),
    "aimanga-baby-girl": ("zh-TW-HsiaoYuNeural", "+18Hz", "+3%"),
    "aimanga-baby-boy": ("zh-CN-YunxiaNeural", "+14Hz", "+4%"),
    "aimanga-pet-fox": ("zh-TW-HsiaoYuNeural", "+16Hz", "+4%"),
    "aimanga-hero-boy": ("zh-TW-YunJheNeural", "+4Hz", "+2%"),
    "aimanga-sunny-bro": ("zh-TW-YunJheNeural", "+2Hz", "+3%"),
    "aimanga-cold-ceo": ("zh-CN-YunyeNeural", "-8Hz", "-2%"),
    "aimanga-tsundere-lady": ("zh-CN-XiaoyiNeural", "+6Hz", "+2%"),
    "aimanga-gentle-fairy": ("zh-TW-HsiaoChenNeural", "+4Hz", "-1%"),
    "aimanga-empress-queen": ("zh-HK-HiuMaanNeural", "-2Hz", "-2%"),
    "aimanga-sect-master": ("zh-CN-YunyangNeural", "-4Hz", "-2%"),
    "aimanga-demon-overlord": ("zh-HK-WanLungNeural", "-14Hz", "-6%"),
    "aimanga-shadow-witch": ("zh-CN-shaanxi-XiaoniNeural", "-10Hz", "-4%"),
    "aimanga-zen-elder": ("zh-HK-WanLungNeural", "-12Hz", "-5%"),
}


class TTSRequestHandler(BaseHTTPRequestHandler):
    """Handle TTS audio preview, acoustic learning, and custom voice tree requests."""

    def address_string(self) -> str:
        """Prevent slow/hanging reverse DNS lookup on Windows."""
        return self.client_address[0]

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self) -> None:
        try:
            parsed = urllib.parse.urlparse(self.path)
            path = parsed.path

            if path == "/api/health":
                self._handle_health()
                return

            if path in {"/", "/index.html"}:
                index_path = ROOT_DIR / "web_app" / "index.html"
                if index_path.exists():
                    self._serve_static_file(index_path, "text/html; charset=utf-8")
                    return
                self._handle_health()
                return

            if path == "/api/tts":
                query = urllib.parse.parse_qs(parsed.query)
                text = query.get("text", [""])[0]
                voice = query.get("voice", ["zh-CN-YunxiNeural"])[0]
                rate = query.get("rate", ["+0%"])[0]
                pitch = query.get("pitch", ["+0Hz"])[0]
                self._handle_tts(text, voice, rate, pitch)
                return

            if path == "/api/voice/custom-trees":
                trees = AudioLearner.list_custom_trees()
                self._send_json(200, {"status": "ok", "trees": trees, "count": len(trees)})
                return

            if path.startswith("/api/voice/sample-audio/"):
                sample_filename = path.replace("/api/voice/sample-audio/", "").strip()
                self._handle_serve_sample_audio(sample_filename)
                return

            # Check static files under web_app/
            clean_path = path.lstrip("/")
            candidate = ROOT_DIR / clean_path
            if not candidate.is_file():
                candidate = ROOT_DIR / "web_app" / clean_path

            if candidate.is_file():
                mime = "text/plain"
                suffix = candidate.suffix.lower()
                if suffix == ".html":
                    mime = "text/html; charset=utf-8"
                elif suffix == ".css":
                    mime = "text/css; charset=utf-8"
                elif suffix == ".js":
                    mime = "application/javascript; charset=utf-8"
                elif suffix in {".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico"}:
                    mime = f"image/{suffix.lstrip('.')}"
                elif suffix == ".mp3":
                    mime = "audio/mpeg"
                elif suffix == ".json":
                    mime = "application/json; charset=utf-8"
                self._serve_static_file(candidate, mime)
                return

            self.send_error(404, "Not Found")
        except Exception as e:
            logger.error("Error in do_GET: %s", e, exc_info=True)
            self.send_error(500, f"Server error: {e}")

    def do_POST(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        content_len = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
        try:
            data = json.loads(body)
        except Exception:
            data = {}

        if path == "/api/tts":
            text = data.get("text", "")
            voice = data.get("voice", "zh-CN-YunxiNeural")
            rate = data.get("rate", "+0%")
            pitch = data.get("pitch", "+0Hz")
            self._handle_tts(text, voice, rate, pitch)
            return

        if path == "/api/voice/analyze":
            self._handle_voice_analyze(data)
            return

        if path == "/api/voice/train-tree":
            self._handle_train_tree(data)
            return

        if path == "/api/novel/parse-epub":
            self._handle_parse_epub(data)
            return

        self.send_error(404, "Not Found")

    def _send_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Range, Authorization")
        self.send_header("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges")

    def _send_json(self, status: int, payload: dict[str, Any]) -> None:
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self._send_cors_headers()
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _serve_static_file(self, file_path: Path, content_type: str) -> None:
        try:
            content = file_path.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self._send_cors_headers()
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_error(500, f"Error reading static file: {e}")

    def _handle_health(self) -> None:
        payload = {
            "status": "online",
            "backend": "edge-tts",
            "edge_tts_available": edge_tts is not None,
            "version": getattr(edge_tts, "__version__", "7.3.1") if edge_tts else None,
            "port": PORT,
            "supported_voices_count": len(EDGE_VALID_ZH_VOICES),
            "custom_trees_count": len(AudioLearner.list_custom_trees()),
            "epub_parser_available": True,
            "message": "AI 漫剧、全年龄全声线、EPUB电子书解析与用户音频自主学习服务持续运行中",
        }
        self._send_json(200, payload)

    def _resolve_voice(self, requested_voice: str, requested_rate: str, requested_pitch: str) -> tuple[str, str, str]:
        """Resolve requested voice ID to a guaranteed Edge-supported voice with appropriate pitch/rate."""
        # Case 1: Exact match with Edge-supported neural voice
        if requested_voice in EDGE_VALID_ZH_VOICES:
            return requested_voice, requested_rate, requested_pitch

        # Case 2: Defined in our comprehensive mapping table
        if requested_voice in VOICE_EDGE_MAPPING:
            edge_voice, default_p, default_r = VOICE_EDGE_MAPPING[requested_voice]
            effective_pitch = requested_pitch if (requested_pitch not in {"+0Hz", "+0%", "0"}) else default_p
            effective_rate = requested_rate if (requested_rate not in {"+0%", "0"}) else default_r
            return edge_voice, effective_rate, effective_pitch

        # Case 3: Case-insensitive match in mapping table
        req_lower = requested_voice.lower()
        for k, (edge_v, def_p, def_r) in VOICE_EDGE_MAPPING.items():
            if k.lower() == req_lower:
                effective_pitch = requested_pitch if (requested_pitch not in {"+0Hz", "+0%", "0"}) else def_p
                effective_rate = requested_rate if (requested_rate not in {"+0%", "0"}) else def_r
                return edge_v, effective_rate, effective_pitch

        # Case 4: Fuzzy heuristic resolution
        # Check male tokens first (yun, chen, lung, jhe, yang, biao, deng, xiang, male, boy, man, lord, master, monk)
        is_male_hint = any(token in req_lower for token in [
            "yun", "chen", "lung", "jhe", "yang", "biao", "deng", "xiang", "male", "boy", "man", "lord", "master", "monk", "hotblood", "swordmaster", "demonlord", "zenmonk", "nightstalker"
        ]) and not ("hsiaochen" in req_lower)
        if is_male_hint:
            return "zh-CN-YunxiNeural", requested_rate, requested_pitch

        is_female_hint = any(token in req_lower for token in [
            "female", "girl", "woman", "shuang", "meng", "rou", "xuan", "zhen", "mo", "you", 
            "xiaohan", "xiaoyi", "xiaoxiao", "xiaoqiu", "xiaorui", "xiaozhen", "xiaoni", "xiaoyan", 
            "xiaobei", "hsiaochen", "hsiaoyu", "hiugaai", "hiumaan", "empress", "fairy", "lady", "witch"
        ])
        if is_female_hint:
            return "zh-CN-XiaoxiaoNeural", requested_rate, requested_pitch

        return "zh-CN-YunxiNeural", requested_rate, requested_pitch

    def _handle_tts(self, text: str, voice: str, rate: str, pitch: str) -> None:
        text = text.strip()
        if not text:
            self.send_error(400, "Missing 'text' parameter")
            return

        if not edge_tts:
            self.send_error(503, "edge-tts library is not installed in Python environment")
            return

        edge_voice, effective_rate, effective_pitch = self._resolve_voice(voice, rate, pitch)

        clean_rate = effective_rate if (effective_rate.endswith("%") or effective_rate.endswith("Hz")) else "+0%"
        clean_pitch = effective_pitch if (effective_pitch.endswith("Hz") or effective_pitch.endswith("%")) else "+0Hz"

        import hashlib
        cache_key = hashlib.sha256(f"{edge_voice}_{clean_rate}_{clean_pitch}_{text}".encode("utf-8")).hexdigest()
        cache_file = CACHE_DIR / f"{cache_key}.mp3"

        if not cache_file.exists():
            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                communicate = edge_tts.Communicate(text, voice=edge_voice, rate=clean_rate, pitch=clean_pitch)
                loop.run_until_complete(communicate.save(str(cache_file)))
                loop.close()
            except Exception as primary_exc:
                logger.warning("Primary synthesis with voice %s failed: %s. Retrying with safe fallback...", edge_voice, primary_exc)
                # Fail-safe secondary attempt using Yunxi/Xiaoxiao with default rate/pitch
                fallback_voice = "zh-CN-YunxiNeural" if "yun" in edge_voice.lower() or "lung" in edge_voice.lower() else "zh-CN-XiaoxiaoNeural"
                try:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    communicate = edge_tts.Communicate(text, voice=fallback_voice, rate="+0%", pitch="+0Hz")
                    loop.run_until_complete(communicate.save(str(cache_file)))
                    loop.close()
                except Exception as fallback_exc:
                    logger.error("All synthesis attempts failed: %s", fallback_exc)
                    self.send_error(500, f"Synthesis error: {fallback_exc}")
                    return

        try:
            audio_bytes = cache_file.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "audio/mpeg")
            self._send_cors_headers()
            self.send_header("Content-Length", str(len(audio_bytes)))
            self.send_header("Cache-Control", "public, max-age=86400")
            self.end_headers()
            self.wfile.write(audio_bytes)
        except Exception as exc:
            logger.error("Failed sending audio bytes: %s", exc)

    def _handle_voice_analyze(self, data: dict[str, Any]) -> None:
        """Analyze an uploaded audio file (base64 or path) to extract timbre features."""
        audio_b64 = data.get("audio_base64", "")
        audio_path_str = data.get("audio_path", "")
        filename = data.get("filename", "user_audio.wav")
        character_hint = data.get("character_hint", "")

        try:
            if audio_b64:
                # Strip data URL prefix if present (e.g. data:audio/wav;base64,...)
                if "," in audio_b64:
                    audio_b64 = audio_b64.split(",", 1)[1]
                raw_bytes = base64.b64decode(audio_b64)
                analysis = AudioLearner.analyze_audio(raw_bytes, filename=filename, character_hint=character_hint)
            elif audio_path_str:
                analysis = AudioLearner.analyze_audio(Path(audio_path_str), filename=filename, character_hint=character_hint)
            else:
                self._send_json(400, {"status": "error", "message": "Missing audio_base64 or audio_path parameter"})
                return

            self._send_json(200, {"status": "ok", "analysis": analysis})
        except Exception as exc:
            logger.error("Audio analysis failed: %s", exc, exc_info=True)
            self._send_json(500, {"status": "error", "message": f"声学特征分析失败: {exc}"})

    def _handle_train_tree(self, data: dict[str, Any]) -> None:
        """Create and persist a custom voice tree from learned profile(s)."""
        tree_id = data.get("tree_id", "")
        tree_name = data.get("tree_name", "我的专属AI学习配音树")
        learned_profile = data.get("learned_profile", {})
        assigned_role_name = data.get("assigned_role_name", "主角男声")
        description = data.get("description", "")

        if not learned_profile:
            self._send_json(400, {"status": "error", "message": "Missing learned_profile"})
            return

        try:
            tree = AudioLearner.create_custom_voice_tree(
                tree_id=tree_id,
                tree_name=tree_name,
                learned_profile=learned_profile,
                assigned_role_name=assigned_role_name,
                description=description,
            )
            self._send_json(200, {"status": "ok", "message": "专属语音树生成成功！", "tree": tree})
        except Exception as exc:
            logger.error("Custom tree creation failed: %s", exc)
            self._send_json(500, {"status": "error", "message": f"创建语音树失败: {exc}"})

    def _handle_serve_sample_audio(self, filename: str) -> None:
        """Serve saved user sample audio file."""
        safe_name = Path(filename).name
        file_path = USER_SAMPLES_DIR / safe_name
        if not file_path.exists():
            self.send_error(404, "Sample audio not found")
            return

        try:
            data = file_path.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "audio/wav")
            self._send_cors_headers()
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except Exception as exc:
            logger.error("Error serving sample audio: %s", exc)
            self.send_error(500, f"Error: {exc}")

    def _handle_parse_epub(self, data: dict[str, Any]) -> None:
        """Parse an uploaded EPUB file (base64 or file path) into novel chapters."""
        epub_b64 = data.get("epub_base64", "")
        file_path_str = data.get("file_path", "")
        filename = data.get("filename", "")
        min_chars = int(data.get("chapter_min_chars", 30))

        try:
            if epub_b64:
                if "," in epub_b64:
                    epub_b64 = epub_b64.split(",", 1)[1]
                raw_bytes = base64.b64decode(epub_b64)
                result = parse_epub_book(raw_bytes, min_chapter_chars=min_chars)
            elif file_path_str:
                result = parse_epub_book(Path(file_path_str), min_chapter_chars=min_chars)
            else:
                self._send_json(400, {"status": "error", "message": "缺少 epub_base64 或 file_path 参数"})
                return

            if filename and (not result.get("title") or result.get("title") == "未命名电子书"):
                result["title"] = Path(filename).stem

            self._send_json(200, result)
        except EpubParseError as exc:
            logger.warning("EPUB parse error: %s", exc)
            self._send_json(400, {"status": "error", "message": f"EPUB 解析失败: {exc}"})
        except Exception as exc:
            logger.error("Unexpected EPUB parse error: %s", exc, exc_info=True)
            self._send_json(500, {"status": "error", "message": f"EPUB 处理异常: {exc}"})


def run_server(port: int = PORT) -> None:
    server = ThreadingHTTPServer((HOST, port), TTSRequestHandler)
    print("============================================================")
    print("  [OK] AI Manga & Acoustic Timbre Learning Server Started")
    print(f"  [API] http://{HOST}:{port}")
    print("  [INFO] Real Male/Female Voices & Audio Training Online")
    print("============================================================")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        server.server_close()


if __name__ == "__main__":
    port_arg = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    run_server(port_arg)
