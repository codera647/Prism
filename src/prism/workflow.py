"""Recoverable product intents -> Trailforge -> staged evidence -> guarded commit."""
from dataclasses import asdict
import json
import logging
from pathlib import Path
import sqlite3
import threading
import time
import sys

from trailforge.core import digest
from trailforge.ports import AdapterCapabilities, FunctionAdapter, VerifiedResult
from trailforge.runtime import Goal, Harness, Task
from trailforge.telemetry import JsonEventSink

from .analysis import VISUAL_LABELS, resolved_tags, draft_report, group_ads, verify_analysis, verify_report
from .domain import POLICY_VERSION, Problem, atomic_json, fingerprint, identifier, timestamp
from .encoder import file_hash

LOG = logging.getLogger("prism.jobs")


def code_hash():
    root = Path(__file__).parent
    if getattr(sys, "frozen", False):
        return json.loads((root / "build_identity.json").read_text(encoding="utf-8"))["code_sha256"]
    return fingerprint({p.name: file_hash(p) for p in sorted(root.glob("*.py"))})


class Workflow:
    def __init__(self, store, encoder):
        self.store, self.encoder = store, encoder
        self.authority = store.root / "execution.sqlite3"
        self.mutex = threading.RLock()
        self.wake = threading.Event()
        self.stopping = threading.Event()
        self.thread = None
        self.code = code_hash()
        self.adapters = [
            FunctionAdapter(AdapterCapabilities("prism.encode/1", "TOOL", "CANDIDATE_WRITE"), self.encode),
            FunctionAdapter(AdapterCapabilities("prism.group/1", "TOOL", "CANDIDATE_WRITE"), self.group),
            FunctionAdapter(AdapterCapabilities("prism.verify-analysis/1", "VERIFY", "SCOPED_READ"), self.check_analysis),
            FunctionAdapter(AdapterCapabilities("prism.report/1", "TOOL", "CANDIDATE_WRITE"), self.report),
            FunctionAdapter(AdapterCapabilities("prism.verify-report/1", "VERIFY", "SCOPED_READ"), self.check_report),
        ]

    def start_worker(self):
        self.stopping.clear()
        self.thread = threading.Thread(target=self.loop, name="prism-worker", daemon=True)
        self.thread.start()

    def close(self):
        self.stopping.set()
        self.wake.set()
        if self.thread:
            self.thread.join(timeout=3)
        self.encoder.close()
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=5)

    def get(self, jid, owner=None):
        with self.store.connect() as db:
            row = db.execute("SELECT * FROM jobs WHERE id=?" + (" AND owner=?" if owner else ""), (jid, owner) if owner else (jid,)).fetchone()
        if not row:
            raise Problem("not_found", "Job not found.", 404)
        return dict(row)

    def admit(self, cid, owner, kind, key):
        if not key or len(key) > 128:
            raise Problem("idempotency", "Supply an Idempotency-Key of at most 128 characters.")
        with self.store.connect(write=True) as db:
            collection = self.store.collection(cid, owner, db)
            ads = self.store.ads(cid, db)
            if not ads:
                raise Problem("empty_collection", "Add some images first.")
            if not self.encoder.manifest:
                raise Problem("model_missing", "Install CLIP with prism model-download, then restart Prism.", 503)
            analysis_job = collection["analysis"]
            if kind == "report" and not analysis_job:
                raise Problem("analysis_required", "Analyze the current collection before drafting a report.", 409)
            manifest = {"model": self.encoder.manifest, "code": self.code, "policy": POLICY_VERSION,
                        "ads": [{"id": a["id"], "hash": a["hash"], "copy_hash": fingerprint(a["copy"]), "corrections_hash": fingerprint(a["corrections"])} for a in ads],
                        "analysis_job": analysis_job if kind == "report" else None}
            payload = fingerprint({"cid": cid, "kind": kind, "revision": collection["revision"], "manifest": manifest})
            previous = db.execute("SELECT * FROM jobs WHERE owner=? AND idempotency=?", (owner, key)).fetchone()
            if previous:
                if previous["payload_hash"] != payload:
                    raise Problem("idempotency_conflict", "This request key was used for a different collection revision.", 409)
                return dict(previous)
            same = db.execute("SELECT * FROM jobs WHERE collection_id=? AND revision=? AND kind=? AND status IN ('queued','processing','needs_attention')", (cid, collection["revision"], kind)).fetchone()
            if same:
                return dict(same)
            if db.execute("SELECT COUNT(*) FROM jobs WHERE status IN ('queued','processing','needs_attention')").fetchone()[0] >= self.store.settings.max_jobs:
                raise Problem("queue_full", "The local queue is full. Finish or cancel existing jobs first.", 429)
            jid, now = identifier(), timestamp()
            db.execute("INSERT INTO jobs(id,collection_id,owner,revision,kind,status,created,deadline,manifest,idempotency,payload_hash) VALUES(?,?,?,?,?,'queued',?,?,?,?,?)",
                       (jid, cid, owner, collection["revision"], kind, now, now+self.store.settings.job_seconds, json.dumps(manifest), key, payload))
            self.store.audit(db, owner, "job_admitted", jid)
        self.wake.set()
        return self.get(jid)

    def goal(self, job):
        manifest = json.loads(job["manifest"])
        base = {"job": job["id"], "revision": job["revision"], "manifest": fingerprint(manifest)}
        if job["kind"] == "analysis":
            tasks = []
            for index in range(0, len(manifest["ads"]), 8):
                tasks.append(Task(f"batch-{index//8}", "prism.encode/1", {**base, "ids": [a["id"] for a in manifest["ads"][index:index+8]]}))
            tasks.append(Task("groups", "prism.group/1", base, tuple(t.task_id for t in tasks)))
            tasks.append(Task("verify", "prism.verify-analysis/1", base, ("groups",)))
        else:
            tasks = [Task("draft", "prism.report/1", base), Task("verify", "prism.verify-report/1", base, ("draft",))]
        return Goal(job["owner"], job["collection_id"], f"Prism {job['kind']} job {job['id']} revision {job['revision']} {fingerprint(manifest)}",
                    tuple(tasks), ("verify",), ("PURE", "SCOPED_READ", "CANDIDATE_WRITE"), budget_units=64, max_task_attempts=3)

    def harness(self, job):
        s = self.store.settings
        return Harness(self.authority, tenant_id=job["owner"], resource_id=job["collection_id"], adapters=self.adapters,
                       lease_seconds=s.lease_seconds, tenant_limit=s.tenant_units, global_limit=s.global_units)

    def context(self, request):
        job = self.get(request.input["job"])
        if request.scope != (job["owner"], job["collection_id"]) or request.run_id != job["run_id"]:
            raise Problem("scope", "Unlinked or out-of-scope run.", 403)
        self.current(job)
        if request.input["manifest"] != fingerprint(json.loads(job["manifest"])):
            raise Problem("manifest", "Job manifest changed.", 409)
        return job

    def current(self, job):
        collection = self.store.collection(job["collection_id"], job["owner"])
        manifest = json.loads(job["manifest"])
        if collection["revision"] != job["revision"] or job["status"] == "cancelled":
            raise Problem("stale", "This job no longer matches the collection.", 409)
        if timestamp() >= job["deadline"]:
            raise Problem("deadline", "The processing deadline has expired.", 409)
        if manifest["code"] != self.code or manifest["model"] != self.encoder.manifest or manifest["policy"] != POLICY_VERSION:
            raise Problem("changed_runtime", "Runtime changed; cancel this job and start a new analysis.", 409)
        ads = self.store.ads(job["collection_id"])
        actual = [{"id": a["id"], "hash": a["hash"], "copy_hash": fingerprint(a["copy"]), "corrections_hash": fingerprint(a["corrections"])} for a in ads]
        if actual != manifest["ads"]:
            raise Problem("source_changed", "Source records no longer match the job.", 409)
        return collection, ads

    def stage(self, job, name, value):
        path = self.store.root / "staged" / job["id"] / (name + ".json")
        atomic_json(path, value)
        return {"name": name, "sha256": file_hash(path)}

    def read_stage(self, job, receipt):
        name = receipt["name"]
        if not name.replace("-", "").isalnum():
            raise ValueError("invalid stage name")
        path = self.store.root / "staged" / job["id"] / (name + ".json")
        if file_hash(path) != receipt["sha256"]:
            raise ValueError("changed staged artifact")
        return json.loads(path.read_text(encoding="utf-8"))

    def result(self, job):
        if not job["result"]:
            raise Problem("result_missing", "This analysis is not available.", 409)
        return self.read_stage(job, json.loads(job["result"]))

    def encode(self, request):
        job = self.context(request)
        _, ads = self.current(job)
        selected = [a for a in ads if a["id"] in request.input["ids"]]
        if len(selected) != len(request.input["ids"]):
            raise ValueError("unknown image")
        vectors = self.encoder.images([str(self.store.root / "artifacts" / a["id"] / "view.jpg") for a in selected])
        for ad in selected:
            ad["tags"] = resolved_tags(ad)
        return self.stage(job, request.task_id, {"ads": selected, "vectors": vectors})

    def group(self, request):
        job = self.context(request)
        ads, vectors = [], []
        for receipt in request.dependencies.values():
            batch = self.read_stage(job, receipt)
            ads.extend(batch["ads"])
            vectors.extend(batch["vectors"])
        labels = self.encoder.texts([label[1] for label in VISUAL_LABELS])
        result = group_ads(ads, vectors, labels, self.encoder.manifest)
        result["revision"] = job["revision"]
        return self.stage(job, "analysis", result)

    def check_analysis(self, request):
        job = self.context(request)
        _, ads = self.current(job)
        result = self.read_stage(job, request.dependencies["groups"])
        passed = verify_analysis(result, ads, self.encoder.manifest)
        for ad in ads:
            if file_hash(self.store.root / "artifacts" / ad["id"] / "original.bin") != ad["hash"]:
                passed = False
        return VerifiedResult("PASS" if passed else "FAIL", request.goal_digest, {"source_count": len(ads), "revision": job["revision"], "result": request.dependencies["groups"]})

    def report(self, request):
        job = self.context(request)
        source = self.get(json.loads(job["manifest"])["analysis_job"], job["owner"])
        analysis = self.result(source)
        if analysis["revision"] != job["revision"]:
            raise ValueError("stale report source")
        return self.stage(job, "report", draft_report(analysis))

    def check_report(self, request):
        job = self.context(request)
        collection, _ = self.current(job)
        source_id = json.loads(job["manifest"])["analysis_job"]
        source = self.get(source_id, job["owner"])
        passed = collection["analysis"] == source_id and verify_report(self.read_stage(job, request.dependencies["draft"]), self.result(source))
        return VerifiedResult("PASS" if passed else "FAIL", request.goal_digest, {"result": request.dependencies["draft"], "analysis_job": source_id})

    def link(self, job, harness, goal):
        """Recover start-before-link crashes. Only linked runs execute callbacks."""
        if job["run_id"]:
            return job
        matches = []
        with harness.store.connect() as db:
            candidates = db.execute("SELECT run_id FROM runs").fetchall()
        goal_digest = digest(asdict(goal))
        for (rid,) in candidates:
            record = harness.store.load(rid)
            if record["binding"]["goal_digest"] == goal_digest and record["binding"]["adapter_digest"] == harness.adapter_digest:
                matches.append(rid)
        rid = matches[0] if matches else harness.start(goal)
        for duplicate in matches[1:]:
            harness.cancel(duplicate, goal)
        with self.store.connect(write=True) as db:
            current = db.execute("SELECT run_id,status FROM jobs WHERE id=?", (job["id"],)).fetchone()
            if current["status"] == "cancelled":
                harness.cancel(rid, goal)
                return self.get(job["id"])
            db.execute("UPDATE jobs SET run_id=?,status='processing' WHERE id=? AND run_id IS NULL", (rid, job["id"]))
        return self.get(job["id"])

    def commit(self, job, record):
        self.current(self.get(job["id"]))
        receipt = record["tasks"]["verify"]["result"]["evidence"]["result"]
        result = self.read_stage(job, receipt)
        _, ads = self.current(self.get(job["id"]))
        if job["kind"] == "analysis":
            valid = verify_analysis(result, ads, self.encoder.manifest)
        else:
            source = self.get(json.loads(job["manifest"])["analysis_job"], job["owner"])
            valid = verify_report(result, self.result(source))
        if not valid:
            raise Problem("verification", "Stored evidence failed host verification.", 409)
        with self.store.connect(write=True) as db:
            collection = self.store.collection(job["collection_id"], job["owner"], db)
            current = db.execute("SELECT status FROM jobs WHERE id=?", (job["id"],)).fetchone()
            if current["status"] == "completed":
                return
            if collection["revision"] != job["revision"] or current["status"] == "cancelled":
                raise Problem("stale", "Changed collection cannot accept this result.", 409)
            if job["kind"] == "report" and collection["analysis"] != json.loads(job["manifest"])["analysis_job"]:
                raise Problem("stale", "Report source changed.", 409)
            db.execute("UPDATE jobs SET status='completed',result=?,error=NULL WHERE id=?", (json.dumps(receipt), job["id"]))
            field = "analysis" if job["kind"] == "analysis" else "report"
            db.execute(f"UPDATE collections SET {field}=? WHERE id=?", (job["id"], job["collection_id"]))
            if field == "analysis":
                db.execute("UPDATE collections SET report=NULL WHERE id=?", (job["collection_id"],))
            self.store.audit(db, job["owner"], "result_committed", job["id"])
        if job["kind"] == "analysis":
            self.admit(job["collection_id"], job["owner"], "report", "auto-report-" + job["id"])

    def step(self, jid):
        with self.mutex:
            job = self.get(jid)
            if job["status"] not in ("queued", "processing"):
                return
            try:
                self.current(job)
                # Model startup is outside a task lease. All inference calls then have a 60s supervisor.
                if hasattr(self.encoder, "start"):
                    self.encoder.start()
                harness, goal = self.harness(job), self.goal(job)
                job = self.link(job, harness, goal)
                if job["status"] == "cancelled":
                    return
                record = harness.inspect(job["run_id"])
                pending = next((t.task_id for t in goal.tasks if record["tasks"][t.task_id]["status"] != "DONE"), None)
                record = harness.advance(job["run_id"], goal, pause_after=pending)
                event = {"schema_version": "trailforge/telemetry/0.1", "run_id": record["run_id"],
                         "scope_digest": digest([job["owner"], job["collection_id"]]),
                         "kind": "GOAL_CHECKS_EVALUATED" if record["state"] in ("COMPLETED", "FAILED") else "WAITING_HUMAN" if record["state"] == "WAITING_HUMAN" else "TASK_RESULT_RECORDED", "state": record["state"], "units_reserved": record["units_reserved"]}
                with (self.store.root / "events.jsonl").open("a", encoding="utf-8") as stream:
                    JsonEventSink(stream).emit(event)
                if record["state"] == "COMPLETED":
                    self.commit(job, record)
                elif record["state"] in ("WAITING_HUMAN", "FAILED", "CANCELLED"):
                    status = {"WAITING_HUMAN": "needs_attention", "FAILED": "failed", "CANCELLED": "cancelled"}[record["state"]]
                    self.set_status(jid, status, "Processing needs inspection before retrying." if status == "needs_attention" else "Required checks did not complete.")
            except Problem as error:
                status = "cancelled" if error.code in ("stale", "source_changed", "not_found", "deadline") else "needs_attention"
                self.set_status(jid, status, error.message)
                if job.get("run_id") and status == "cancelled":
                    try:
                        self.harness(job).cancel(job["run_id"], self.goal(job))
                    except Exception:
                        pass
            except Exception:
                LOG.warning("job_hold id=%s code=HOST_OPERATION_FAILED", jid)
                self.set_status(jid, "needs_attention", "A local operation could not establish an outcome. Inspect this job before retrying.")
            finally:
                self.store.purge()  # Remove late staged writes for changed/deleted sources.

    def cancel_deleted_runs(self, cid):
        # Called only after an authorized deletion has committed its tombstone.
        with self.store.connect() as db:
            jobs = [dict(r) for r in db.execute("SELECT * FROM jobs WHERE collection_id=? AND status='cancelled' AND run_id IS NOT NULL", (cid,))]
        for job in jobs:
            self.harness(job).cancel(job["run_id"], self.goal(job))

    def set_status(self, jid, status, error=None):
        with self.store.connect(write=True) as db:
            db.execute("UPDATE jobs SET status=?,error=? WHERE id=? AND status NOT IN ('cancelled','completed')", (status, error, jid))

    def loop(self):
        while not self.stopping.is_set():
            with self.store.connect() as db:
                row = db.execute("SELECT id FROM jobs WHERE status IN ('queued','processing') ORDER BY created LIMIT 1").fetchone()
            if row:
                self.step(row[0])
            else:
                self.reconcile_reports()
                self.wake.wait(1)
                self.wake.clear()

    def reconcile_reports(self):
        # Recover a crash after analysis commit but before the separate report intent.
        with self.store.connect() as db:
            missing = db.execute("SELECT jobs.* FROM collections JOIN jobs ON jobs.id=collections.analysis WHERE collections.deleted=0 AND collections.report IS NULL AND jobs.revision=collections.revision AND jobs.status='completed' AND NOT EXISTS(SELECT 1 FROM jobs r WHERE r.idempotency='auto-report-'||jobs.id AND r.owner=jobs.owner)").fetchall()
        for item in missing:
            try:
                self.admit(item["collection_id"], item["owner"], "report", "auto-report-" + item["id"])
            except Problem:
                pass

    def inspect(self, job):
        result = {k: job[k] for k in ("id", "collection_id", "revision", "kind", "status", "created", "run_id", "error")}
        if job["run_id"]:
            harness = self.harness(job)
            record = harness.inspect(job["run_id"])
            result.update(native_state=record["state"], units=record["units_reserved"],
                          tasks=[{"id": i, "status": t["status"], "attempts": t["attempts"], "error": t["error_code"], "receipt_id": (t["receipt"] or {}).get("receipt_id")} for i, t in record["tasks"].items()],
                          resource_status=harness.resource_status(), goal_digest=record["binding"]["goal_digest"])
        return result

    def cancel(self, jid, owner):
        job = self.get(jid, owner)
        self.store.collection(job["collection_id"], owner)
        if job["status"] == "completed":
            raise Problem("terminal", "Completed work cannot be cancelled.", 409)
        with self.store.connect(write=True) as db:
            db.execute("UPDATE jobs SET status='cancelled',error='Cancelled by owner.' WHERE id=?", (jid,))
            self.store.audit(db, owner, "job_cancelled", jid)
        if job["run_id"]:
            self.harness(job).cancel(job["run_id"], self.goal(job))
        return self.inspect(self.get(jid, owner))

    def retry(self, jid, owner):
        with self.mutex:
            job = self.get(jid, owner)
            if job["status"] != "needs_attention":
                raise Problem("retry_state", "Only a job needing attention can be retried.", 409)
            self.current(job)
            if job["run_id"]:
                harness, goal = self.harness(job), self.goal(job)
                record = harness.inspect(job["run_id"])
                unknown = next((name for name, t in record["tasks"].items() if t["status"] == "UNKNOWN" or (t["status"] == "DONE" and isinstance(t["result"], dict) and t["result"].get("verdict") == "UNKNOWN")), None)
                if unknown:
                    if record["tasks"][unknown]["attempts"] >= goal.max_task_attempts:
                        raise Problem("attempts", "This job has exhausted its attempts. Cancel it; inspect the cause before new work.", 409)
                    harness.resolve_unknown(job["run_id"], goal, unknown, disposition="RETRY")
                elif record["state"] == "WAITING_HUMAN":
                    raise Problem("allowance", "The run is held by a resource limit. Cancel it; do not reset its allowance.", 409)
            with self.store.connect(write=True) as db:
                db.execute("UPDATE jobs SET status='queued',error=NULL WHERE id=?", (jid,))
                self.store.audit(db, owner, "explicit_retry", jid)
        self.wake.set()
        return self.inspect(self.get(jid, owner))
