"""Explicit real-CLIP local smoke; creates synthetic data only, never downloads weights."""
import argparse
import json
from pathlib import Path
import secrets
import time
import httpx
from prism.demo import demo_creative


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:8000")
    parser.add_argument("--output", default="output/evidence/implementation/local-smoke.json")
    args = parser.parse_args()
    from prism.domain import Settings
    settings = Settings.environment()
    access = settings.data / "demo-access.json"
    if access.exists():
        credentials = json.loads(access.read_text())
        route = "login"
    else:
        credentials = {"name": "prism-demo", "password": secrets.token_urlsafe(24)}
        route = "register"
    with httpx.Client(base_url=args.url, timeout=180) as client:
        def request(method, path, **kwargs):
            response = client.request(method, "/api"+path, **kwargs)
            if response.status_code >= 400:
                raise RuntimeError(f"{path}: {response.status_code} {response.text}")
            return response.json()
        health = request("GET", "/health")
        assert health["clip_ready"], "Install the real CLIP weights before this smoke check"
        account = request("POST", "/auth/"+route, json=credentials)
        client.headers["X-CSRF-Token"] = account["csrf"]
        if not access.exists():
            access.write_text(json.dumps(credentials), encoding="utf-8")
        def wait(cid):
            end = time.monotonic()+600
            while time.monotonic() < end:
                board = request("GET", "/collections/"+cid)
                if any(j["status"] in ("failed", "needs_attention", "cancelled") and j["revision"] == board["revision"] for j in board["jobs"]):
                    raise RuntimeError("Job did not complete: "+json.dumps(board["jobs"]))
                if board["report"]:
                    return board
                time.sleep(1)
            raise TimeoutError("Analysis/report deadline exceeded")
        start = time.monotonic()
        cid = request("POST", "/demo")["id"]
        board = wait(cid)
        first_seconds = time.monotonic()-start
        assert board["coverage"]["ad_variants"] == 30
        assert len(board["report"]["experiments"]) == 3
        queries = []
        for query in ("minimal skincare ads with product close-ups", "customer testimonial reviews", "discount sale promotions", "underwater submarines and coral reefs", "minimal skincare products "*19):
            start = time.monotonic()
            results = request("POST", f"/collections/{cid}/search", json={"query": query})
            queries.append({"query": query, "seconds": round(time.monotonic()-start, 3),
                            "match_count": len(results["results"]), "no_match": results["no_match"],
                            "top5": [{**r, "filename": next(a["filename"] for a in board["ads"] if a["id"]==r["id"])} for r in results["results"][:5]]})
        assert queries[3]["no_match"] and queries[3]["match_count"] == 0
        assert all(queries[i]["match_count"] >= 5 for i in (0,1,2))
        cid100 = request("POST", "/collections", json={"name": "100-ad capacity · synthetic demo"})["id"]
        files, copies = [], {}
        for i in range(100):
            content, copy = demo_creative(i)
            name = f"capacity-{i+1:03}.png"
            files.append(("files", (name, content, "image/png")))
            copies[name] = copy
        start = time.monotonic()
        imported = request("POST", f"/collections/{cid100}/upload", files=files, data={"copy_json": json.dumps(copies)}, headers={"Idempotency-Key": secrets.token_hex(16)})
        upload_seconds = time.monotonic()-start
        assert len(imported["accepted"]) == 100
        start = time.monotonic()
        board100 = wait(cid100)
        processing_seconds = time.monotonic()-start
        assert board100["coverage"]["ad_variants"] == 100 and len(board100["report"]["experiments"]) == 3
        result = {"date": "2026-10-10", "scope": "local synthetic mechanics, not held-out quality or human usefulness",
                  "status": "PASS", "real_clip": health["model"], "harness": health["harness"],
                  "demo_30": {"collection_id": cid, "cold_end_to_end_seconds": round(first_seconds,3), "coverage": board["coverage"], "groups": [{"name":g["name"], "count":len(g["members"])} for g in board["groups"]]},
                  "capacity_100": {"collection_id": cid100, "upload_decode_seconds":round(upload_seconds,3), "warm_processing_seconds":round(processing_seconds,3), "coverage":board100["coverage"], "group_count":len(board100["groups"])},
                  "queries":queries, "paid_calls":0}
        path = Path(args.output)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(result,indent=2), encoding="utf-8")
        print(json.dumps({k: result[k] for k in ("status", "demo_30", "capacity_100", "paid_calls")},indent=2))


if __name__ == "__main__":
    main()
