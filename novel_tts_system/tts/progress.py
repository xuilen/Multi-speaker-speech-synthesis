"""Persistent generation progress manifest for resumable synthesis."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path


class ProgressManifest:
    """Track per-chunk synthesis state across interrupted runs."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._data: dict[str, object] = {"version": 1, "jobs": {}}
        self.load()

    def load(self) -> None:
        """Load manifest data if present."""

        if not self.path.exists():
            return
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return
        if isinstance(data, dict):
            self._data = data
            self._data.setdefault("version", 1)
            self._data.setdefault("jobs", {})

    def save(self) -> None:
        """Write the progress manifest atomically enough for local resumes."""

        tmp_path = self.path.with_suffix(f"{self.path.suffix}.tmp")
        tmp_path.write_text(json.dumps(self._data, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp_path.replace(self.path)

    def is_complete(self, job_key: str, payload_hash: str, output_path: Path) -> bool:
        """Return True when a completed matching job can be reused."""

        jobs = self._jobs()
        record = jobs.get(job_key)
        if not isinstance(record, dict):
            return False
        return (
            record.get("status") == "complete"
            and record.get("payload_hash") == payload_hash
            and Path(str(record.get("output_path", ""))) == output_path
            and output_path.exists()
            and output_path.stat().st_size > 0
        )

    def mark_started(self, job_key: str, payload_hash: str, output_path: Path, backend: str) -> None:
        """Mark a chunk as actively synthesizing."""

        self._jobs()[job_key] = {
            "status": "running",
            "backend": backend,
            "payload_hash": payload_hash,
            "output_path": str(output_path),
            "updated_at": self._now(),
        }
        self.save()

    def mark_complete(self, job_key: str, payload_hash: str, output_path: Path, backend: str) -> None:
        """Mark a chunk as complete."""

        self._jobs()[job_key] = {
            "status": "complete",
            "backend": backend,
            "payload_hash": payload_hash,
            "output_path": str(output_path),
            "bytes": output_path.stat().st_size if output_path.exists() else 0,
            "updated_at": self._now(),
        }
        self.save()

    def mark_failed(self, job_key: str, payload_hash: str, output_path: Path, backend: str, error: str) -> None:
        """Mark a chunk as failed while preserving resume metadata."""

        self._jobs()[job_key] = {
            "status": "failed",
            "backend": backend,
            "payload_hash": payload_hash,
            "output_path": str(output_path),
            "error": error,
            "updated_at": self._now(),
        }
        self.save()

    def _jobs(self) -> dict[str, object]:
        jobs = self._data.setdefault("jobs", {})
        if not isinstance(jobs, dict):
            jobs = {}
            self._data["jobs"] = jobs
        return jobs

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()
