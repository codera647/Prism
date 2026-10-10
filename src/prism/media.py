from io import BytesIO, StringIO
from pathlib import PureWindowsPath
import csv
import hashlib
import json
import shutil
import warnings
import os
import subprocess
import sys
import threading
from PIL import Image, ImageOps

from .domain import MAX_FILE_BYTES, MAX_PIXELS, MAX_COPY, Problem, identifier

Image.MAX_IMAGE_PIXELS = MAX_PIXELS
DECODER_SLOTS = threading.BoundedSemaphore(2)


def filename(value):
    if not value or len(value) > 240 or PureWindowsPath(value).name != value or "/" in value or "\\" in value or any(ord(c) < 32 for c in value):
        raise Problem("invalid_filename", "Use a simple filename without a folder path.")
    return value


def copy_manifest(raw, csv_text, names):
    if len(set(names)) != len(names):
        raise Problem("duplicate_names", "Duplicate filenames are ambiguous. Rename them before importing copy.")
    try:
        mapping = json.loads(raw) if raw else {}
    except (ValueError, TypeError):
        raise Problem("copy_mapping", "The copy mapping must be a JSON object.") from None
    if not isinstance(mapping, dict):
        raise Problem("copy_mapping", "The copy mapping must map filenames to text.")
    if csv_text:
        reader = csv.DictReader(StringIO(csv_text.lstrip("\ufeff"), newline=""))
        if not reader.fieldnames or set(reader.fieldnames) != {"filename", "copy"}:
            raise Problem("csv_columns", "CSV columns must be filename and copy.")
        for row in reader:
            name = row.get("filename")
            if name in mapping:
                raise Problem("copy_mapping", "A filename appears more than once in the copy mapping.")
            mapping[name] = row.get("copy")
    if not set(mapping) <= set(names):
        raise Problem("copy_mapping", "Some copy filenames do not match the uploaded images.")
    if any(not isinstance(v, str) or len(v) > MAX_COPY for v in mapping.values()):
        raise Problem("copy_limit", "Each copy record must be text with at most 10,000 characters.")
    return mapping


def stage_image(root, name, content, aid=None):
    filename(name)
    if not 0 < len(content) <= MAX_FILE_BYTES:
        raise Problem("file_size", "Each image must be nonempty and at most 10 MiB.")
    with warnings.catch_warnings():
        warnings.simplefilter("error", Image.DecompressionBombWarning)
        try:
            with Image.open(BytesIO(content)) as image:
                if image.format not in ("JPEG", "PNG", "WEBP") or getattr(image, "n_frames", 1) != 1:
                    raise Problem("image_format", "Use a static JPEG, PNG or WebP image.")
                if image.width * image.height > MAX_PIXELS:
                    raise Problem("image_pixels", "Images must contain at most 40 megapixels.")
                image.load()
                normalized = ImageOps.exif_transpose(image).convert("RGB")
        except Problem:
            raise
        except Exception:
            raise Problem("invalid_image", "This file could not be decoded as a supported image.") from None
    aid = aid or identifier()
    directory = root / "artifacts" / aid
    directory.mkdir(parents=True)
    try:
        (directory / "original.bin").write_bytes(content)
        width, height = normalized.size
        normalized.thumbnail((2048, 2048))
        normalized.save(directory / "view.jpg", quality=92)
        normalized.thumbnail((640, 640))
        normalized.save(directory / "thumb.jpg", quality=85)
    except Exception:
        shutil.rmtree(directory, ignore_errors=True)
        raise
    return {"id": aid, "filename": name, "hash": hashlib.sha256(content).hexdigest(),
            "bytes": len(content), "width": width, "height": height}


def decode_bounded(root, name, content):
    filename(name)
    if not 0 < len(content) <= MAX_FILE_BYTES:
        raise Problem("file_size", "Each image must be nonempty and at most 10 MiB.")
    aid = identifier()
    environment = {k: v for k, v in os.environ.items() if k.upper() in {"SYSTEMROOT", "WINDIR", "PATH", "TEMP", "TMP", "LANG", "LC_ALL"}}
    with DECODER_SLOTS:
        try:
            process = subprocess.run([sys.executable, "-m", "prism.decode_worker", str(root), name, aid], input=content,
                                     capture_output=True, timeout=20, env=environment)
            if process.returncode or len(process.stdout) > 8192:
                raise ValueError("decoder failed")
            value = json.loads(process.stdout)
            if "error" in value:
                raise Problem(value["error"], value["detail"])
            return value["ad"]
        except Problem:
            raise
        except Exception:
            shutil.rmtree(root / "artifacts" / aid, ignore_errors=True)
            raise Problem("decode_timeout", "The image decoder failed or exceeded its 20-second limit.") from None
