"""Exercise the packaged decoder, spawned CLIP, Harness, search and shutdown."""
import argparse
import json
import os
from pathlib import Path
import secrets
import subprocess
import time

import httpx
from prism.desktop import seed_model
from prism.demo import demo_creative


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--exe", type=Path, default=Path("dist/Prism/Prism.exe"))
    parser.add_argument("--data", type=Path, default=Path("output/desktop-smoke"))
    parser.add_argument("--photos", type=Path, help="Downloaded real-photo provenance.json; no invented ad copy")
    parser.add_argument("--output", type=Path, default=Path("output/desktop-smoke.json"))
    args = parser.parse_args()
    exe = args.exe.resolve()
    data = args.data.resolve()
    data.mkdir(parents=True, exist_ok=True)
    seed_model(data, exe.parent/"_internal/prism_model")
    import socket
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    url = f"http://127.0.0.1:{port}"
    environment = os.environ.copy()
    environment.update(PRISM_DATA_DIR=str(data), PRISM_DESKTOP_PORT=str(port),
                       PRISM_ORIGIN=url, PRISM_SECURE_COOKIE="false",
                       PYINSTALLER_RESET_ENVIRONMENT="1")
    started = time.monotonic()
    log = (data/"backend.log").open("ab")
    process = subprocess.Popen([str(exe), "--backend"], env=environment, stdin=subprocess.PIPE,
                               stdout=log, stderr=log, creationflags=subprocess.CREATE_NO_WINDOW)
    result = None
    try:
        with httpx.Client(base_url=url, timeout=180) as client:
            deadline = time.monotonic()+120
            while True:
                if process.poll() is not None:
                    raise RuntimeError("Packaged backend exited; inspect backend.log")
                try:
                    response = client.get("/api/health")
                    response.raise_for_status()
                    health = response.json()
                    if health["clip_ready"]:
                        break
                except httpx.HTTPError:
                    pass
                if time.monotonic() > deadline:
                    raise TimeoutError("Packaged backend startup")
                time.sleep(.25)

            def call(method, route, **kwargs):
                response = client.request(method, "/api"+route, **kwargs)
                response.raise_for_status()
                return response.json()

            credentials = {"name":"smoke-"+secrets.token_hex(4), "password":secrets.token_urlsafe(24)}
            (data/"test-access.json").write_text(json.dumps(credentials), encoding="utf-8")
            client.headers["X-CSRF-Token"] = call("POST", "/auth/register", json=credentials)["csrf"]
            cid = call("POST", "/collections", json={"name":"Real product photographs — development check" if args.photos else "Packaged app — synthetic smoke"})["id"]
            files, copies, sources = [], {}, []
            if args.photos:
                sources = json.loads(args.photos.read_text(encoding="utf-8"))
                for source in sources:
                    path = args.photos.parent/source["filename"]
                    files.append(("files", (path.name, path.read_bytes(), "image/jpeg")))
            else:
                for i in range(6):
                    content, copy = demo_creative(i)
                    name = f"packaged-{i:02}.png"
                    files.append(("files", (name, content, "image/png")))
                    copies[name] = copy
            before_upload = time.monotonic()
            imported = call("POST", f"/collections/{cid}/upload", files=files,
                            data={"copy_json":json.dumps(copies)})
            assert len(imported["accepted"]) == len(files), imported
            upload_seconds = time.monotonic()-before_upload
            deadline = time.monotonic()+600
            while time.monotonic() < deadline:
                board = call("GET", "/collections/"+cid)
                assert not any(j["status"] in ("failed","needs_attention","cancelled") for j in board["jobs"]), board["jobs"]
                if board["report"]:
                    break
                time.sleep(1)
            else:
                raise TimeoutError("Packaged analysis and report")
            assert board["coverage"]["ad_variants"] == len(files)
            if not args.photos:
                assert len(board["report"]["experiments"]) == 3
            else:
                assert board["copy_count"] == 0, "Photo captions are not advertising copy"
            queries = []
            for query in ("minimal skincare ads with product close-ups", "a pair of headphones", "running shoes", "underwater submarines and coral reefs"):
                began = time.monotonic()
                found = call("POST", f"/collections/{cid}/search", json={"query":query})
                queries.append({"query":query,"seconds":round(time.monotonic()-began,3),
                                "match_count":len(found["results"]), "no_match":found["no_match"],
                                "top5":[{**r,"filename":next(a["filename"] for a in board["ads"] if a["id"]==r["id"])} for r in found["results"][:5]]})
            job = call("GET", "/jobs/"+imported["job"]["id"])
            assert job["native_state"] == "COMPLETED"
            assert all(task["receipt_id"] for task in job["tasks"])
            exported = client.get(f"/api/collections/{cid}/export")
            exported.raise_for_status()
            assert "attachment" in exported.headers["content-disposition"]
            image = client.get(board["ads"][0]["image"])
            image.raise_for_status()
            with httpx.Client(base_url=url) as stranger:
                assert stranger.get(board["ads"][0]["image"]).status_code == 401
            result = {"status":"PASS","version":health["version"],"packaged_executable":True,
                      "scope":"real product photos; missing ad copy; developmental, not held-out quality" if args.photos else "synthetic packaging mechanics",
                      "model":health["model"],"harness":health["harness"],"collection_id":cid,
                      "coverage":board["coverage"],"upload_seconds":round(upload_seconds,3),
                      "groups":[{"name":g["name"],"count":len(g["members"])} for g in board["groups"]],
                      "report_status":board["report"]["status"],"report_limitations":board["report"]["limitations"],
                      "queries":queries,"paid_calls":0,"elapsed_seconds":round(time.monotonic()-started,3)}
    finally:
        if process.poll() is None:
            process.stdin.write(b"shutdown\n")
            process.stdin.flush()
            try:
                process.wait(timeout=30)
            except subprocess.TimeoutExpired:
                process.terminate()
                process.wait(timeout=10)
        log.close()
    assert process.returncode == 0, "Backend failed during controlled shutdown"
    result["controlled_shutdown"] = True
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
