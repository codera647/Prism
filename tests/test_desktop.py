"""Desktop lifecycle checks that do not require Windows or a model download."""
import json
import threading

import pytest

from prism import desktop
from prism.domain import Problem


def test_packaged_seed_rejects_tampering_and_path_escape(tmp_path):
    from prism.encoder import OFFICIAL_SHA256, file_hash
    seed = tmp_path/"seed"
    seed.mkdir()
    weights = seed/"weights.safetensors"
    weights.write_bytes(b"not a neural model; integrity test only")
    manifest = {"file":weights.name, "source_sha256":OFFICIAL_SHA256,
                "sha256":file_hash(weights),"name":"ViT-B-32","dimensions":512}
    (seed/"manifest.json").write_text(json.dumps(manifest))
    weights.write_bytes(b"tampered")
    with pytest.raises(ValueError, match="integrity"):
        desktop.seed_model(tmp_path/"data", seed)
    assert not (tmp_path/"data/models").exists()
    manifest["file"] = "../weights.safetensors"
    (seed/"manifest.json").write_text(json.dumps(manifest))
    with pytest.raises(ValueError, match="manifest"):
        desktop.seed_model(tmp_path/"data", seed)


def test_existing_model_is_verified_not_silently_replaced(tmp_path):
    from prism.encoder import file_hash
    target = tmp_path/"data/models"
    target.mkdir(parents=True)
    weights = target/"weights.safetensors"
    weights.write_bytes(b"original model placeholder for integrity test")
    manifest = {"file":weights.name,"sha256":file_hash(weights),"name":"ViT-B-32","dimensions":512}
    (target/"manifest.json").write_text(json.dumps(manifest))
    assert desktop.seed_model(tmp_path/"data", tmp_path/"missing-seed") == manifest
    weights.write_bytes(b"corrupted existing model")
    with pytest.raises(Problem, match="hash"):
        desktop.seed_model(tmp_path/"data", tmp_path/"missing-seed")
    assert weights.read_bytes() == b"corrupted existing model"


def test_close_is_safe_when_window_and_worker_close_together(tmp_path):
    import io
    session = desktop.BackendSession(tmp_path)
    class Child:
        stdin = io.BytesIO()
        finished = False
        waits = 0
        def poll(self):
            return 0 if self.finished else None
        def wait(self, timeout):
            self.waits += 1
            self.finished = True
    child = Child()
    session.process = child
    session.log = io.BytesIO()
    threads = [threading.Thread(target=session.close) for _ in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    session.close()
    assert session.stopping.is_set() and child.waits == 1
    assert child.stdin.getvalue() == b"shutdown\n"
