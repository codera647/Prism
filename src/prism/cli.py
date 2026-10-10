import argparse
from contextlib import contextmanager
import json
import os
from pathlib import Path

from filelock import FileLock, Timeout
from .domain import Settings


@contextmanager
def authority_lock(settings):
    settings.data.mkdir(parents=True, exist_ok=True)
    try:
        with FileLock(str(settings.data / "host.lock"), timeout=1):
            yield
    except Timeout:
        raise SystemExit("This Prism data directory is already in use. Stop the running server before backup or restore.") from None


def main():
    parser = argparse.ArgumentParser(prog="prism", description="Private, local creative exploration")
    sub = parser.add_subparsers(dest="command", required=True)
    serve = sub.add_parser("serve")
    serve.add_argument("--host", default=os.getenv("PRISM_HOST", "127.0.0.1"))
    serve.add_argument("--port", type=int, default=int(os.getenv("PRISM_PORT", "8000")))
    sub.add_parser("model-download", help="Download CLIP weights once; no customer data is sent")
    sub.add_parser("doctor", help="Show installed versions, model status and storage")
    b = sub.add_parser("backup", help="Stop Prism first; save a private backup outside the data directory")
    b.add_argument("path")
    r = sub.add_parser("restore", help="Stop Prism first; retain live deletion ledger and spent units")
    r.add_argument("path")
    d = sub.add_parser("develop", help="Run configured user-owned coding agents through Develop")
    d.add_argument("config")
    d.add_argument("--run-id")
    d.add_argument("--pause-after")
    args = parser.parse_args()
    settings = Settings.environment()
    if args.command == "serve":
        if args.host not in ("127.0.0.1", "localhost", "::1"):
            raise SystemExit("This release is local-only. Use the documented reverse-proxy review before network deployment.")
        os.environ["PRISM_ORIGIN"] = os.getenv("PRISM_ORIGIN", f"http://{args.host}:{args.port}")
        from .api import create_app
        import uvicorn
        with authority_lock(settings):
            uvicorn.run(create_app(Settings.environment()), host=args.host, port=args.port, access_log=False, workers=1)
    elif args.command == "model-download":
        from .encoder import download_model
        with authority_lock(settings):
            print(json.dumps(download_model(settings.data / "models"), indent=2))
    elif args.command == "doctor":
        from importlib.metadata import version, distribution
        from .encoder import ClipEncoder
        model = ClipEncoder(settings.data / "models")
        direct = distribution("trailforge").read_text("direct_url.json")
        print(json.dumps({"python": __import__('sys').version, "data": str(settings.data),
                          "packages": {p: version(p) for p in ("prism-creative", "trailforge", "fastapi", "open_clip_torch", "torch")},
                          "trailforge_source": json.loads(direct) if direct else None,
                          "model": model.manifest, "paid_providers": False}, indent=2))
    elif args.command in ("backup", "restore"):
        from .operations import backup, restore
        with authority_lock(settings):
            print(json.dumps((backup if args.command == "backup" else restore)(settings, args.path), indent=2))
    elif args.command == "develop":
        from .develop import run
        print(json.dumps(run(args.config, args.run_id, args.pause_after), indent=2))


if __name__ == "__main__":
    main()
