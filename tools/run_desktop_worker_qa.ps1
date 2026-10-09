param(
 [string]$ExecutablePath,
 [string]$FixturePath,
 [string]$OutputDirectory,
 [string]$ExpectedExecutableSha256,
 [string]$ExpectedFixtureSha256
)
$ErrorActionPreference = 'Stop'
function Get-WorkerQaProfileEnvironment {
 $exists = Test-Path Env:WEBVIEW2_USER_DATA_FOLDER
 $value = if ($exists) { (Get-Item Env:WEBVIEW2_USER_DATA_FOLDER).Value } else { $null }
 $kind = if (-not $exists) { 'absent' } elseif ($null -eq $value) { 'null' } elseif ($value -eq '') { 'empty' } else { 'path' }
 return @{ exists=$exists; value=$value; kind=$kind }
}
function Restore-WorkerQaProfileEnvironment($before) {
 if ($before.exists) { Set-Item Env:WEBVIEW2_USER_DATA_FOLDER -Value $before.value }
 else { Remove-Item Env:WEBVIEW2_USER_DATA_FOLDER -ErrorAction SilentlyContinue }
 return Get-WorkerQaProfileEnvironment
}
function Test-WorkerQaProfileEnvironmentExact($before,$after) {
 return ($before.exists -eq $after.exists -and $before.kind -eq $after.kind -and $before.value -ceq $after.value)
}
# Dot-source exposes only CPU environment helpers; it never launches an app.
if ($MyInvocation.InvocationName -eq '.') { return }
foreach ($required in @($ExecutablePath,$FixturePath,$OutputDirectory,$ExpectedExecutableSha256,$ExpectedFixtureSha256)) {
 if ([string]::IsNullOrWhiteSpace($required)) { throw 'All explicit launcher paths and SHA-256 values are required' }
}
$taskExe = (Resolve-Path -LiteralPath $ExecutablePath).Path
$taskFixture = (Resolve-Path -LiteralPath $FixturePath).Path
if ((Get-FileHash -LiteralPath $taskExe -Algorithm SHA256).Hash.ToLowerInvariant() -ne $ExpectedExecutableSha256) { throw 'Executable SHA mismatch' }
if ((Get-FileHash -LiteralPath $taskFixture -Algorithm SHA256).Hash.ToLowerInvariant() -ne $ExpectedFixtureSha256) { throw 'Fixture SHA mismatch' }
if (Test-Path -LiteralPath $OutputDirectory) { throw 'Output directory must be fresh; no overwrite or retry' }
$taskOut = (New-Item -ItemType Directory -Path $OutputDirectory).FullName
$taskReport = Join-Path $taskOut 'raw.json'
$taskProfile = Join-Path $taskOut 'profile'
$taskBefore = Get-WorkerQaProfileEnvironment
$taskProc = $null
try {
 Set-Item Env:WEBVIEW2_USER_DATA_FOLDER -Value $taskProfile
 $taskChildEnvironment = Get-WorkerQaProfileEnvironment
 $taskArgs = @('--smoke-report',('"' + $taskReport + '"'),'--smoke-fixture',('"' + $taskFixture + '"'))
 $taskProc = Start-Process -FilePath $taskExe -ArgumentList $taskArgs -WindowStyle Hidden -PassThru
} finally {
 $taskAfter = Restore-WorkerQaProfileEnvironment $taskBefore
 $taskEnvironmentExact = Test-WorkerQaProfileEnvironmentExact $taskBefore $taskAfter
 @{ before=$taskBefore; child=$taskChildEnvironment; after=$taskAfter; exact=$taskEnvironmentExact; process=$PID } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $taskOut 'environment.json') -Encoding utf8
}
if ($null -eq $taskProc) { throw 'No executable process created' }
@{pid=$taskProc.Id; launchedAtUtc=[DateTime]::UtcNow.ToString('o'); executable=$taskExe; executableSha256=$ExpectedExecutableSha256; fixture=$taskFixture; fixtureSha256=$ExpectedFixtureSha256; args=$taskArgs; profile=$taskProfile; launchCount=1} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $taskOut 'launch.json') -Encoding utf8
Write-Output ('LAUNCHED PID ' + $taskProc.Id + '; parent environment exact: ' + $taskEnvironmentExact)
# Up to seven live observations of the full descendant tree, before WaitForExit.
$taskObservations = @()
for ($taskObservation=0; $taskObservation -lt 7; $taskObservation++) {
 $taskProc.Refresh()
 if ($taskProc.HasExited) { break }
 $taskProcesses = @(Get-CimInstance Win32_Process)
 $taskIds = @($taskProc.Id)
 do {
  $taskNewIds = @($taskProcesses | Where-Object { $_.ParentProcessId -in $taskIds -and $_.ProcessId -notin $taskIds } | ForEach-Object { $_.ProcessId })
  $taskIds += $taskNewIds
 } while ($taskNewIds.Count -gt 0)
 $taskChildren = @($taskProcesses | Where-Object { $_.ProcessId -in $taskIds } | ForEach-Object {
  @{pid=$_.ProcessId;parentPid=$_.ParentProcessId;name=$_.Name;commandLine=$_.CommandLine;isWebView2=($_.Name -eq 'msedgewebview2.exe');mentionsExclusiveProfile=([string]$_.CommandLine).ToLowerInvariant().Contains($taskProfile.ToLowerInvariant())}
 })
 $taskObservations += @{atUtc=[DateTime]::UtcNow.ToString('o');rootPid=$taskProc.Id;children=$taskChildren}
 Start-Sleep -Milliseconds 100
}
@{observations=$taskObservations;scope='Live CIM descendant observations only; missing command line or absent child observation is not profile proof.'} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $taskOut 'live-processes.json') -Encoding utf8
$taskProc.WaitForExit()
@{pid=$taskProc.Id;exitedAtUtc=[DateTime]::UtcNow.ToString('o');exitCode=$taskProc.ExitCode;parentProfileRestoredExact=$taskEnvironmentExact;reportExists=(Test-Path -LiteralPath $taskReport)} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskOut 'exit.json') -Encoding utf8
