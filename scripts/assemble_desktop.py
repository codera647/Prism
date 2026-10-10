"""Attach an isolated, version-verified CPython runtime to the small launcher."""
import argparse
from importlib import metadata
import json
from pathlib import Path
import shutil
import subprocess
import sys


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--dist',type=Path,default=Path('dist/Prism'))
    args=parser.parse_args()
    root=Path(__file__).resolve().parents[1]
    base=Path(sys.base_prefix)
    runtime=args.dist.resolve()/'_internal/python'
    runtime.mkdir(parents=True,exist_ok=True)
    for name in ('python.exe','pythonw.exe','python3.dll',f'python{sys.version_info.major}{sys.version_info.minor}.dll','vcruntime140.dll','vcruntime140_1.dll','LICENSE.txt'):
        shutil.copy2(base/name,runtime/name)
    shutil.copytree(base/'DLLs',runtime/'DLLs',dirs_exist_ok=True)
    def ignore_stdlib(directory,names):
        return [name for name in names if name in {'site-packages','__pycache__','test','tests','idlelib','tkinter','ensurepip'}]
    shutil.copytree(base/'Lib',runtime/'Lib',ignore=ignore_stdlib,dirs_exist_ok=True)
    packages=runtime/'Lib/site-packages'
    source_packages=Path(metadata.distribution('prism-creative').locate_file('')).resolve()
    if source_packages==base/'Lib/site-packages':
        raise RuntimeError('Build inside a dedicated venv to avoid bundling unrelated global packages.')
    def ignore_packages(directory,names):
        return [name for name in names if name=='__pycache__' or name.endswith('.pth') or name.startswith('__editable__') or name in {'prism','prism_creative.egg-info'} or name.startswith('prism_creative-')]
    shutil.copytree(source_packages,packages,ignore=ignore_packages,dirs_exist_ok=True)
    shutil.copytree(root/'src/prism',packages/'prism',ignore=shutil.ignore_patterns('__pycache__'),dirs_exist_ok=True)
    from prism import __version__
    distribution=packages/f'prism_creative-{__version__}.dist-info'
    distribution.mkdir(exist_ok=True)
    distribution.joinpath('METADATA').write_text(f'Metadata-Version: 2.3\nName: prism-creative\nVersion: {__version__}\n',encoding='utf-8')
    distribution.joinpath('INSTALLER').write_text('Prism portable assembler\n',encoding='utf-8')
    pth=runtime/f'python{sys.version_info.major}{sys.version_info.minor}._pth'
    pth.write_text('.\nDLLs\nLib\nLib/site-packages\nimport site\n',encoding='utf-8')
    seed=root/'output/model-seed'
    manifest=json.loads((seed/'manifest.json').read_text())
    model=args.dist.resolve()/'_internal/prism_model'
    model.mkdir(exist_ok=True)
    for name in ('manifest.json',manifest['file']):shutil.copy2(seed/name,model/name)
    shutil.copy2(root/'packaging/THIRD_PARTY_NOTICES.md',args.dist/'THIRD_PARTY_NOTICES.md')
    shutil.copy2(root/'packaging/DESKTOP_README.txt',args.dist/'README.txt')
    result=subprocess.run([str(runtime/'python.exe'),'-c',"import sys,torch,torchvision,prism; from importlib.metadata import version; assert version('prism-creative') == prism.__version__; print(sys.version); print(torch.__version__, torchvision.__version__); print(sys.prefix)"],capture_output=True,text=True,check=True)
    print(result.stdout)


if __name__=='__main__':
    main()
