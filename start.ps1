$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$prismPython = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $prismPython)) {
    throw 'Run setup.ps1 first.'
}
& $prismPython -m prism.cli serve
exit $LASTEXITCODE
