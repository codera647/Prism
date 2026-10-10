"""Native Windows window around a managed, private loopback backend."""
import argparse
import html
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import threading
import time
import urllib.request

from filelock import FileLock
from .domain import Settings, atomic_json


def default_data():
    base = Path(os.environ.get("LOCALAPPDATA", Path.home()/".local/share"))
    return Path(os.getenv("PRISM_DATA_DIR", str(base/"Prism/data"))).resolve()


def seed_model(data, seed):
    """Copy only hash-verified packaged weights; retain an existing user model."""
    from .encoder import ClipEncoder, OFFICIAL_SHA256, file_hash
    target = Path(data)/"models"
    if (target/"manifest.json").exists():
        return ClipEncoder(target).manifest
    seed = Path(seed)
    if not (seed/"manifest.json").exists():
        from .encoder import download_model
        return download_model(target)
    manifest = json.loads((seed/"manifest.json").read_text(encoding="utf-8"))
    name = Path(manifest["file"]).name
    if name != manifest["file"] or manifest.get("source_sha256") != OFFICIAL_SHA256:
        raise ValueError("Invalid packaged model manifest")
    if file_hash(seed/name) != manifest["sha256"]:
        raise ValueError("Packaged CLIP weights failed their integrity check")
    target.mkdir(parents=True, exist_ok=True)
    staged = target/(name+".tmp")
    shutil.copyfile(seed/name, staged)
    os.replace(staged, target/name)
    atomic_json(target/"manifest.json", manifest)
    return ClipEncoder(target).manifest


def backend():
    """Control via the parent's private stdin pipe; no public shutdown endpoint."""
    from .api import create_app
    from .cli import authority_lock
    import uvicorn
    port = int(os.environ["PRISM_DESKTOP_PORT"])
    settings = Settings.environment()
    with authority_lock(settings):
        server = uvicorn.Server(uvicorn.Config(create_app(settings), host="127.0.0.1", port=port,
                                              access_log=False, workers=1))
        def control():
            if sys.stdin.readline().strip() == "shutdown":
                server.should_exit = True
        threading.Thread(target=control, daemon=True).start()
        server.run()


class BackendSession:
    def __init__(self, data):
        self.data = Path(data)
        self.process = None
        self.log = None
        self.stopping = threading.Event()
        self.url = None
        self._close_lock = threading.Lock()

    def start(self, seed):
        seed_model(self.data, seed)
        if self.stopping.is_set():
            return None
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
        self.url = f"http://127.0.0.1:{port}"
        environment = os.environ.copy()
        environment.update(PRISM_DATA_DIR=str(self.data), PRISM_ORIGIN=self.url,
                           PRISM_DESKTOP_PORT=str(port), PRISM_SECURE_COOKIE="false",
                           PYINSTALLER_RESET_ENVIRONMENT="1")
        argv = [sys.executable, "--backend"] if getattr(sys,"frozen",False) else [sys.executable,"-m","prism.desktop","--backend"]
        self.log = (self.data/"desktop-backend.log").open("ab")
        self.process = subprocess.Popen(argv, stdin=subprocess.PIPE, stdout=self.log, stderr=self.log,
                                        env=environment, creationflags=subprocess.CREATE_NO_WINDOW if os.name=="nt" else 0)
        deadline = time.monotonic()+120
        while time.monotonic()<deadline and not self.stopping.is_set():
            if self.process.poll() is not None:
                raise RuntimeError("Prism backend could not start. See desktop-backend.log in your Prism data folder.")
            try:
                with urllib.request.urlopen(self.url+"/api/health",timeout=1) as response:
                    if json.load(response)["clip_ready"]:
                        atomic_json(self.data/"desktop-session.json", {"url":self.url,"pid":self.process.pid})
                        return self.url
            except (OSError, ValueError):
                pass
            self.stopping.wait(.25)
        raise RuntimeError("Prism startup timed out.")

    def close(self):
        self.stopping.set()
        with self._close_lock:
            if self.process and self.process.poll() is None:
                try:
                    self.process.stdin.write(b"shutdown\n")
                    self.process.stdin.flush()
                    self.process.wait(timeout=15)
                except (OSError, subprocess.TimeoutExpired):
                    self.process.terminate()
                    self.process.wait(timeout=5)
            if self.log:
                self.log.close()


def main():
    parser=argparse.ArgumentParser(description="Prism desktop")
    parser.add_argument("--data",type=Path,default=default_data())
    parser.add_argument("--seed",type=Path,default=Path(getattr(sys,"_MEIPASS",Path(__file__).parents[2]))/"prism_model")
    args=parser.parse_args()
    data=args.data.resolve();data.mkdir(parents=True,exist_ok=True)
    import webview
    webview.settings["ALLOW_DOWNLOADS"] = True
    session=BackendSession(data)
    window=webview.create_window("Prism",html="""<!doctype html><html><body style='background:#f8f7f4;font:18px Segoe UI;padding:80px;color:#28272d'><h1 style='color:#7756c9'>Prism</h1><h2>Opening your creative workspace...</h2><p>Preparing local CLIP. Your images stay on this computer.</p><p>The first launch may take a little longer.</p></body></html>""",width=1280,height=900,min_size=(760,600))
    def start():
        try:
            with FileLock(str(data/"desktop.lock"),timeout=1):
                url=session.start(args.seed)
                if url:
                    window.load_url(url)
                session.stopping.wait()
        except Exception as error:
            if not session.stopping.is_set():
                window.load_html("<h1>Prism could not open</h1><p>"+html.escape(str(error))+"</p><p>Close this window, resolve the problem and reopen Prism.</p>")
        finally:
            session.close()
    window.events.closed += session.stopping.set
    try:
        webview.start(start,gui="edgechromium",private_mode=False,storage_path=str(data/"browser"))
    finally:
        session.close()


if __name__=="__main__":
    if "--backend" in sys.argv:
        backend()
    else:
        main()
