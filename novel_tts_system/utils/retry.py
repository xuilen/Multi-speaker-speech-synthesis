"""Retry and rate-limit helpers for network-bound providers."""

from __future__ import annotations

import asyncio
import random
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import TypeVar

T = TypeVar("T")


@dataclass(slots=True)
class AsyncRetryPolicy:
    """Exponential backoff retry policy for async operations."""

    max_attempts: int = 4
    base_delay: float = 1.0
    max_delay: float = 30.0
    jitter: float = 0.2

    async def run(self, operation: Callable[[], Awaitable[T]]) -> T:
        """Run an async operation with exponential backoff."""

        attempts = max(1, self.max_attempts)
        last_error: BaseException | None = None
        for attempt in range(1, attempts + 1):
            try:
                return await operation()
            except Exception as exc:
                last_error = exc
                if attempt >= attempts:
                    break
                delay = min(self.max_delay, self.base_delay * (2 ** (attempt - 1)))
                if self.jitter > 0:
                    delay += random.uniform(0, delay * self.jitter)
                await asyncio.sleep(delay)

        assert last_error is not None
        raise last_error


@dataclass(slots=True)
class SyncRetryPolicy:
    """Exponential backoff retry policy for synchronous operations."""

    max_attempts: int = 3
    base_delay: float = 1.0
    max_delay: float = 20.0
    jitter: float = 0.2

    def run(self, operation: Callable[[], T]) -> T:
        """Run a sync operation with exponential backoff."""

        attempts = max(1, self.max_attempts)
        last_error: BaseException | None = None
        for attempt in range(1, attempts + 1):
            try:
                return operation()
            except Exception as exc:
                last_error = exc
                if attempt >= attempts:
                    break
                delay = min(self.max_delay, self.base_delay * (2 ** (attempt - 1)))
                if self.jitter > 0:
                    delay += random.uniform(0, delay * self.jitter)
                time.sleep(delay)

        assert last_error is not None
        raise last_error


class AsyncRateLimiter:
    """Simple coroutine-safe minimum-interval rate limiter."""

    def __init__(self, requests_per_minute: int = 0) -> None:
        self.requests_per_minute = max(0, requests_per_minute)
        self._lock = asyncio.Lock()
        self._next_allowed = 0.0

    async def wait(self) -> None:
        """Wait until the next request slot is available."""

        if self.requests_per_minute <= 0:
            return

        interval = 60.0 / self.requests_per_minute
        async with self._lock:
            loop = asyncio.get_running_loop()
            now = loop.time()
            if self._next_allowed > now:
                await asyncio.sleep(self._next_allowed - now)
                now = loop.time()
            self._next_allowed = max(now, self._next_allowed) + interval


class SyncRateLimiter:
    """Thread-local minimum-interval limiter for synchronous call loops."""

    def __init__(self, requests_per_minute: int = 0) -> None:
        self.requests_per_minute = max(0, requests_per_minute)
        self._next_allowed = 0.0

    def wait(self) -> None:
        """Wait until the next request slot is available."""

        if self.requests_per_minute <= 0:
            return

        interval = 60.0 / self.requests_per_minute
        now = time.monotonic()
        if self._next_allowed > now:
            time.sleep(self._next_allowed - now)
            now = time.monotonic()
        self._next_allowed = max(now, self._next_allowed) + interval
