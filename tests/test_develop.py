import json
from pathlib import Path
import sys
import pytest
from trailforge.core import ContractError
from prism.develop import compose, run


def test_command_agents_protected_verifier_and_changed_candidate(tmp_path):
    candidate, checks = tmp_path / "candidate", tmp_path / "checks"
    candidate.mkdir(); checks.mkdir()
    agents = tmp_path / "host_agent.py"
    agents.write_text('''import sys,json
request=json.load(sys.stdin)
if request['phase']=='BUILD':
 print(json.dumps({'files':{'answer.txt':'bounded candidate'},'summary':'wrote the allowed file'}))
else:
 print(json.dumps({'phase':request['phase'],'observed':True}))
''')
    verifier = checks / "check.py"
    verifier.write_text('''import sys,json,pathlib
request=json.load(sys.stdin)
value=(pathlib.Path(request['candidate'])/'answer.txt').read_text()
print(json.dumps({'passed':value=='bounded candidate','criteria':{'exact_candidate_content':value=='bounded candidate'}}))
''')
    command = [sys.executable, str(agents)]
    config = {"candidate": "candidate", "checks": "checks", "authority": "developer.sqlite3",
              "allowed_paths": ["answer.txt"], "objective": "Create a bounded candidate and verify its exact contents",
              "milestone": "test-milestone", "agents": {p: command for p in ("PLAN", "RESEARCH", "BUILD", "DEBUG")},
              "verify_command": [sys.executable, str(verifier)]}
    path = tmp_path / "config.json"
    path.write_text(json.dumps(config))
    partial = run(path, pause_after="1:BUILD")
    assert partial["state"] == "CHECKING" and (candidate / "answer.txt").read_text() == "bounded candidate"
    handoff = run(path, partial["run_id"])
    assert handoff["state"] == "COMPLETED"
    assert handoff["execution_mode"] == "TRUSTED_HOST_CALLBACKS" and handoff["linux_isolation_verified"] is False
    (candidate / "answer.txt").write_text("changed after verification")
    with pytest.raises(ContractError):
        run(path, handoff["run_id"])
