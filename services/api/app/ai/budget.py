"""Bound paid work in one API process; deployment still needs shared quotas."""

from collections import deque
from contextlib import contextmanager
from math import ceil
from threading import Lock
from time import monotonic

from fastapi import HTTPException


class ModelBudget:
    def __init__(self, *, per_client=10, total=30, concurrent=2, window=60, clock=monotonic):
        self.per_client, self.total = per_client, total
        self.concurrent, self.window, self.clock = concurrent, window, clock
        self.events = deque()
        self.active = 0
        self.lock = Lock()

    @contextmanager
    def reserve(self, client):
        with self.lock:
            now = self.clock()
            while self.events and self.events[0][0] <= now - self.window:
                self.events.popleft()
            client_events = [time for time, identity in self.events if identity == client]
            if len(self.events) >= self.total or len(client_events) >= self.per_client:
                first = self.events[0][0] if len(self.events) >= self.total else client_events[0]
                raise HTTPException(429, detail={"code": "MODEL_RATE_LIMITED",
                    "message": "Scheme AI request limit reached. Wait before retrying."},
                    headers={"Retry-After": str(max(1, ceil(first + self.window - now)))})
            if self.active >= self.concurrent:
                raise HTTPException(429, detail={"code": "MODEL_BUSY",
                    "message": "Scheme AI is busy. Please retry shortly."}, headers={"Retry-After": "1"})
            # Only accepted work consumes a rate slot. Failures also count: an
            # unsuccessful provider response can still incur external cost.
            self.events.append((now, client))
            self.active += 1
        try:
            yield
        finally:
            with self.lock:
                self.active -= 1
