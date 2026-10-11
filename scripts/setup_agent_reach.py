"""Optional pinned Agent Reach package in an isolated Prism-owned environment.

This does not run its system installer/doctor, import personal cookies, modify
Chrome, install OpenCLI or enable social-account access. Prism's production
research adapter uses the recommended upstream Exa MCP route directly.
"""
import argparse
import json
from pathlib import Path
import subprocess
import venv

PIN = "94f06c1969dfc1834001269d79d3ad0972d9dee6"
ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--install", action="store_true", help="Install the pinned package and declared dependencies in .prism/agent-reach-env")
    args = parser.parse_args()
    environment = (ROOT / ".prism/agent-reach-env").resolve()
    if not environment.is_relative_to((ROOT / ".prism").resolve()):
        raise RuntimeError("Environment path escaped the Prism workspace.")
    python = environment / ("Scripts/python.exe" if __import__("os").name == "nt" else "bin/python")
    if args.install:
        if not python.exists():
            venv.EnvBuilder(with_pip=True).create(environment)
        subprocess.run([str(python), "-m", "pip", "install", "git+https://github.com/Panniantong/agent-reach.git@" + PIN], check=True)
    if not python.exists():
        print(json.dumps({"installed": False, "pin": PIN, "production_route": "Exa MCP upstream HTTP", "install_flag_required": True}))
        return
    result = subprocess.run([str(python), "-c", "import json; from importlib.metadata import version; from agent_reach.channels.web import WebChannel; print(json.dumps({'package': version('agent-reach'), 'web_channel_import': True}))"], capture_output=True, text=True, check=True)
    print(result.stdout.strip())


if __name__ == "__main__":
    main()
