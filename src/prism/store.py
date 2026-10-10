"""Product truth, independent of Trailforge's execution authority."""
from contextlib import contextmanager
import json
import sqlite3
import threading

from .domain import Problem, Settings, identifier, timestamp


class Store:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.root = settings.data
        self.root.mkdir(parents=True, exist_ok=True)
        self.path = self.root / "product.sqlite3"
        self.lock = threading.RLock()
        with self.connect() as db:
            db.executescript("""
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
            INSERT OR IGNORE INTO metadata VALUES ('schema_version','1');
            CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,name TEXT UNIQUE NOT NULL,password TEXT NOT NULL,created REAL NOT NULL);
            CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL,csrf TEXT NOT NULL,expires REAL NOT NULL);
            CREATE TABLE IF NOT EXISTS collections(id TEXT PRIMARY KEY,owner TEXT NOT NULL,name TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,created REAL NOT NULL,deleted INTEGER NOT NULL DEFAULT 0,analysis TEXT,report TEXT);
            CREATE TABLE IF NOT EXISTS ads(id TEXT PRIMARY KEY,collection_id TEXT NOT NULL,filename TEXT NOT NULL,copy TEXT NOT NULL DEFAULT '',hash TEXT NOT NULL,bytes INTEGER NOT NULL,width INTEGER NOT NULL,height INTEGER NOT NULL,created REAL NOT NULL,deleted INTEGER NOT NULL DEFAULT 0);
            CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,collection_id TEXT NOT NULL,owner TEXT NOT NULL,revision INTEGER NOT NULL,kind TEXT NOT NULL,status TEXT NOT NULL,created REAL NOT NULL,deadline REAL NOT NULL,run_id TEXT,manifest TEXT NOT NULL,result TEXT,error TEXT,idempotency TEXT NOT NULL,payload_hash TEXT NOT NULL,UNIQUE(owner,idempotency));
            CREATE TABLE IF NOT EXISTS annotations(collection_id TEXT NOT NULL,revision INTEGER NOT NULL,group_id TEXT NOT NULL,name TEXT NOT NULL,PRIMARY KEY(collection_id,revision,group_id));
            CREATE TABLE IF NOT EXISTS imports(owner TEXT NOT NULL,key TEXT NOT NULL,payload_hash TEXT NOT NULL,response TEXT NOT NULL,PRIMARY KEY(owner,key));
            CREATE TABLE IF NOT EXISTS tag_corrections(ad_id TEXT NOT NULL,kind TEXT NOT NULL,label TEXT NOT NULL,operation TEXT NOT NULL,quote TEXT NOT NULL,PRIMARY KEY(ad_id,kind,label));
            CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,at REAL NOT NULL,owner TEXT NOT NULL,kind TEXT NOT NULL,resource TEXT NOT NULL);
            CREATE INDEX IF NOT EXISTS ads_collection ON ads(collection_id,deleted);
            CREATE INDEX IF NOT EXISTS jobs_status ON jobs(status,created);
            """)
        self.replay_deletions()

    @contextmanager
    def connect(self, write=False):
        db = sqlite3.connect(self.path, timeout=20)
        db.row_factory = sqlite3.Row
        try:
            if write:
                db.execute("BEGIN IMMEDIATE")
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def collection(self, cid, owner, db=None):
        if db is None:
            with self.connect() as conn:
                return self.collection(cid, owner, conn)
        row = db.execute("SELECT * FROM collections WHERE id=? AND owner=? AND deleted=0", (cid, owner)).fetchone()
        if row is None:
            raise Problem("not_found", "Collection not found.", 404)
        return dict(row)

    def ads(self, cid, db=None):
        if db is None:
            with self.connect() as conn:
                return self.ads(cid, conn)
        rows = [dict(r) for r in db.execute("SELECT * FROM ads WHERE collection_id=? AND deleted=0 ORDER BY created,id", (cid,))]
        for ad in rows:
            ad["corrections"] = [dict(r) for r in db.execute("SELECT kind,label,operation,quote FROM tag_corrections WHERE ad_id=? ORDER BY kind,label", (ad["id"],))]
        return rows

    def audit(self, db, owner, kind, resource):
        db.execute("INSERT INTO audit(at,owner,kind,resource) VALUES(?,?,?,?)", (timestamp(), owner, kind, resource))

    def tombstone(self, kind, resource):
        """Independent ledger is retained across backup restores; no private copy."""
        import os
        with self.lock:
            with (self.root / "deletions.jsonl").open("a", encoding="utf-8") as stream:
                stream.write(json.dumps({"kind": kind, "id": resource, "at": timestamp()}) + "\n")
                stream.flush()
                os.fsync(stream.fileno())

    def replay_deletions(self):
        path = self.root / "deletions.jsonl"
        if not path.exists():
            return
        records = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line]
        with self.connect(write=True) as db:
            for item in records:
                if item["kind"] == "collection":
                    db.execute("UPDATE collections SET deleted=1,analysis=NULL,report=NULL WHERE id=?", (item["id"],))
                    db.execute("UPDATE ads SET deleted=1,copy='' WHERE collection_id=?", (item["id"],))
                    db.execute("UPDATE jobs SET status='cancelled',result=NULL WHERE collection_id=?", (item["id"],))
                    db.execute("DELETE FROM tag_corrections WHERE ad_id IN (SELECT id FROM ads WHERE collection_id=?)", (item["id"],))
                elif item["kind"] == "ad":
                    db.execute("UPDATE collections SET analysis=NULL,report=NULL,revision=revision+1 WHERE id IN (SELECT collection_id FROM ads WHERE id=? AND deleted=0)", (item["id"],))
                    db.execute("UPDATE ads SET deleted=1,copy='' WHERE id=?", (item["id"],))
                    db.execute("DELETE FROM tag_corrections WHERE ad_id=?", (item["id"],))
        self.purge()

    def purge(self):
        import shutil
        with self.connect() as db:
            ads = db.execute("SELECT id FROM ads WHERE deleted=1").fetchall()
            jobs = db.execute("SELECT id FROM jobs WHERE collection_id IN (SELECT id FROM collections WHERE deleted=1) OR revision<>(SELECT revision FROM collections WHERE id=jobs.collection_id)").fetchall()
        for row in ads:
            shutil.rmtree(self.root / "artifacts" / row[0], ignore_errors=True)
        for row in jobs:
            shutil.rmtree(self.root / "staged" / row[0], ignore_errors=True)
