"""Connect user-owned command agents to Develop, with independent host checks."""
from dataclasses import asdict
import json
from pathlib import Path
import subprocess
import tempfile

from trailforge.develop import CandidateWorkspace, Develop
from trailforge.ports import AdapterCapabilities, FunctionAdapter, VerifiedResult
from .domain import Problem, atomic_json, fingerprint


def command(argv, payload, cwd, seconds=60):
    if not isinstance(argv, list) or not argv or not all(isinstance(x, str) for x in argv):
        raise ValueError("Agent commands must be explicit argument arrays, not shell strings")
    # Spool bounded output to disk instead of accumulating an agent's unbounded stdout in RAM.
    with tempfile.TemporaryFile() as output, tempfile.TemporaryFile() as errors:
        result = subprocess.run(argv, input=json.dumps(payload).encode(), stdout=output, stderr=errors,
                                cwd=cwd, timeout=seconds, shell=False)
        output.seek(0)
        raw = output.read(65537)
        if result.returncode or len(raw) > 65536:
            raise RuntimeError("Configured command failed or exceeded its output bound")
        return json.loads(raw)


def compose(config_path):
    config_path = Path(config_path).resolve()
    config = json.loads(config_path.read_text(encoding="utf-8"))
    base = config_path.parent
    candidate = (base / config["candidate"]).resolve()
    checks = (base / config["checks"]).resolve()
    authority = (base / config.get("authority", "authority.sqlite3")).resolve()
    if authority.is_relative_to(candidate) or authority.is_relative_to(checks):
        raise ValueError("Developer authority must be outside candidate and protected checks")
    workspace = CandidateWorkspace(candidate, allowed_paths=tuple(config["allowed_paths"]))
    identity = fingerprint(config)
    adapters = {}
    for phase in ("PLAN", "RESEARCH", "BUILD", "DEBUG", "VERIFY"):
        def handler(request, phase=phase):
            payload = {"phase": phase, "request": asdict(request), "candidate": str(candidate),
                       "checks": str(checks), "allowed_paths": list(workspace.paths)}
            if phase == "VERIFY":
                # Verification authority comes from host-owned criteria, never agent JSON PASS.
                check = command(config["verify_command"], payload, checks)
                if type(check) is not dict or type(check.get("passed")) is not bool or not check.get("criteria"):
                    raise ValueError("Protected check must return a boolean passed and nonempty criteria evidence")
                return VerifiedResult("PASS" if check["passed"] else "FAIL", request.goal_digest, check)
            result = command(config["agents"][phase], payload, candidate)
            if phase == "BUILD":
                files = result.get("files", {})
                if not isinstance(files, dict) or not set(files) <= set(workspace.paths):
                    raise ValueError("BUILD returned files outside the candidate allowlist")
                for name, content in files.items():
                    if not isinstance(content, str):
                        raise ValueError("Candidate contents must be UTF-8 strings")
                    workspace.write(name, content.encode())
                result = {"written_paths": list(files), "summary": result.get("summary", "")}
            return result
        effect = "CANDIDATE_WRITE" if phase == "BUILD" else "SCOPED_READ"
        adapters[phase] = FunctionAdapter(AdapterCapabilities(f"prism-host/{phase.lower()}/{identity}", "VERIFY" if phase == "VERIFY" else "TOOL", effect), handler)
    return Develop(authority, tenant_id=config.get("tenant", "prism-developer"), resource_id=config["milestone"],
                   objective=config["objective"], workspace=workspace, checks=checks, adapters=adapters,
                   rounds=config.get("rounds", 1), budget_units=config.get("budget_units", 32), lease_seconds=90)


def run(config, run_id=None, pause_after=None):
    develop = compose(config)
    run_id = run_id or develop.start()
    record = develop.advance(run_id, pause_after=pause_after)
    result = develop.handoff(run_id) if record["state"] == "COMPLETED" else develop.continuity(run_id)
    return result
