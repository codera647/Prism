"""Offline backups and restores, with deletion replay and retained unit floors."""
import json
from contextlib import closing
from pathlib import Path
import shutil
import sqlite3
import tempfile
import zipfile
from .domain import Settings, atomic_json
from .store import Store


def unit_floor(root):
    path = root / "execution.sqlite3"
    if not path.exists():
        return {}
    with closing(sqlite3.connect(path)) as db:
        if not db.execute("SELECT 1 FROM sqlite_master WHERE name='execution_limits'").fetchone():
            return {}
        return {key: (cap, reserved) for key, cap, reserved in db.execute("SELECT * FROM execution_limits")}


def backup(settings, target):
    target = Path(target).resolve()
    if target.is_relative_to(settings.data):
        raise ValueError("Save backups outside the live data directory")
    store = Store(settings)
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="prism-backup-") as work:
        temp = Path(work)
        for name in ("product.sqlite3", "execution.sqlite3"):
            source = store.root / name
            if source.exists():
                with closing(sqlite3.connect(source)) as src, closing(sqlite3.connect(temp / name)) as dst:
                    src.backup(dst)
        with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for path in temp.glob("*.sqlite3"):
                archive.write(path, path.name)
            for name in ("artifacts", "staged"):
                directory = store.root / name
                if directory.exists():
                    for path in directory.rglob("*"):
                        if path.is_file():
                            archive.write(path, path.relative_to(store.root).as_posix())
            archive.writestr("backup.json", json.dumps({"schema": 1, "mode": "offline", "units": unit_floor(store.root)}))
    return {"backup": str(target), "bytes": target.stat().st_size}


def restore(settings, source):
    root = settings.data
    floors = unit_floor(root)
    with tempfile.TemporaryDirectory(prefix="prism-restore-") as work:
        temp = Path(work).resolve()
        with zipfile.ZipFile(source) as archive:
            if sum(item.file_size for item in archive.infolist()) > 12*1024**3:
                raise ValueError("Backup exceeds the restore size bound")
            for item in archive.infolist():
                destination = (temp / item.filename).resolve()
                if not destination.is_relative_to(temp) or "\\" in item.filename or item.is_dir():
                    raise ValueError("Invalid backup path")
                parts = Path(item.filename).parts
                if item.filename not in ("product.sqlite3", "execution.sqlite3", "backup.json") and parts[0] not in ("artifacts", "staged"):
                    raise ValueError("Unsupported backup entry")
            archive.extractall(temp)
        metadata = json.loads((temp / "backup.json").read_text(encoding="utf-8"))
        if metadata["schema"] != 1:
            raise ValueError("Unsupported backup schema")
        restored_floor = unit_floor(temp)
        if floors:
            with closing(sqlite3.connect(temp / "execution.sqlite3")) as db, db:
                for scope, (cap, reserved) in floors.items():
                    if scope in restored_floor and restored_floor[scope][0] != cap:
                        raise ValueError("Restored authority has incompatible unit caps")
                    db.execute("INSERT INTO execution_limits VALUES(?,?,?) ON CONFLICT(scope_key) DO UPDATE SET reserved=MAX(reserved,excluded.reserved)", (scope, cap, reserved))
        # Validate before replacing live files. This is an offline administrative operation.
        with closing(sqlite3.connect(temp / "product.sqlite3")) as db:
            if db.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
                raise ValueError("Backup product database is corrupt")
        root.mkdir(parents=True, exist_ok=True)
        for name in ("product.sqlite3", "execution.sqlite3"):
            for suffix in ("-wal", "-shm"):
                (root / (name+suffix)).unlink(missing_ok=True)
            if (temp / name).exists():
                shutil.copy2(temp / name, root / name)
        for name in ("artifacts", "staged"):
            destination = root / name
            # These fixed resolved targets are verified against the named Prism data root.
            if not destination.resolve().is_relative_to(root.resolve()):
                raise ValueError("Restore target escaped the data directory")
            if destination.exists():
                shutil.rmtree(destination)
            if (temp / name).exists():
                shutil.copytree(temp / name, destination)
    restored_store = Store(settings)  # Replays the live independent deletion ledger before any serving.
    with restored_store.connect(write=True) as db:
        db.execute("DELETE FROM sessions")  # Old backups must not resurrect logged-out browser sessions.
    return {"restored": str(Path(source).resolve()), "deletions_replayed": True, "unit_floor_retained": True}
