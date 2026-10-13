# Use a standard Node installation when available; otherwise use the local Codex runtime.
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskSystemNpm = Get-Command npm.cmd -ErrorAction SilentlyContinue
Push-Location -LiteralPath $taskRoot
try {
    if ($taskSystemNpm) {
        & $taskSystemNpm.Source @args
    } else {
        $taskRuntimeRoot = Join-Path $env:LOCALAPPDATA 'OpenAI/Codex/runtimes/cua_node'
        $taskNode = Get-ChildItem -LiteralPath $taskRuntimeRoot -Filter node.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        $taskNpmCli = Join-Path $taskRoot '.tools/npm/package/bin/npm-cli.js'
        if (!$taskNode -or !(Test-Path -LiteralPath $taskNpmCli)) {
            throw 'Node.js 24 LTS(24.15 이상)를 설치한 후 npm install을 실행하세요.'
        }
        $env:PATH = $taskNode.DirectoryName + ';' + $env:PATH
        & $taskNode.FullName $taskNpmCli @args
    }
    $taskExitCode = $LASTEXITCODE
} finally {
    Pop-Location
}
exit $taskExitCode
