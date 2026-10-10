param(
    [Parameter(Mandatory=$true)][string]$Executable,
    [Parameter(Mandatory=$true)][ValidatePattern('^[a-fA-F0-9]{64}$')][string]$ExecutableSha256,
    [Parameter(Mandatory=$true)][string]$Fixture,
    [Parameter(Mandatory=$true)][ValidatePattern('^[a-fA-F0-9]{64}$')][string]$FixtureSha256,
    [Parameter(Mandatory=$true)][string]$OutputDirectory
)
$ErrorActionPreference = 'Stop'
$exePath = (Resolve-Path -LiteralPath $Executable).Path
$fixturePath = (Resolve-Path -LiteralPath $Fixture).Path
$outputPath = [System.IO.Path]::GetFullPath($OutputDirectory)
if ((Get-FileHash -LiteralPath $exePath -Algorithm SHA256).Hash -ne $ExecutableSha256) { throw 'Executable digest mismatch' }
if ((Get-FileHash -LiteralPath $fixturePath -Algorithm SHA256).Hash -ne $FixtureSha256) { throw 'Fixture digest mismatch' }
if (Test-Path -LiteralPath $outputPath) { throw 'Use a new output directory; prior evidence is never overwritten' }
if (Get-Process -Name ([System.IO.Path]::GetFileNameWithoutExtension($exePath)) -ErrorAction SilentlyContinue) { throw 'Another game process is active; reserve native rendering before running' }
New-Item -ItemType Directory -Path $outputPath | Out-Null
function Save-Receipt($value, $path) { $value | ConvertTo-Json -Depth 40 | Set-Content -LiteralPath $path -Encoding utf8 }
function Quoted-Argument([string]$value) {
    if ($value.Contains('"')) { throw 'Unexpected quote in path' }
    return '"' + $value + '"'
}
$previousProfile = [Environment]::GetEnvironmentVariable('WEBVIEW2_USER_DATA_FOLDER', 'Process')
$receipt = [ordered]@{
    executable=$exePath; executableSha256=$ExecutableSha256.ToLowerInvariant()
    fixture=$fixturePath; fixtureSha256=$FixtureSha256.ToLowerInvariant()
    helperPid=$PID; order=@('A','B','B','A'); runs=@(); complete=$false
    scope='Local saved-world AB/BA loading diagnostic. A=original serial order; B=complete crop pair overlap. Fresh WebView2 profiles; OS/file caches are not reset. Existing native 90-second readiness and 300-second visibility gates remain. No physical input, GPU timers, peak-memory measurement or statistical performance acceptance.'
}
$receiptPath = Join-Path $outputPath 'receipt.json'
$ownedProcess = $null
try {
    for ($index=0; $index -lt $receipt.order.Count; $index++) {
        if ((Get-FileHash -LiteralPath $exePath -Algorithm SHA256).Hash -ne $ExecutableSha256) { throw 'Executable changed during comparison' }
        if ((Get-FileHash -LiteralPath $fixturePath -Algorithm SHA256).Hash -ne $FixtureSha256) { throw 'Fixture changed during comparison' }
        $mode = $receipt.order[$index]
        $runPath = Join-Path $outputPath ('{0}-{1}' -f ($index+1), $mode)
        New-Item -ItemType Directory -Path $runPath | Out-Null
        $profilePath = Join-Path $runPath 'webview-profile'
        $reportPath = Join-Path $runPath 'desktop-smoke.json'
        [Environment]::SetEnvironmentVariable('WEBVIEW2_USER_DATA_FOLDER', $profilePath, 'Process')
        $arguments = @('--smoke-report', (Quoted-Argument $reportPath), '--smoke-fixture', (Quoted-Argument $fixturePath), '--smoke-loading-trace')
        if ($mode -eq 'B') { $arguments += '--smoke-crop-pair-overlap' }
        $entry = [ordered]@{ mode=$mode; arguments=$arguments; profile=$profilePath; report=$reportPath; startedAt=[DateTime]::UtcNow.ToString('o'); status='running' }
        $ownedProcess = Start-Process -FilePath $exePath -ArgumentList $arguments -WindowStyle Hidden -PassThru
        $entry.pid = $ownedProcess.Id
        $receipt.runs += $entry
        Save-Receipt $receipt $receiptPath
        $watch = [System.Diagnostics.Stopwatch]::StartNew()
        while (-not $ownedProcess.WaitForExit(1000)) {
            if ($watch.ElapsedMilliseconds -ge 900000) { throw 'Native fixture process exceeded its unchanged 900000 ms watchdog' }
        }
        $entry.exitCode = $ownedProcess.ExitCode
        $entry.processElapsedMs = $watch.ElapsedMilliseconds
        $entry.finishedAt = [DateTime]::UtcNow.ToString('o')
        $entry.status = 'finished'
        if (-not (Test-Path -LiteralPath $reportPath)) { throw 'Native report missing' }
        $entry.reportSha256 = (Get-FileHash -LiteralPath $reportPath -Algorithm SHA256).Hash.ToLowerInvariant()
        $report = Get-Content -LiteralPath $reportPath -Raw | ConvertFrom-Json
        $entry.worldWaitMs = $report.checks.loadingAtFinish.worldWaitMs
        $entry.ok = $report.ok
        Save-Receipt $receipt $receiptPath
        if ($entry.exitCode -ne 0 -or $report.ok -ne $true -or $report.checks.visibility.passed -ne $true) { throw 'Native acceptance failed; retained original report and stopped comparison' }
        if ($report.checks.loadingRecipe.cropPairOverlap -ne ($mode -eq 'B')) { throw 'Requested recipe did not match native report' }
        $join = @($report.checks.nativeLoadingTrace.completed | Where-Object { $_.label -eq 'load-crop-pair-join' })
        if (($mode -eq 'B' -and $join.Count -ne 1) -or ($mode -eq 'A' -and $join.Count -ne 0)) { throw 'Native phase evidence did not match selected scheduling' }
        if ($report.checks.nativeLoadingTrace.droppedLabels -ne 0 -or $report.checks.nativeLoadingTrace.droppedPending -ne 0) { throw 'Attribution overflowed' }
        if ($report.checks.nativeLoadingTrace.graphics.available -ne $true) { throw 'Renderer identity unavailable' }
        $control = [ordered]@{ renderer=$report.checks.nativeLoadingTrace.graphics; width=$report.checks.world.width; height=$report.checks.world.height }
        $controlJson = $control | ConvertTo-Json -Depth 20 -Compress
        if ($index -eq 0) { $receipt.renderControl = $control; $firstControlJson = $controlJson }
        elseif ($controlJson -ne $firstControlJson) { throw 'Renderer or viewport changed between runs' }
        if ($null -eq $entry.worldWaitMs -or [double]::IsNaN([double]$entry.worldWaitMs) -or [double]::IsInfinity([double]$entry.worldWaitMs) -or [double]$entry.worldWaitMs -le 0) { throw 'Invalid readiness timing' }
        Write-Output ('{0}: ready in {1} ms; original report retained' -f $mode, $entry.worldWaitMs)
        $ownedProcess.Dispose(); $ownedProcess = $null
    }
    $receipt.complete = $true
    Save-Receipt $receipt $receiptPath
} catch {
    if ($null -ne $entry) { $entry.status = 'failed' }
    $receipt.error = $_.Exception.Message
    Save-Receipt $receipt $receiptPath
    throw
} finally {
    if ($null -ne $ownedProcess) {
        if (-not $ownedProcess.HasExited) { $ownedProcess.Kill() }
        $ownedProcess.Dispose()
    }
    [Environment]::SetEnvironmentVariable('WEBVIEW2_USER_DATA_FOLDER', $previousProfile, 'Process')
}
