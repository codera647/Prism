"""CLIP in a supervised child process. No remote inference or silent fallback."""
from pathlib import Path
import hashlib
import json
import multiprocessing as mp
import threading

from .domain import MODEL_NAME, MODEL_PRETRAINED, Problem, atomic_json

OFFICIAL_SHA256 = "40d365715913c9da98579312b702a82c18be219cc2a73407c4526f58eba950af"


def file_hash(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024*1024), b""):
            h.update(chunk)
    return h.hexdigest()


def download_model(root):
    import open_clip
    from open_clip.pretrained import download_pretrained, get_pretrained_cfg
    root = Path(root)
    root.mkdir(parents=True, exist_ok=True)
    config = get_pretrained_cfg(MODEL_NAME, MODEL_PRETRAINED)
    # Official OpenAI URL contains its immutable expected SHA-256. Avoid an unpinned HF main download.
    downloaded = Path(download_pretrained(config, prefer_hf_hub=False, cache_dir=str(root))).resolve()
    if file_hash(downloaded) != OFFICIAL_SHA256 or config["url"].split("/")[-2] != OFFICIAL_SHA256:
        raise ValueError("Official CLIP weights do not match the source SHA-256")
    # The official archive is TorchScript. Convert only this hash-verified source at setup.
    # Runtime uses tensor-only safetensors and never turns off weights_only protection.
    import torch
    from safetensors.torch import save_file
    path = root.resolve() / "clip-ViT-B-32-openai.safetensors"
    state = torch.jit.load(str(downloaded), map_location="cpu").state_dict()
    for key in ("input_resolution", "context_length", "vocab_size"):
        state.pop(key, None)
    save_file({k: v.contiguous() for k, v in state.items()}, str(path))
    manifest = {"name": MODEL_NAME, "pretrained": MODEL_PRETRAINED,
                "sha256": file_hash(path), "file": path.name,
                "preprocessing": "open_clip/ViT-B-32/224/v1", "dimensions": 512, "quick_gelu": True,
                "tokenization": "75-token chunks; normalized mean", "source_sha256": OFFICIAL_SHA256}
    atomic_json(root / "manifest.json", manifest)
    return manifest


def _model_process(connection, weights):
    try:
        import os
        os.environ["HF_HUB_OFFLINE"] = "1"
        import torch
        import open_clip
        from PIL import Image
        torch.set_num_threads(4)
        model, _, preprocess = open_clip.create_model_and_transforms(MODEL_NAME, pretrained=weights, device="cpu", force_quick_gelu=True)
        model.eval()
        tokenizer = open_clip.get_tokenizer(MODEL_NAME)
        connection.send({"ready": True})
        while True:
            kind, values = connection.recv()
            if kind == "close":
                break
            with torch.inference_mode():
                if kind == "images":
                    batch = []
                    for path in values:
                        with Image.open(path) as image:
                            batch.append(preprocess(image.convert("RGB")))
                    vectors = model.encode_image(torch.stack(batch))
                else:
                    chunks, spans = [], []
                    for text in values:
                        tokens = tokenizer.encode(text)
                        start = len(chunks)
                        chunks.extend(tokenizer.decode(tokens[i:i+75]) for i in range(0, max(1, len(tokens)), 75))
                        spans.append((start, len(chunks)))
                    encoded = model.encode_text(tokenizer(chunks))
                    encoded = encoded / encoded.norm(dim=-1, keepdim=True).clamp(min=1e-12)
                    vectors = torch.stack([encoded[a:b].mean(dim=0) for a, b in spans])
                vectors = vectors / vectors.norm(dim=-1, keepdim=True).clamp(min=1e-12)
                connection.send({"vectors": vectors.cpu().float().tolist()})
    except (EOFError, BrokenPipeError):
        pass
    except Exception:
        try:
            connection.send({"error": "local_model_failed"})
        except Exception:
            pass
    finally:
        connection.close()


class ClipEncoder:
    def __init__(self, root):
        self.root = Path(root)
        self.manifest = {}
        self.process = None
        self.connection = None
        self.lock = threading.RLock()
        path = self.root / "manifest.json"
        if path.exists():
            manifest = json.loads(path.read_text(encoding="utf-8"))
            weights = self.root / Path(manifest["file"]).name
            if manifest["file"] != weights.name:
                raise Problem("model_integrity", "Invalid local model filename.", 503)
            if manifest["name"] != MODEL_NAME or manifest["dimensions"] != 512 or file_hash(weights) != manifest["sha256"]:
                raise Problem("model_integrity", "The model does not match its recorded hash. Run prism model-download again.", 503)
            self.manifest = manifest

    def start(self):
        with self.lock:
            if self.process is not None and self.process.is_alive():
                return
            if not self.manifest:
                raise Problem("model_missing", "CLIP is not installed. Run prism model-download, then restart Prism.", 503)
            parent, child = mp.get_context("spawn").Pipe()
            process = mp.get_context("spawn").Process(target=_model_process, args=(child, str(self.root / self.manifest["file"])), daemon=True)
            process.start()
            child.close()
            self.process, self.connection = process, parent
            if not parent.poll(120) or not parent.recv().get("ready"):
                self.close()
                raise Problem("model_start", "The local CLIP model could not start.", 503)

    def _request(self, kind, values):
        with self.lock:
            self.start()
            self.connection.send((kind, values))
            if not self.connection.poll(60):
                self.close()
                raise Problem("model_timeout", "Local model processing exceeded its time limit.", 503)
            result = self.connection.recv()
            if "error" in result:
                self.close()
                raise Problem("model_failed", "Local model processing failed.", 503)
            return result["vectors"]

    def images(self, paths):
        return self._request("images", paths)

    def texts(self, texts):
        return self._request("texts", texts)

    def close(self):
        with self.lock:
            if self.process:
                self.process.terminate()
                self.process.join(timeout=5)
            if self.connection:
                self.connection.close()
            self.process = self.connection = None
