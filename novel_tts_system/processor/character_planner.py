"""Book-level character metadata prepass for stable voice assignment."""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass

from novel_tts_system.schemas import CharacterMetadata


_GENERIC_CANDIDATES = {
    "一个清冷",
    "年轻人",
    "三年前",
    "巷子深处",
    "这一刻",
    "那一瞬",
    "众人",
    "有人",
    "所有人",
}


@dataclass(slots=True)
class CharacterPlanner:
    """Infer likely recurring characters from an early-book text sample."""

    max_characters: int = 30

    def plan_from_text(self, text: str, max_chars: int = 30000) -> list[CharacterMetadata]:
        """Infer a stable initial character set from the first part of a book."""

        sample = text[:max_chars]
        counts: Counter[str] = Counter()
        for pattern in self._patterns():
            for match in re.finditer(pattern, sample):
                candidate = self._clean_name(match.group(1))
                if self._is_valid_candidate(candidate):
                    counts[candidate] += 1

        planned: list[CharacterMetadata] = []
        for name, _ in counts.most_common(self.max_characters):
            planned.append(self._metadata_for(name, sample))
        return planned

    @staticmethod
    def _patterns() -> tuple[str, ...]:
        return (
            r"([\u4e00-\u9fa5A-Za-z0-9_·]{2,8})(?:低声|轻声|冷冷|淡淡|沉声|忽然)?(?:说|问|喊|叫|道|笑道|叹道|怒道|答道)",
            r"([\u4e00-\u9fa5]{2,6})(?:把|将|向|对|望着|抬眼|皱眉|摇头|点头|冷笑|苦笑)",
            r"(?:少年|少女|姑娘|老者|夫人|先生|公子|师父|师兄|师姐)([\u4e00-\u9fa5]{1,4})",
            r"([\u4e00-\u9fa5]{1,4})(?:姑娘|公子|先生|夫人|老者|师兄|师姐)",
        )

    @staticmethod
    def _clean_name(name: str) -> str:
        cleaned = name.strip("，,。.!！？?：:；;“”' \n\t")
        for suffix in ("低声", "轻声", "冷冷", "淡淡", "忽然", "沉声", "缓缓"):
            if cleaned.endswith(suffix):
                cleaned = cleaned[: -len(suffix)]
        return cleaned

    @staticmethod
    def _is_valid_candidate(name: str) -> bool:
        if not name or name in _GENERIC_CANDIDATES:
            return False
        if len(name) < 2 or len(name) > 8:
            return False
        if name.startswith(("他", "她", "我", "你", "这", "那", "它")):
            return False
        return True

    def _metadata_for(self, name: str, sample: str) -> CharacterMetadata:
        windows = [
            match.group(0)
            for match in re.finditer(rf".{{0,30}}{re.escape(name)}.{{0,30}}", sample)
        ]
        context = " ".join(windows[:8])
        gender = "unknown"
        if any(token in context for token in ("她", "姑娘", "少女", "女子", "夫人", "师姐")):
            gender = "female"
        elif any(token in context for token in ("他", "少年", "男子", "老者", "先生", "公子", "师兄")):
            gender = "male"

        age_group = "unknown"
        if any(token in context for token in ("少年", "少女", "青年", "年轻")):
            age_group = "young"
        elif any(token in context for token in ("老者", "老人", "老妪", "苍老")) or "老者" in name:
            age_group = "elder"

        role = "villain" if any(token in context for token in ("反派", "阴冷", "恶", "冷笑", "杀意")) else "unknown"
        traits = [token for token in ("清冷", "沙哑", "温和", "阴冷", "急躁", "沉稳") if token in context]
        return CharacterMetadata(name=name, gender=gender, age_group=age_group, role=role, traits=traits[:4])
