from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Protocol
import hashlib
import json
import os
import time
import uuid

MAX_FILES = 100
MAX_FILE_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 40_000_000
MAX_COLLECTION_BYTES = 1024**3
MAX_COPY = 10_000
MODEL_NAME = "ViT-B-32"
MODEL_PRETRAINED = "openai"
POLICY_VERSION = "prism/local/1"


def identifier() -> str:
    return uuid.uuid4().hex


def fingerprint(value) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False,
                                    separators=(",", ":"), allow_nan=False).encode()).hexdigest()


def atomic_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + "." + identifier() + ".tmp")
    try:
        with temp.open("x", encoding="utf-8") as stream:
            json.dump(value, stream, ensure_ascii=False, allow_nan=False)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp, path)
    finally:
        temp.unlink(missing_ok=True)


class Problem(Exception):
    def __init__(self, code: str, message: str, status: int = 400):
        self.code, self.message, self.status = code, message, status
        super().__init__(message)


@dataclass(frozen=True)
class Settings:
    data: Path
    origin: str = "http://127.0.0.1:8000"
    secure_cookie: bool = False
    max_jobs: int = 20
    job_seconds: int = 600
    lease_seconds: int = 90
    tenant_units: int = 1_000_000
    global_units: int = 10_000_000

    @classmethod
    def environment(cls):
        return cls(Path(os.getenv("PRISM_DATA_DIR", ".prism")).resolve(),
                   os.getenv("PRISM_ORIGIN", "http://127.0.0.1:8000"),
                   os.getenv("PRISM_SECURE_COOKIE", "false").lower() == "true")


class Encoder(Protocol):
    manifest: dict
    def images(self, paths: list[str]) -> list[list[float]]: ...
    def texts(self, texts: list[str]) -> list[list[float]]: ...
    def close(self): ...


def timestamp() -> float:
    return time.time()
