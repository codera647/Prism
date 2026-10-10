"""Small native launcher for an isolated portable Python application."""
import os
from pathlib import Path
import subprocess
import sys


if __name__ == '__main__':
    bundle=Path(getattr(sys,'_MEIPASS',Path(__file__).resolve().parent))
    python=bundle/'python/python.exe'
    args=sys.argv[1:]
    if args[:1]==['--cli']:
        command=[str(python),'-m','prism.cli',*args[1:]]
    elif args[:1]==['--decode-worker']:
        command=[str(python),'-m','prism.decode_worker',*args[1:]]
    else:
        command=[str(python),'-m','prism.desktop',*args]
        if '--backend' not in args and '--seed' not in args:
            command+=['--seed',str(bundle/'prism_model')]
    environment=os.environ.copy()
    environment.pop('PYTHONPATH',None)
    environment['PYTHONNOUSERSITE']='1'
    result=subprocess.run(command,env=environment,creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)
    raise SystemExit(result.returncode)
