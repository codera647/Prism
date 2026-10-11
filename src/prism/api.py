from __future__ import annotations
from contextlib import asynccontextmanager
from pathlib import Path
import hashlib
import json
import secrets
import shutil
import threading
import time
from typing import Annotated

from fastapi import Depends, FastAPI, File, Form, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.concurrency import run_in_threadpool
import numpy as np

from . import __version__
from .auth import authenticate, principal
from .domain import MAX_COLLECTION_BYTES, MAX_COPY, MAX_FILE_BYTES, MAX_FILES, Problem, Settings, fingerprint, identifier, timestamp
from .encoder import ClipEncoder
from .media import copy_manifest, decode_bounded
from .store import Store
from .workflow import Workflow
from .research import CampaignBrief, discover, reference_image
from .agent_reach import search_public


class Credentials(BaseModel):
    name: str = Field(min_length=3, max_length=40)
    password: str = Field(min_length=10, max_length=200)


class CollectionInput(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class CopyEdit(BaseModel):
    text: str = Field(alias="copy", max_length=MAX_COPY)
    expected_revision: int = Field(ge=1)


class RevisionInput(BaseModel):
    expected_revision: int = Field(ge=1)


class ReviewInput(RevisionInput):
    report_id: str = Field(min_length=32, max_length=32)


class GroupEdit(RevisionInput):
    name: str = Field(min_length=1, max_length=80)


class TagCorrection(RevisionInput):
    kind: str = Field(pattern="^(hook|offer)$")
    label: str = Field(min_length=1, max_length=40)
    operation: str = Field(pattern="^(add|remove)$")
    quote: str = Field(default="", max_length=500)


class SearchInput(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    group: str | None = None
    tag: str | None = None


def create_app(settings=None, encoder=None, run_worker=True):
    settings = settings or Settings.environment()
    store = Store(settings)
    encoder = encoder or ClipEncoder(settings.data / "models")
    workflow = Workflow(store, encoder)
    auth_attempts = {}
    auth_lock = threading.Lock()

    @asynccontextmanager
    async def lifespan(app):
        if run_worker:
            workflow.start_worker()
        yield
        workflow.close()

    app = FastAPI(title="Prism", version=__version__, lifespan=lifespan, docs_url="/api/docs", redoc_url=None)
    app.state.store, app.state.workflow, app.state.encoder = store, workflow, encoder
    from urllib.parse import urlparse
    allowed_host = urlparse(settings.origin).hostname or "127.0.0.1"
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=list({"127.0.0.1", "localhost", "testserver", allowed_host}))
    from .http_limits import BodyLimit
    app.add_middleware(BodyLimit)

    @app.exception_handler(Problem)
    async def problem_handler(request, error):
        return JSONResponse({"error": error.code, "detail": error.message}, status_code=error.status)

    @app.middleware("http")
    async def boundaries(request, call_next):
        origin = request.headers.get("origin")
        allowed_origins = {settings.origin}
        if settings.origin == "http://127.0.0.1:8000":
            allowed_origins.add("http://localhost:8000")
        if request.method not in ("GET", "HEAD", "OPTIONS") and origin and origin not in allowed_origins:
            return JSONResponse({"detail": "This origin cannot change Prism data."}, status_code=403)
        length = request.headers.get("content-length")
        if length:
            try:
                if int(length) > MAX_COLLECTION_BYTES + 2*1024*1024:
                    return JSONResponse({"detail": "Request exceeds the 1 GiB upload limit."}, status_code=413)
            except ValueError:
                return JSONResponse({"detail": "Invalid request size."}, status_code=400)
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https://generativelanguage.googleapis.com; object-src 'none'; frame-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        return response

    def user(request: Request):
        return principal(store, request)

    @app.post('/api/discover')
    def discover_references(payload: CampaignBrief, current=Depends(user)):
        return discover(payload)

    @app.post('/api/research/search')
    def research_public_web(payload: CampaignBrief, current=Depends(user)):
        return search_public(payload)

    @app.get('/api/reference-image')
    def get_reference_image(url: str, current=Depends(user)):
        if len(url) > 2000:
            raise Problem('invalid_reference', 'Image URL is too long.', 400)
        body, media_type = reference_image(url)
        return Response(body, media_type=media_type)

    def job_key(request):
        return request.headers.get("Idempotency-Key") or identifier()

    def revision(collection, expected):
        if collection["revision"] != expected:
            raise Problem("revision_conflict", "This board changed. Refresh before saving; your unsaved text is still available.", 409)

    def collection_view(collection, include=False):
        data = {k: collection[k] for k in ("id", "name", "revision", "created")}
        ads = store.ads(collection["id"])
        with store.connect() as db:
            jobs = [dict(row) for row in db.execute("SELECT * FROM jobs WHERE collection_id=? ORDER BY created DESC LIMIT 8", (collection["id"],))]
            annotations = {r["group_id"]: r["name"] for r in db.execute("SELECT * FROM annotations WHERE collection_id=? AND revision=?", (collection["id"], collection["revision"]))}
        analysis, report = None, None
        if collection["analysis"]:
            source = workflow.get(collection["analysis"], collection["owner"])
            if source["revision"] == collection["revision"]:
                analysis = workflow.result(source)
        if collection["report"] and analysis:
            report_job = workflow.get(collection["report"], collection["owner"])
            report = workflow.result(report_job)
            report["id"] = report_job["id"]
            with store.connect() as db:
                review = db.execute("SELECT at FROM audit WHERE resource=? AND kind='report_reviewed' ORDER BY at DESC LIMIT 1", (report_job["id"],)).fetchone()
            if review:
                report["reviewed_at"] = review[0]
                report["status"] = "reviewed"
        data.update(count=len(ads), copy_count=sum(bool(a["copy"].strip()) for a in ads),
                    stale=bool(collection["analysis"] and not analysis),
                    status="ready" if analysis else "stale" if collection["analysis"] else "empty" if not ads else "pending",
                    latest_job={k: jobs[0][k] for k in ("id", "kind", "status", "error")} if jobs else None)
        if include:
            tags = {a["id"]: a["tags"] for a in analysis["ads"]} if analysis else {}
            data["ads"] = [{k: a[k] for k in ("id", "filename", "copy", "width", "height")} | {"tags": tags.get(a["id"], []), "image": f"/api/collections/{collection['id']}/ads/{a['id']}/image"} for a in ads]
            data["groups"] = [{**g, "name": annotations.get(g["id"], g["name"])} for g in analysis["groups"]] if analysis else []
            data["patterns"] = analysis["patterns"] if analysis else []
            data["coverage"] = analysis["coverage"] if analysis else {"images": 0, "copy": data["copy_count"], "ad_variants": len(ads)}
            data["model"] = analysis["model"] if analysis else None
            data["report"] = report
            data["jobs"] = [{k: job[k] for k in ("id", "kind", "status", "error", "revision")} for job in jobs]
        return data

    @app.get("/api/health")
    def health():
        return {"status": "ok", "version": __version__, "clip_ready": bool(encoder.manifest),
                "model": encoder.manifest, "mode": "local", "generator": "templates", "ocr": False,
                "harness": "Trailforge 0.1.0a1"}

    def sign_in(credentials, request, register):
        ip = request.client.host if request.client else "unknown"
        with auth_lock:
            now = timestamp()
            attempts = [t for t in auth_attempts.get(ip, []) if now-t < 60]
            if len(attempts) >= 10:
                raise Problem("auth_rate", "Too many sign-in attempts. Try again in a minute.", 429)
            auth_attempts[ip] = attempts + [now]
        result, token = authenticate(store, credentials.name, credentials.password, register)
        response = JSONResponse(result)
        response.set_cookie("prism_session", token, httponly=True, samesite="strict", secure=settings.secure_cookie, max_age=7*86400, path="/")
        return response

    @app.post("/api/auth/register")
    def register(credentials: Credentials, request: Request):
        return sign_in(credentials, request, True)

    @app.post("/api/auth/login")
    def login(credentials: Credentials, request: Request):
        return sign_in(credentials, request, False)

    @app.get("/api/auth/me")
    def me(current=Depends(user)):
        return current

    @app.post("/api/auth/logout")
    def logout(request: Request, current=Depends(user)):
        token = hashlib.sha256(request.cookies.get("prism_session", "").encode()).hexdigest()
        with store.connect(write=True) as db:
            db.execute("DELETE FROM sessions WHERE token=?", (token,))
        response = JSONResponse({"ok": True})
        response.delete_cookie("prism_session")
        return response

    @app.get("/api/collections")
    def collections(current=Depends(user)):
        with store.connect() as db:
            rows = [dict(r) for r in db.execute("SELECT * FROM collections WHERE owner=? AND deleted=0 ORDER BY created DESC", (current["id"],))]
        return [collection_view(row) for row in rows]

    @app.post("/api/collections", status_code=201)
    def create_collection(payload: CollectionInput, current=Depends(user)):
        name = payload.name.strip()
        if not name:
            raise Problem("name", "Give the board a name.")
        cid = identifier()
        with store.connect(write=True) as db:
            db.execute("INSERT INTO collections(id,owner,name,created) VALUES(?,?,?,?)", (cid, current["id"], name, timestamp()))
            store.audit(db, current["id"], "collection_created", cid)
        return collection_view(store.collection(cid, current["id"]), True)

    @app.get("/api/collections/{cid}")
    def get_collection(cid: str, current=Depends(user)):
        return collection_view(store.collection(cid, current["id"]), True)

    @app.post("/api/collections/{cid}/upload")
    async def upload(cid: str, request: Request, files: Annotated[list[UploadFile], File()],
                     copy_json: Annotated[str, Form()] = "{}", copy_csv: Annotated[str, Form()] = "",
                     current=Depends(user)):
        store.collection(cid, current["id"])
        if not 1 <= len(files) <= MAX_FILES or len(copy_json) > 1_100_000 or len(copy_csv) > 1_100_000:
            raise Problem("batch_limit", "Upload 1–100 images with a bounded copy mapping.")
        names = [f.filename or "" for f in files]
        mapping = copy_manifest(copy_json, copy_csv, names)
        staged, rejected, input_hashes = [], [], []
        request_key = job_key(request)
        if len(request_key) > 128:
            raise Problem("idempotency", "Request keys must be at most 128 characters.")
        try:
            for f in files:
                try:
                    content = await f.read(MAX_FILE_BYTES + 1)
                    input_hashes.append({"name": f.filename, "sha256": hashlib.sha256(content).hexdigest(), "copy": fingerprint(mapping.get(f.filename, ""))})
                    item = await run_in_threadpool(decode_bounded, store.root, f.filename or "", content)
                    item["copy"] = mapping.get(item["filename"], "")
                    staged.append(item)
                except Problem as error:
                    rejected.append({"filename": f.filename, "reason": error.message})
                finally:
                    await f.close()
            if not staged:
                raise Problem("no_valid_files", "No supported valid images were found.")
            with store.connect(write=True) as db:
                collection = store.collection(cid, current["id"], db)
                payload_hash = fingerprint({"cid": cid, "inputs": input_hashes})
                previous = db.execute("SELECT * FROM imports WHERE owner=? AND key=?", (current["id"], request_key)).fetchone()
                if previous:
                    if previous["payload_hash"] != payload_hash:
                        raise Problem("idempotency_conflict", "This upload request key was already used for different images or copy.", 409)
                    replay = json.loads(previous["response"])
                    for ad in staged:
                        shutil.rmtree(store.root / "artifacts" / ad["id"], ignore_errors=True)
                    return replay
                existing = store.ads(cid, db)
                if len(existing) + len(staged) > MAX_FILES:
                    raise Problem("collection_limit", "A board can contain at most 100 ad variants.")
                if sum(a["bytes"] for a in existing + staged) > MAX_COLLECTION_BYTES:
                    raise Problem("storage_limit", "Original images exceed this board's 1 GiB limit.")
                seen = {(a["hash"], a["copy"]) for a in existing}
                accepted = []
                for ad in staged:
                    key = (ad["hash"], ad["copy"])
                    if key in seen:
                        rejected.append({"filename": ad["filename"], "reason": "This exact image and copy are already on the board."})
                        shutil.rmtree(store.root / "artifacts" / ad["id"], ignore_errors=True)
                        continue
                    seen.add(key)
                    db.execute("INSERT INTO ads(id,collection_id,filename,copy,hash,bytes,width,height,created) VALUES(?,?,?,?,?,?,?,?,?)", (ad["id"], cid, ad["filename"], ad["copy"], ad["hash"], ad["bytes"], ad["width"], ad["height"], timestamp()))
                    accepted.append(ad["id"])
                if not accepted:
                    raise Problem("no_new_files", "All supplied image-and-copy variants are already on this board.")
                db.execute("UPDATE collections SET revision=revision+1,report=NULL WHERE id=?", (cid,))
                store.audit(db, current["id"], "images_uploaded", cid)
                saved_response = {"accepted": accepted, "rejected": rejected, "job": None, "detail": "Images saved. Request analysis if a job was not linked before an interruption."}
                db.execute("INSERT INTO imports VALUES(?,?,?,?)", (current["id"], request_key, payload_hash, json.dumps(saved_response)))
        except Exception:
            for ad in staged:
                shutil.rmtree(store.root / "artifacts" / ad["id"], ignore_errors=True)
            raise
        try:
            job = workflow.admit(cid, current["id"], "analysis", request_key) if encoder.manifest else None
            response = {"accepted": accepted, "rejected": rejected, "job": workflow.inspect(job) if job else None,
                        "detail": None if job else "Images saved. Install CLIP before analyzing."}
        except Problem as error:
            response = {"accepted": accepted, "rejected": rejected, "job": None, "detail": "Images saved. " + error.message}
        with store.connect(write=True) as db:
            db.execute("UPDATE imports SET response=? WHERE owner=? AND key=?", (json.dumps(response), current["id"], request_key))
        return response

    @app.post("/api/collections/{cid}/analyze", status_code=202)
    def analyze(cid: str, request: Request, current=Depends(user)):
        return workflow.inspect(workflow.admit(cid, current["id"], "analysis", job_key(request)))

    @app.post("/api/collections/{cid}/report", status_code=202)
    def report(cid: str, request: Request, current=Depends(user)):
        c = store.collection(cid, current["id"])
        if not c["analysis"] or workflow.get(c["analysis"])["revision"] != c["revision"]:
            raise Problem("stale", "Refresh the analysis before creating a report.", 409)
        return workflow.inspect(workflow.admit(cid, current["id"], "report", job_key(request)))

    @app.get("/api/jobs/{jid}")
    def inspect_job(jid: str, current=Depends(user)):
        job = workflow.get(jid, current["id"])
        store.collection(job["collection_id"], current["id"])
        return workflow.inspect(job)

    @app.post("/api/jobs/{jid}/cancel")
    def cancel(jid: str, current=Depends(user)):
        return workflow.cancel(jid, current["id"])

    @app.post("/api/jobs/{jid}/retry")
    def retry(jid: str, current=Depends(user)):
        return workflow.retry(jid, current["id"])

    @app.post("/api/collections/{cid}/search")
    def search(cid: str, payload: SearchInput, current=Depends(user)):
        collection = store.collection(cid, current["id"])
        if not collection["analysis"]:
            raise Problem("not_ready", "Analyze this board before searching.", 409)
        job = workflow.get(collection["analysis"], current["id"])
        if job["revision"] != collection["revision"]:
            raise Problem("stale", "Refresh this board's analysis before searching.", 409)
        result = workflow.result(job)
        if result["model"] != encoder.manifest:
            raise Problem("model_changed", "Reanalyze this board with the current model.", 409)
        query = payload.query.strip()
        if not query:
            raise Problem("empty_query", "Enter a description to search.")
        # Only current authorized IDs reach scoring. Source URLs and ad copy are never executed.
        active = {a["id"] for a in store.ads(cid)}
        if payload.group:
            group = next((g for g in result["groups"] if g["id"] == payload.group), None)
            active &= set(group["members"]) if group else set()
        eligible = [(i, a) for i, a in enumerate(result["ads"]) if a["id"] in active and (not payload.tag or any(t["label"] == payload.tag for t in a["tags"]))]
        if not eligible:
            return {"results": [], "revision": collection["revision"], "mode": "CLIP + copy", "no_match": True}
        qv = np.asarray(encoder.texts([query])[0], dtype=np.float32)
        query_terms = {t for t in __import__('re').findall(r"[a-z0-9]+", query.lower()) if len(t) > 2}
        scored = []
        for i, ad in eligible:
            semantic = float(np.dot(qv, np.asarray(result["vectors"][i], dtype=np.float32)))
            terms = set(__import__('re').findall(r"[a-z0-9]+", ad["copy"].lower()))
            lexical = len(terms & query_terms) / max(1, len(query_terms))
            score = semantic + 0.08 * lexical
            if semantic >= 0.23 or lexical >= 0.5:
                scored.append({"id": ad["id"], "score": round(score, 4), "similarity": round(semantic, 4)})
        latest = store.collection(cid, current["id"])
        if latest["revision"] != collection["revision"]:
            raise Problem("stale", "This board changed during search. Search again.", 409)
        scored.sort(key=lambda r: (-r["score"], r["id"]))
        return {"results": scored[:30], "revision": collection["revision"], "mode": "CLIP + copy", "no_match": not scored,
                "note": "Similarity is a ranking aid, not confidence. The no-match threshold is provisional."}

    @app.get("/api/collections/{cid}/ads/{aid}/image")
    def image(cid: str, aid: str, full: bool = False, current=Depends(user)):
        store.collection(cid, current["id"])
        with store.connect() as db:
            row = db.execute("SELECT id FROM ads WHERE id=? AND collection_id=? AND deleted=0", (aid, cid)).fetchone()
        if not row:
            raise Problem("not_found", "Image not found.", 404)
        path = store.root / "artifacts" / row["id"] / ("view.jpg" if full else "thumb.jpg")
        if not path.exists():
            raise Problem("not_found", "Image artifact is unavailable.", 404)
        return FileResponse(path, media_type="image/jpeg", headers={"Cache-Control": "no-store"})

    @app.patch("/api/collections/{cid}/ads/{aid}")
    def edit_copy(cid: str, aid: str, payload: CopyEdit, current=Depends(user)):
        with store.connect(write=True) as db:
            collection = store.collection(cid, current["id"], db)
            revision(collection, payload.expected_revision)
            if not db.execute("SELECT id FROM ads WHERE id=? AND collection_id=? AND deleted=0", (aid, cid)).fetchone():
                raise Problem("not_found", "Ad not found.", 404)
            db.execute("UPDATE ads SET copy=? WHERE id=?", (payload.text, aid))
            db.execute("DELETE FROM tag_corrections WHERE ad_id=?", (aid,))
            db.execute("UPDATE collections SET revision=revision+1,report=NULL WHERE id=?", (cid,))
            store.audit(db, current["id"], "copy_edited", aid)
        return collection_view(store.collection(cid, current["id"]), True)

    @app.post("/api/collections/{cid}/ads/{aid}/tags")
    def correct_tag(cid: str, aid: str, payload: TagCorrection, current=Depends(user)):
        with store.connect(write=True) as db:
            collection = store.collection(cid, current["id"], db)
            revision(collection, payload.expected_revision)
            ad = db.execute("SELECT * FROM ads WHERE id=? AND collection_id=? AND deleted=0", (aid, cid)).fetchone()
            if not ad:
                raise Problem("not_found", "Ad not found.", 404)
            if payload.operation == "add" and (not payload.quote or payload.quote not in ad["copy"]):
                raise Problem("tag_source", "Quote an exact phrase from this ad's supplied copy.")
            db.execute("INSERT OR REPLACE INTO tag_corrections VALUES(?,?,?,?,?)", (aid, payload.kind, payload.label.strip(), payload.operation, payload.quote))
            db.execute("UPDATE collections SET revision=revision+1,report=NULL WHERE id=?", (cid,))
            store.audit(db, current["id"], "tag_corrected", aid)
        return collection_view(store.collection(cid, current["id"]), True)

    @app.patch("/api/collections/{cid}/groups/{gid}")
    def rename_group(cid: str, gid: str, payload: GroupEdit, current=Depends(user)):
        with store.connect(write=True) as db:
            collection = store.collection(cid, current["id"], db)
            revision(collection, payload.expected_revision)
            if not collection["analysis"]:
                raise Problem("not_ready", "Analyze this board first.", 409)
            source = workflow.get(collection["analysis"], current["id"])
            if source["revision"] != collection["revision"] or gid not in {g["id"] for g in workflow.result(source)["groups"]}:
                raise Problem("not_found", "Current group not found.", 404)
            db.execute("INSERT OR REPLACE INTO annotations VALUES(?,?,?,?)", (cid, collection["revision"], gid, payload.name.strip()))
            store.audit(db, current["id"], "group_renamed", cid)
        return collection_view(store.collection(cid, current["id"]), True)

    @app.delete("/api/collections/{cid}/ads/{aid}")
    def delete_ad(cid: str, aid: str, expected_revision: int, current=Depends(user)):
        with store.lock, store.connect(write=True) as db:
            collection = store.collection(cid, current["id"], db)
            revision(collection, expected_revision)
            if not db.execute("SELECT id FROM ads WHERE id=? AND collection_id=? AND deleted=0", (aid, cid)).fetchone():
                raise Problem("not_found", "Ad not found.", 404)
            store.tombstone("ad", aid)
            db.execute("UPDATE ads SET deleted=1,copy='' WHERE id=?", (aid,))
            db.execute("DELETE FROM tag_corrections WHERE ad_id=?", (aid,))
            db.execute("UPDATE collections SET revision=revision+1,report=NULL,analysis=NULL WHERE id=?", (cid,))
            db.execute("UPDATE jobs SET status='cancelled',result=NULL WHERE collection_id=? AND status<>'completed'", (cid,))
            store.audit(db, current["id"], "ad_deleted", aid)
        workflow.cancel_deleted_runs(cid)
        store.purge()
        return collection_view(store.collection(cid, current["id"]), True)

    @app.delete("/api/collections/{cid}")
    def delete_collection(cid: str, expected_revision: int, current=Depends(user)):
        with store.lock, store.connect(write=True) as db:
            collection = store.collection(cid, current["id"], db)
            revision(collection, expected_revision)
            store.tombstone("collection", cid)
            db.execute("UPDATE collections SET deleted=1,analysis=NULL,report=NULL WHERE id=?", (cid,))
            db.execute("UPDATE ads SET deleted=1,copy='' WHERE collection_id=?", (cid,))
            db.execute("DELETE FROM tag_corrections WHERE ad_id IN (SELECT id FROM ads WHERE collection_id=?)", (cid,))
            db.execute("UPDATE jobs SET status='cancelled',result=NULL WHERE collection_id=?", (cid,))
            store.audit(db, current["id"], "collection_deleted", cid)
        workflow.cancel_deleted_runs(cid)
        store.purge()
        return {"ok": True}

    @app.post("/api/collections/{cid}/review")
    def review(cid: str, payload: ReviewInput, current=Depends(user)):
        with store.connect(write=True) as db:
            collection = store.collection(cid, current["id"], db)
            revision(collection, payload.expected_revision)
            if not collection["report"]:
                raise Problem("no_report", "No current draft is available.", 409)
            if collection["report"] != payload.report_id:
                raise Problem("review_conflict", "The report changed. Inspect the current draft before reviewing it.", 409)
            store.audit(db, current["id"], "report_reviewed", collection["report"])
        return collection_view(store.collection(cid, current["id"]), True)

    @app.get("/api/collections/{cid}/export")
    def export(cid: str, current=Depends(user)):
        data = collection_view(store.collection(cid, current["id"]), True)
        data.pop("jobs", None)
        return JSONResponse(data, headers={"Content-Disposition": 'attachment; filename="prism-board.json"'})

    @app.post("/api/demo", status_code=201)
    def demo(current=Depends(user)):
        from .demo import add_demo
        cid = add_demo(store, current["id"])
        job = workflow.admit(cid, current["id"], "analysis", "demo-"+cid) if encoder.manifest else None
        return {"id": cid, "job": workflow.inspect(job) if job else None}

    web = Path(__file__).parent / "web"
    app.mount("/static", StaticFiles(directory=web), name="static")

    @app.get("/")
    def home():
        return FileResponse(web / "index.html")

    return app
