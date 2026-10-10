$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath '.venv\Scripts\python.exe')) {
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
$prismPython = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
& $prismPython -m pip install -r requirements.lock
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $prismPython -m pip install --no-deps -e .
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $prismPython -m prism.cli model-download
exit $LASTEXITCODE
