"""Small source-checkout checks for Prism's Trailforge planning decisions.

These are not installed-wheel conformance, model evaluation, or Prism tests.
Only synthetic data and temporary authority/candidate/check files are used.
"""
import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--source-root')
    mode.add_argument('--installed', action='store_true', help='Check the installed package, not a source checkout')
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    root = Path(args.source_root).resolve() if args.source_root else None
    sys.dont_write_bytecode = True
    if root:
        sys.path.insert(0, str(root / 'src'))
    from trailforge.core import ContractError
    from trailforge.develop import CandidateWorkspace, Develop
    from trailforge.ports import AdapterCapabilities, FunctionAdapter, VerifiedResult
    from trailforge.runtime import Goal, Harness, Task

    results = []

    def record(name, observation):
        results.append({'check': name, 'status': 'PASS', 'observation': observation})

    def must_deny(callback):
        try:
            callback()
        except ContractError:
            return
        raise AssertionError('Expected ContractError')

    with tempfile.TemporaryDirectory(prefix='prism-trailforge-checks-') as work:
        scratch = Path(work)
        calls = {'sum': 0}

        def total(request):
            calls['sum'] += 1
            return {'total': sum(request.input['values'])}

        def verify(request):
            observed = request.dependencies['sum']['total']
            return VerifiedResult('PASS' if observed == request.input['expected'] else 'FAIL',
                                  request.goal_digest, {'observed': observed})

        adapters = [
            FunctionAdapter(AdapterCapabilities('study.sum/1', 'TOOL'), total),
            FunctionAdapter(AdapterCapabilities('study.verify/1', 'VERIFY'), verify),
        ]
        goal = Goal('study-tenant', 'study-collection', 'Verify a synthetic sum',
                    (Task('sum', 'study.sum/1', {'values': [1, 2, 3]}),
                     Task('check', 'study.verify/1', {'expected': 6}, ('sum',))), ('check',))

        def host(path, registered=adapters, **options):
            return Harness(path, tenant_id=goal.tenant_id, resource_id=goal.resource_id,
                           adapters=registered, **options)

        first = host(scratch / 'resume.sqlite3')
        run_id = first.start(goal)
        assert first.advance(run_id, goal, pause_after='sum')['state'] == 'CHECKING'
        resumed = host(scratch / 'resume.sqlite3')
        complete = resumed.advance(run_id, goal)
        assert complete['state'] == 'COMPLETED' and complete['units_reserved'] == 2
        assert calls['sum'] == 1
        resumed.advance(run_id, goal)
        assert calls['sum'] == 1
        record('checkpoint_resume_and_terminal_replay',
               {'state': complete['state'], 'sum_callback_calls': calls['sum'], 'units': 2})

        attempts = {'count': 0}

        def uncertain(request):
            attempts['count'] += 1
            if attempts['count'] == 1:
                raise RuntimeError('synthetic response loss')
            return {'total': 6}

        unknown_adapters = [
            FunctionAdapter(AdapterCapabilities('study.sum/1', 'TOOL'), uncertain), adapters[1],
        ]
        uncertain_host = host(scratch / 'unknown.sqlite3', unknown_adapters)
        uncertain_run = uncertain_host.start(goal)
        waiting = uncertain_host.advance(uncertain_run, goal)
        assert waiting['state'] == 'WAITING_HUMAN' and waiting['units_reserved'] == 1
        uncertain_host.advance(uncertain_run, goal)
        assert attempts['count'] == 1
        uncertain_host.resolve_unknown(uncertain_run, goal, 'sum', disposition='RETRY')
        retried = uncertain_host.advance(uncertain_run, goal)
        assert retried['state'] == 'COMPLETED' and retried['units_reserved'] == 3
        assert retried['tasks']['sum']['attempts'] == 2
        record('unknown_requires_host_resolution_and_retains_units',
               {'automatic_retry': False, 'units_after_explicit_retry': 3})

        forged = [adapters[0], FunctionAdapter(
            AdapterCapabilities('study.verify/1', 'VERIFY'),
            lambda request: {'verdict': 'PASS', 'goal_digest': request.goal_digest, 'evidence': {}},
        )]
        forged_host = host(scratch / 'forged.sqlite3', forged)
        forged_run = forged_host.start(goal)
        rejected = forged_host.advance(forged_run, goal)
        assert rejected['state'] == 'WAITING_HUMAN'
        assert rejected['tasks']['check']['status'] == 'UNKNOWN'
        record('verdict_shaped_json_is_not_typed_verification', {'state': rejected['state']})

        wrong_scope = Goal('other-tenant', goal.resource_id, goal.objective,
                           goal.tasks, goal.required_checks)
        must_deny(lambda: first.start(wrong_scope))
        external = Goal(goal.tenant_id, goal.resource_id, goal.objective,
                        goal.tasks, goal.required_checks, ('EXTERNAL_WRITE',))
        must_deny(lambda: first.start(external))
        record('scope_and_external_effect_admission', {'cross_scope': 'DENIED', 'external_write': 'DENIED'})

        capped = host(scratch / 'limits.sqlite3', tenant_limit=2, global_limit=2)
        capped.advance(capped.start(goal), goal)
        reopened = host(scratch / 'limits.sqlite3', tenant_limit=2, global_limit=2)
        denied = reopened.advance(reopened.start(goal), goal)
        assert denied['state'] == 'WAITING_HUMAN'
        status = reopened.resource_status()
        assert status['scopes']['global']['reserved'] == 2
        assert status['monetary_guarantee'] is False
        record('shared_units_persist_and_are_not_money', status)

        candidate = CandidateWorkspace(scratch / 'candidate', allowed_paths=('result.json',))
        checks = scratch / 'protected-checks'
        checks.mkdir()
        (checks / 'expected.json').write_text('[1,2,3]', encoding='utf-8')

        def build(request):
            candidate.write('result.json', b'[1,2,3]')
            return {'written': 'result.json'}

        def check_candidate(request):
            expected = json.loads((checks / 'expected.json').read_text(encoding='utf-8'))
            observed = json.loads(candidate.read('result.json'))
            return VerifiedResult('PASS' if observed == expected else 'FAIL',
                                  request.goal_digest, {'matches_expected': observed == expected})

        phases = {phase: FunctionAdapter(
            AdapterCapabilities('study.' + phase.lower() + '/1', 'TOOL'),
            lambda request: {'phase': request.task_id},
        ) for phase in ('PLAN', 'RESEARCH', 'DEBUG')}
        phases['BUILD'] = FunctionAdapter(
            AdapterCapabilities('study.build/1', 'TOOL', 'CANDIDATE_WRITE'), build)
        phases['VERIFY'] = FunctionAdapter(
            AdapterCapabilities('study.check/1', 'VERIFY', 'SCOPED_READ'), check_candidate)

        def development_host():
            return Develop(scratch / 'develop.sqlite3', tenant_id='study-tenant',
                           resource_id='coding-milestone', objective='Write protected-fixture data',
                           workspace=candidate, checks=checks, adapters=phases)

        development = development_host()
        development_run = development.start()
        development.advance(development_run, pause_after='1:BUILD')
        development = development_host()
        development.advance(development_run)
        handoff = development.handoff(development_run)
        assert handoff['execution_mode'] == 'TRUSTED_HOST_CALLBACKS'
        assert handoff['linux_isolation_verified'] is False
        candidate.write('result.json', b'[3,2,1]')
        must_deny(lambda: development.handoff(development_run))
        record('develop_resume_and_changed_candidate_handoff_denial',
               {'phase_count': 6, 'changed_candidate': 'DENIED',
                'execution_mode': handoff['execution_mode'], 'linux_isolation_verified': False})

    if root:
        commit = subprocess.check_output(['git', '-C', str(root), 'rev-parse', 'HEAD'], text=True).strip()
        execution = 'source checkout imports; not installed-wheel conformance'
    else:
        from importlib.metadata import distribution
        package = distribution('trailforge')
        assert package.version == '0.1.0a1'
        direct = json.loads(package.read_text('direct_url.json'))
        commit = direct['vcs_info']['commit_id']
        assert commit == 'fbefaf40fb39a1429dcc328184372214f9fd849d'
        execution = 'installed package imports; six bounded mechanism checks, not full upstream conformance'
    report = {
        'date': '2026-10-10' if args.installed else '2026-10-08', 'release': 'v0.1.0a1', 'source_commit': commit,
        'execution': execution,
        'check_count': len(results), 'status': 'PASS', 'checks': results,
        'limits': ['Synthetic data only', 'No CLIP or provider calls', 'No Prism application implementation',
                   'No Docker, PostgreSQL, distributed, or full upstream conformance claim'],
    }
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'status': report['status'], 'checks': len(results), 'source_commit': commit}))


if __name__ == '__main__':
    main()
