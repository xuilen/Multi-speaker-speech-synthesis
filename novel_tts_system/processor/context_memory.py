"""Carry-over extraction memory for chunk-boundary coherence."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field

from novel_tts_system.schemas import DialogueSegment, ExtractionResult, NovelChunk


@dataclass(slots=True)
class ExtractionMemory:
    """Track recent text and speaker turns across chunk boundaries."""

    max_text_chars: int = 300
    max_turns: int = 12
    recent_text: str = ""
    speaker_turns: deque[tuple[str, str]] = field(default_factory=deque)

    @property
    def last_speaker(self) -> str | None:
        """Return the last explicit non-narrator speaker."""

        for speaker, _ in reversed(self.speaker_turns):
            if speaker != "旁白" and speaker != "未知角色":
                return speaker
        return None

    def prompt_context(self, prefix_context: str = "") -> str:
        """Build compact context text for LLM prompts."""

        parts: list[str] = []
        context = f"{prefix_context}{self.recent_text}"[-self.max_text_chars :]
        if context:
            parts.append(f"recent_text:\n{context}")
        if self.speaker_turns:
            turns = [f"{speaker}: {text}" for speaker, text in self.speaker_turns]
            parts.append("recent_speaker_turns:\n" + "\n".join(turns))
        if self.last_speaker:
            parts.append(f"last_explicit_speaker: {self.last_speaker}")
        return "\n\n".join(parts)

    def left_context_for(self, target_text: str, quote_start: int, local_window_chars: int = 180) -> str:
        """Return left context for heuristic extraction at a target offset."""

        local_context = target_text[max(0, quote_start - local_window_chars) : quote_start]
        return f"{self.recent_text[-self.max_text_chars:]}\n{local_context}"

    def update(self, chunk: NovelChunk, result: ExtractionResult) -> None:
        """Update memory after a chunk has been extracted."""

        self.recent_text = f"{self.recent_text}{chunk.target_text}"[-self.max_text_chars :]
        for segment in result.segments:
            self._remember_segment(segment)

    def _remember_segment(self, segment: DialogueSegment) -> None:
        if segment.type != "dialogue" or segment.speaker in {"旁白", "未知角色"}:
            return
        self.speaker_turns.append((segment.speaker, segment.text[:80]))
        while len(self.speaker_turns) > self.max_turns:
            self.speaker_turns.popleft()
