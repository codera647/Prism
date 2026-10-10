from io import BytesIO
import numpy as np
from PIL import Image
import pytest
from fastapi.testclient import TestClient
from prism.api import create_app
from prism.domain import Settings


class FixtureEncoder:
    """Test-only deterministic vectors. Never selectable by a running Prism app."""
    manifest = {"name": "TEST-ONLY", "dimensions": 8, "sha256": "fixture", "preprocessing": "fixture"}
    def __init__(self):
        self.fail = False
        self.calls = 0
    def images(self, paths):
        self.calls += 1
        if self.fail:
            raise RuntimeError("synthetic response loss")
        vectors = []
        for path in paths:
            with Image.open(path) as image:
                color = np.asarray(image).mean(axis=(0, 1))
            v = np.zeros(8)
            v[int(np.argmax(color))] = 1
            vectors.append(v.tolist())
        return vectors
    def texts(self, texts):
        v = [1., 0., 0., 0., 0., 0., 0., 0.]
        return [v[:] for _ in texts]
    def close(self):
        pass


@pytest.fixture
def system(tmp_path):
    settings = Settings(tmp_path / "state")
    encoder = FixtureEncoder()
    app = create_app(settings, encoder, run_worker=False)
    with TestClient(app) as client:
        result = client.post("/api/auth/register", json={"name": "alice", "password": "test-password-alice"})
        assert result.status_code == 200, result.text
        client.headers["X-CSRF-Token"] = result.json()["csrf"]
        yield app, client, encoder, settings


def image_bytes(color=(200, 50, 20)):
    image = Image.new("RGB", (64, 80), color)
    stream = BytesIO()
    image.save(stream, format="PNG")
    return stream.getvalue()


def create_board(client, name="Test board"):
    response = client.post("/api/collections", json={"name": name})
    assert response.status_code == 201, response.text
    return response.json()["id"]


def upload(client, cid, count=3, copy=True):
    import json
    names = [f"ad-{i}.png" for i in range(count)]
    files = [("files", (n, image_bytes((180+i*10, 40, 20)), "image/png")) for i, n in enumerate(names)]
    text = {n: f"Discover a simpler routine. 20% off. Free shipping. Demo {i}." for i, n in enumerate(names)} if copy else {}
    response = client.post(f"/api/collections/{cid}/upload", files=files, data={"copy_json": json.dumps(text)})
    assert response.status_code == 200, response.text
    return response.json()


def finish(app, limit=50):
    w = app.state.workflow
    for _ in range(limit):
        with w.store.connect() as db:
            row = db.execute("SELECT id FROM jobs WHERE status IN ('queued','processing') ORDER BY created LIMIT 1").fetchone()
        if not row:
            return
        w.step(row[0])
    raise AssertionError("job did not finish within bounded steps")
