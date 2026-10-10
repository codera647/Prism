import json
from pathlib import Path
import subprocess
import sys
import pytest
from trailforge.core import ContractError
from trailforge.ports import AdapterCapabilities, FunctionAdapter, VerifiedResult
from trailforge.runtime import Goal,Harness,Task


def test_actual_process_death_holds_before_explicit_retry(tmp_path):
    script=tmp_path/'crash_host.py'
    script.write_text('''import os,sys
from pathlib import Path
from trailforge.ports import AdapterCapabilities,FunctionAdapter,VerifiedResult
from trailforge.runtime import Goal,Harness,Task
def work(r):os._exit(17)
def check(r):return VerifiedResult('PASS',r.goal_digest,{})
adapters=[FunctionAdapter(AdapterCapabilities('work/1','TOOL'),work),FunctionAdapter(AdapterCapabilities('check/1','VERIFY'),check)]
goal=Goal('test','process','Recover a bounded pure callback after real process death',(Task('work','work/1',{}),Task('verify','check/1',{},('work',))),('verify',))
h=Harness(sys.argv[1],tenant_id='test',resource_id='process',adapters=adapters,lease_seconds=1,clock=lambda:0)
rid=h.start(goal)
Path(sys.argv[2]).write_text(rid)
h.advance(rid,goal)
''')
    authority=tmp_path/'authority.sqlite3';idfile=tmp_path/'run.txt'
    result=subprocess.run([sys.executable,str(script),str(authority),str(idfile)],timeout=20)
    assert result.returncode==17
    calls=[]
    def work(r):calls.append(r.task_id);return {'observed':'pure result'}
    def check(r):return VerifiedResult('PASS',r.goal_digest,{'observed':r.dependencies['work']})
    adapters=[FunctionAdapter(AdapterCapabilities('work/1','TOOL'),work),FunctionAdapter(AdapterCapabilities('check/1','VERIFY'),check)]
    goal=Goal('test','process','Recover a bounded pure callback after real process death',(Task('work','work/1',{}),Task('verify','check/1',{},('work',))),('verify',))
    h=Harness(authority,tenant_id='test',resource_id='process',adapters=adapters,lease_seconds=1,clock=lambda:2)
    rid=idfile.read_text()
    held=h.advance(rid,goal)
    assert held['state']=='WAITING_HUMAN' and held['tasks']['work']['status']=='UNKNOWN'
    assert held['units_reserved']==1 and calls==[]
    h.advance(rid,goal);assert calls==[]
    h.resolve_unknown(rid,goal,'work',disposition='RETRY')
    finished=h.advance(rid,goal)
    assert finished['state']=='COMPLETED' and finished['units_reserved']==3
    assert finished['tasks']['work']['attempts']==2


def test_native_task_and_encoded_payload_bounds(tmp_path):
    def check(r):return VerifiedResult('PASS',r.goal_digest,{})
    adapters=[FunctionAdapter(AdapterCapabilities('check/1','VERIFY'),check)]
    h=Harness(tmp_path/'authority.sqlite3',tenant_id='test',resource_id='bounds',adapters=adapters)
    with pytest.raises(ContractError):
        h.start(Goal('test','bounds','Reject oversized encoded UTF-8 payloads',(Task('verify','check/1',{'value':'😀'*20000}),),('verify',)))
    with pytest.raises(ContractError):
        h.start(Goal('test','bounds','Reject too many tasks',tuple(Task(str(i),'check/1',{}) for i in range(129)),('128',)))
