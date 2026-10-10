from pathlib import Path

root=Path(SPECPATH).parent
# Only the launcher is frozen; standard portable Python runs CLIP and its children.
a=Analysis([str(root/'packaging/desktop_entry.py')],pathex=[],binaries=[],datas=[],hiddenimports=[])
pyz=PYZ(a.pure)
exe=EXE(pyz,a.scripts,[],exclude_binaries=True,name='Prism',console=True,hide_console='hide-early',
        icon=str(root/'output/packaging/prism.ico'),upx=False)
coll=COLLECT(exe,a.binaries,a.datas,strip=False,upx=False,name='Prism')
