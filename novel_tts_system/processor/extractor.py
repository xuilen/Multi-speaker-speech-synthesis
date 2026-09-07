"""LLM-based semantic dialogue extraction with a deterministic fallback."""

from __future__ import annotations

import json
import re
from typing import Any

from novel_tts_system.config import AppConfig
from novel_tts_system.processor.context_memory import ExtractionMemory
from novel_tts_system.schemas import CharacterMetadata, DialogueSegment, ExtractionResult, NovelChunk
from novel_tts_system.utils.retry import SyncRateLimiter, SyncRetryPolicy


SYSTEM_PROMPT = """你是一个专业中文有声书剧本编辑器。请只处理 target_text，prefix_context 和 carry_over_context 只能用于判断说话人、指代关系和语境。
输出必须是 JSON，结构为：
{
  "chunk_index": number,
  "segments": [
    {
      "index": number,
      "speaker": "角色名或旁白",
      "type": "narration 或 dialogue",
      "text": "纯朗读文本，不要包含引号",
      "emotion": "Azure Speech style，例如 angry, cheerful, sad, fearful, serious, narration-relaxed",
      "style_degree": 0.5 到 2.0,
      "rate_offset": "+0%",
      "pitch_offset": "+0%"
    }
  ],
  "characters": [
    {
      "name": "角色名",
      "gender": "male/female/unknown",
      "age_group": "child/young/adult/elder/unknown",
      "role": "protagonist/supporting/villain/narrator/unknown",
      "traits": ["简短性格或身份线索"]
    }
  ],
  "warnings": []
}
要求：
1. 保持 target_text 的原始顺序，旁白和对白都要覆盖。
2. 对白去掉外层引号，旁白 speaker 固定为“旁白”。
3. 不要把 prefix_context 或 carry_over_context 的文字加入 segments。
4. 情绪要克制，无法判断时用 serious 或 narration-relaxed。
5. rate_offset 和 pitch_offset 必须是百分比字符串，例如 "+0%"、"-5%"。
6. 遇到“他/她/那人”等指代时，优先参考 recent_speaker_turns 和 last_explicit_speaker，避免跨块误判。
"""


class LLMExtractor:
    """Extract narration/dialogue segments using an OpenAI-compatible LLM."""

    def __init__(self, config: AppConfig, force_heuristic: bool = False) -> None:
        self.config = config
        self.force_heuristic = force_heuristic
        self._client: Any | None = None
        self._retry_policy = SyncRetryPolicy(
            max_attempts=max(1, config.llm_max_retries + 1),
            base_delay=config.llm_retry_base_delay,
            max_delay=config.llm_retry_max_delay,
        )
        self._rate_limiter = SyncRateLimiter(config.llm_rate_limit_per_minute)

    def extract_chunk(self, chunk: NovelChunk, memory: ExtractionMemory | None = None) -> ExtractionResult:
        """Extract structured audio segments for one chunk."""

        if self.force_heuristic or not self.config.has_llm_credentials:
            return self._heuristic_extract(
                chunk,
                memory=memory,
                warning="LLM credentials missing or heuristic mode enabled.",
            )

        try:
            self._rate_limiter.wait()
            return self._retry_policy.run(lambda: self._extract_with_llm(chunk, memory))
        except Exception as exc:
            if not self.config.fallback_to_heuristic:
                raise
            return self._heuristic_extract(
                chunk,
                memory=memory,
                warning=f"LLM extraction failed; used heuristic fallback: {exc}",
            )

    def extract_many(self, chunks: list[NovelChunk]) -> list[ExtractionResult]:
        """Extract segments for multiple chunks sequentially."""

        memory = ExtractionMemory(max_text_chars=self.config.carry_context_chars)
        results: list[ExtractionResult] = []
        for chunk in chunks:
            result = self.extract_chunk(chunk, memory=memory)
            results.append(result)
            memory.update(chunk, result)
        return results

    def _extract_with_llm(self, chunk: NovelChunk, memory: ExtractionMemory | None) -> ExtractionResult:
        client = self._get_client()
        carry_context = memory.prompt_context(chunk.prefix_context) if memory else chunk.prefix_context
        user_prompt = (
            f"chunk_index: {chunk.index}\n\n"
            f"prefix_context:\n{chunk.prefix_context}\n\n"
            f"carry_over_context:\n{carry_context}\n\n"
            f"target_text:\n{chunk.target_text}\n"
        )
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

        parsed = self._try_parse_api(client, messages)
        if parsed is not None:
            return parsed

        response = self._create_json_completion(client, messages)
        content = response.choices[0].message.content
        return self._parse_json_content(content or "", chunk.index)

    def _create_json_completion(self, client: Any, messages: list[dict[str, str]]) -> Any:
        """Create a chat completion, falling back when JSON mode is unsupported."""

        try:
            return client.chat.completions.create(
                model=self.config.llm_model,
                messages=messages,
                temperature=self.config.llm_temperature,
                response_format={"type": "json_object"},
            )
        except Exception:
            strict_messages = [
                *messages,
                {
                    "role": "user",
                    "content": "请再次确认：只输出一个 JSON 对象，不要 Markdown，不要解释。",
                },
            ]
            return client.chat.completions.create(
                model=self.config.llm_model,
                messages=strict_messages,
                temperature=self.config.llm_temperature,
            )

    def _try_parse_api(self, client: Any, messages: list[dict[str, str]]) -> ExtractionResult | None:
        try:
            completion = client.beta.chat.completions.parse(
                model=self.config.llm_model,
                messages=messages,
                temperature=self.config.llm_temperature,
                response_format=ExtractionResult,
            )
        except Exception:
            return None

        parsed = completion.choices[0].message.parsed
        if isinstance(parsed, ExtractionResult):
            return parsed
        if parsed is not None:
            return ExtractionResult.model_validate(parsed)
        return None

    def _get_client(self) -> Any:
        if self._client is not None:
            return self._client

        try:
            from openai import OpenAI
        except ImportError as exc:
            raise RuntimeError("Install the openai package or enable --force-heuristic.") from exc

        kwargs: dict[str, Any] = {
            "api_key": self.config.llm_api_key,
            "max_retries": self.config.llm_max_retries,
        }
        if self.config.llm_base_url:
            kwargs["base_url"] = self.config.llm_base_url
        self._client = OpenAI(**kwargs)
        return self._client

    def _parse_json_content(self, content: str, chunk_index: int) -> ExtractionResult:
        try:
            payload = json.loads(content)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", content, flags=re.DOTALL)
            if not match:
                raise
            payload = json.loads(match.group(0))

        payload.setdefault("chunk_index", chunk_index)
        result = ExtractionResult.model_validate(payload)
        if result.chunk_index != chunk_index:
            result.chunk_index = chunk_index
        if not result.segments:
            raise ValueError("LLM returned no synthesis segments.")
        return result

    def _heuristic_extract(
        self,
        chunk: NovelChunk,
        warning: str,
        memory: ExtractionMemory | None = None,
    ) -> ExtractionResult:
        segments: list[DialogueSegment] = []
        characters: dict[str, CharacterMetadata] = {}
        text = chunk.target_text
        cursor = 0
        last_speaker: str | None = memory.last_speaker if memory else None

        for match in re.finditer(r"“([^”]+)”", text):
            if match.start() > cursor:
                narration = text[cursor : match.start()].strip()
                if narration:
                    segments.append(
                        DialogueSegment(
                            index=len(segments),
                            speaker="旁白",
                            type="narration",
                            text=narration,
                            emotion="narration-relaxed",
                            style_degree=1.0,
                        )
                    )

            dialogue = match.group(1).strip()
            left_context = (
                memory.left_context_for(text, match.start())
                if memory
                else text[max(0, match.start() - 180) : match.start()]
            )
            right_context = text[match.end() : match.end() + 60]
            speaker = self._guess_speaker(left_context, right_context, last_speaker)
            emotion = self._guess_emotion(dialogue, text[max(0, match.start() - 25) : match.end() + 25])
            if speaker != "未知角色":
                characters.setdefault(speaker, self._guess_character_metadata(speaker, text))
                last_speaker = speaker
            segments.append(
                DialogueSegment(
                    index=len(segments),
                    speaker=speaker,
                    type="dialogue",
                    text=dialogue,
                    emotion=emotion,
                    style_degree=1.1 if emotion != "serious" else 1.0,
                    rate_offset="+0%",
                    pitch_offset="+0%",
                )
            )
            cursor = match.end()

        if cursor < len(text):
            narration = text[cursor:].strip()
            if narration:
                segments.append(
                    DialogueSegment(
                        index=len(segments),
                        speaker="旁白",
                        type="narration",
                        text=narration,
                        emotion="narration-relaxed",
                    )
                )

        if not segments and text.strip():
            segments.append(
                DialogueSegment(
                    index=0,
                    speaker="旁白",
                    type="narration",
                    text=text.strip(),
                    emotion="narration-relaxed",
                )
            )

        return ExtractionResult(
            chunk_index=chunk.index,
            segments=segments,
            characters=list(characters.values()),
            warnings=[warning],
        )

    @staticmethod
    def _guess_speaker(left_context: str, right_context: str, last_speaker: str | None = None) -> str:
        patterns = [
            r"([\u4e00-\u9fa5A-Za-z0-9_·]{1,12})(?:低声|轻声|冷冷|淡淡|忽然|忍不住)?(?:说|问|喊|叫|道|笑道|叹道|怒道|答道)$",
            r"^，?([\u4e00-\u9fa5A-Za-z0-9_·]{1,12})(?:说|问|喊|叫|道|笑道|叹道|怒道|答道)",
        ]
        left = re.sub(r"\s+", "", left_context)[-35:]
        right = re.sub(r"\s+", "", right_context)[:35]
        recent_name = LLMExtractor._recent_sentence_speaker(left_context)
        for pattern, context in ((patterns[0], left), (patterns[1], right)):
            match = re.search(pattern, context)
            if match:
                speaker = LLMExtractor._clean_speaker_name(match.group(1))
                if speaker in {"他", "她"}:
                    return recent_name or last_speaker or "未知角色"
                return speaker
        if recent_name and any(token in left_context for token in ("抬眼", "停住", "按住", "冷笑", "拄着", "走出", "站", "回头", "看向")):
            return recent_name
        return "未知角色"

    @staticmethod
    def _clean_speaker_name(name: str) -> str:
        cleaned = name.strip("，,。.!！？?：:；;“”' ")
        for suffix in ("低声", "轻声", "冷冷", "淡淡", "忽然", "忍不住", "急忙", "缓缓", "慢慢"):
            if cleaned.endswith(suffix):
                cleaned = cleaned[: -len(suffix)]
        return cleaned or "未知角色"

    @staticmethod
    def _recent_sentence_speaker(left_context: str) -> str | None:
        sentences = [part.strip() for part in re.split(r"[。！？!?]\s*", left_context) if part.strip()]
        if not sentences:
            return None
        for raw_sentence in reversed(sentences):
            sentence = raw_sentence.strip("“”\"' \n\t")
            match = re.match(
                r"^([\u4e00-\u9fa5]{2,5})(?:把|停|抬|望|站|回头|看向|没有|披|拄|走|冷笑|低|轻|沉|笑|问|说|道|喊|叫)",
                sentence,
            )
            if not match:
                continue
            candidate = match.group(1)
            if candidate in {"三年前", "年轻人", "巷子深处"}:
                continue
            if candidate.startswith(("他", "她")):
                continue
            return candidate
        return None

    @staticmethod
    def _guess_emotion(dialogue: str, context: str) -> str:
        combined = f"{context}{dialogue}"
        if any(token in combined for token in ("怒", "吼", "骂", "喝道", "愤")):
            return "angry"
        if any(token in combined for token in ("冷笑", "阴冷", "沙哑")):
            return "serious"
        if any(token in combined for token in ("笑", "喜", "开心", "太好了")):
            return "cheerful"
        if any(token in combined for token in ("哭", "泪", "哽咽", "悲")):
            return "sad"
        if any(token in combined for token in ("怕", "恐", "颤", "惊")):
            return "fearful"
        if "！" in dialogue or "!" in dialogue:
            return "excited"
        return "serious"

    @staticmethod
    def _guess_character_metadata(name: str, text: str) -> CharacterMetadata:
        window_match = re.search(rf".{{0,20}}{re.escape(name)}.{{0,20}}", text)
        window = window_match.group(0) if window_match else ""
        gender = "unknown"
        if any(token in window for token in ("她", "姑娘", "少女", "女子", "夫人")):
            gender = "female"
        elif any(token in window for token in ("他", "少年", "男子", "老者", "先生")) or "老者" in name:
            gender = "male"

        age_group = "unknown"
        if any(token in window for token in ("少年", "少女", "年轻")):
            age_group = "young"
        elif any(token in window for token in ("老者", "老人", "苍老")) or "老者" in name:
            age_group = "elder"

        role = "villain" if any(token in window for token in ("反派", "恶", "阴冷", "冷笑")) else "unknown"
        return CharacterMetadata(name=name, gender=gender, age_group=age_group, role=role)
