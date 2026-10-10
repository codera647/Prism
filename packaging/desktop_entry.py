"""Small native launcher for an isolated portable Python application."""
import os
from pathlib import Path
import subprocess
import sys


def inherited_stream(kind, mode):
    """Recover redirected handles hidden by PyInstaller's windowed bootloader."""
    stream = getattr(sys, kind)
    if stream is not None or os.name != 'nt':
        return stream
    import ctypes
    import msvcrt
    from ctypes import wintypes
    kernel = ctypes.WinDLL('kernel32', use_last_error=True)
    kernel.GetStdHandle.argtypes = [wintypes.DWORD]
    kernel.GetStdHandle.restype = wintypes.HANDLE
    kernel.GetCurrentProcess.restype = wintypes.HANDLE
    kernel.DuplicateHandle.argtypes = [wintypes.HANDLE, wintypes.HANDLE,
        wintypes.HANDLE, ctypes.POINTER(wintypes.HANDLE), wintypes.DWORD,
        wintypes.BOOL, wintypes.DWORD]
    handle = kernel.GetStdHandle({'stdin': -10, 'stdout': -11, 'stderr': -12}[kind])
    if handle in (None, ctypes.c_void_p(-1).value):
        return subprocess.DEVNULL
    duplicate = wintypes.HANDLE()
    owner = kernel.GetCurrentProcess()
    if not kernel.DuplicateHandle(owner, handle, owner, ctypes.byref(duplicate), 0, True, 2):
        return subprocess.DEVNULL
    flags = os.O_BINARY | (os.O_RDONLY if mode == 'rb' else os.O_WRONLY)
    return os.fdopen(msvcrt.open_osfhandle(duplicate.value, flags), mode)


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
    if os.name == 'nt':
        import ctypes
        # External CPython must not inherit the frozen launcher's DLL directory.
        ctypes.windll.kernel32.SetDllDirectoryW(None)
    result=subprocess.run(command,env=environment,
        stdin=inherited_stream('stdin', 'rb'), stdout=inherited_stream('stdout', 'wb'),
        stderr=inherited_stream('stderr', 'wb'),
        creationflags=subprocess.CREATE_NO_WINDOW if os.name=='nt' else 0)
    raise SystemExit(result.returncode)
