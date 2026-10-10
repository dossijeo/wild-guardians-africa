param(
    [Parameter(Mandatory=$true)][string]$Executable,
    [Parameter(Mandatory=$true)][ValidatePattern('^[a-fA-F0-9]{64}$')][string]$ExecutableSha256,
    [Parameter(Mandatory=$true)][ValidatePattern('^[a-fA-F0-9]{40}$')][string]$SourceCommit,
    [Parameter(Mandatory=$true)][string]$Fixture,
    [Parameter(Mandatory=$true)][ValidatePattern('^[a-fA-F0-9]{64}$')][string]$FixtureSha256,
    [Parameter(Mandatory=$true)][string]$OutputDirectory,
    [ValidateSet('initial','plant','plant65')][string]$Capture='initial'
)
$ErrorActionPreference='Stop'
$exePath=(Resolve-Path -LiteralPath $Executable).Path
$fixturePath=(Resolve-Path -LiteralPath $Fixture).Path
$outputPath=[IO.Path]::GetFullPath($OutputDirectory)
if((Get-FileHash -LiteralPath $exePath -Algorithm SHA256).Hash -ne $ExecutableSha256){throw 'Executable digest mismatch'}
if((Get-FileHash -LiteralPath $fixturePath -Algorithm SHA256).Hash -ne $FixtureSha256){throw 'Fixture digest mismatch'}
if(Test-Path -LiteralPath $outputPath){throw 'Prior evidence exists; use a new output directory'}
if(Get-Process -Name ([IO.Path]::GetFileNameWithoutExtension($exePath)) -ErrorAction SilentlyContinue){throw 'Another game process is active; reserve native rendering'}
function Quoted-Argument([string]$value){
    if($value.Contains('"')){throw 'Unexpected quote in path'}
    return '"'+$value+'"'
}
# Quote paths before creating output or starting anything. No shell interpolation.
$reportPath=Join-Path $outputPath 'desktop-smoke.json'
$arguments=@('--smoke-report',(Quoted-Argument $reportPath),'--smoke-fixture',(Quoted-Argument $fixturePath),'--smoke-visual')
if($Capture -ne 'initial'){$arguments+='--smoke-visual-plant'}
if($Capture -eq 'plant65'){$arguments+='--smoke-visual-plant-progress65'}
New-Item -ItemType Directory -Path $outputPath | Out-Null
$profilePath=Join-Path $outputPath 'webview-profile'
$receiptPath=Join-Path $outputPath 'receipt.json'
$previousProfile=[Environment]::GetEnvironmentVariable('WEBVIEW2_USER_DATA_FOLDER','Process')
$receipt=[ordered]@{
    source=$SourceCommit.ToLowerInvariant();executable=$exePath;executableSha256=$ExecutableSha256.ToLowerInvariant()
    fixture=$fixturePath;fixtureSha256=$FixtureSha256.ToLowerInvariant();capture=$Capture;arguments=$arguments
    helperPid=$PID;profile=$profilePath;startedAt=[DateTime]::UtcNow.ToString('o');complete=$false
    scope='Opt-in native loading canvas readback. Synthetic plantAt only when requested. Requires collector/CLI support in the pinned source. Readback overhead excludes timing claims; not composited HTML, physical input, all-biome or production acceptance.'
}
function Save-Receipt {$receipt | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $receiptPath -Encoding utf8}
$ownedProcess=$null
try{
    [Environment]::SetEnvironmentVariable('WEBVIEW2_USER_DATA_FOLDER',$profilePath,'Process')
    $ownedProcess=Start-Process -FilePath $exePath -ArgumentList $arguments -WindowStyle Hidden -PassThru
    $receipt.pid=$ownedProcess.Id;Save-Receipt
    Write-Output ('Owned native visual PID '+$ownedProcess.Id)
    $watch=[Diagnostics.Stopwatch]::StartNew()
    while(-not $ownedProcess.WaitForExit(1000)){
        if($watch.ElapsedMilliseconds -ge 900000){throw 'Native fixture process exceeded unchanged900000ms watchdog'}
    }
    $receipt.exitCode=$ownedProcess.ExitCode;$receipt.finishedAt=[DateTime]::UtcNow.ToString('o')
    if(-not(Test-Path -LiteralPath $reportPath)){throw 'Original native report missing'}
    $receipt.reportSha256=(Get-FileHash -LiteralPath $reportPath -Algorithm SHA256).Hash.ToLowerInvariant();Save-Receipt
    $report=Get-Content -LiteralPath $reportPath -Raw | ConvertFrom-Json
    if($ownedProcess.ExitCode -ne 0 -or $report.ok -ne $true){throw 'Native smoke failed; original report retained'}
    $visual=$report.checks.loadingVisual
    if($null -eq $visual -or $visual.errors.Count -gt 0 -or $visual.frames.Count -lt 2){throw 'Loading visual evidence missing or failed'}
    if($Capture -ne 'initial'){
        if($visual.plantAction.beforeCount -ne 4 -or $visual.plantAction.afterCount -ne 5 -or $visual.plantAction.logicalPlantsUnchanged -ne $true -or $visual.plantAction.cancelled -eq $true){throw 'Synthetic fifth-plant evidence missing or farm changed'}
    }
    if($Capture -eq 'plant65'){
        if($visual.plantAction.startProgress -ne 0.65 -or $visual.plantAction.progress -lt 0.65){throw 'Advanced-progress planting evidence missing'}
    }
    if((Get-FileHash -LiteralPath $exePath -Algorithm SHA256).Hash -ne $ExecutableSha256){throw 'Executable changed during capture'}
    if((Get-FileHash -LiteralPath $fixturePath -Algorithm SHA256).Hash -ne $FixtureSha256){throw 'Fixture changed during capture'}
    $receipt.complete=$true;Save-Receipt
    Write-Output 'Native loading visual report retained; inspect and extract exact frames separately'
}catch{
    $receipt.error=$_.Exception.Message;Save-Receipt;throw
}finally{
    if($null -ne $ownedProcess){if(-not $ownedProcess.HasExited){$ownedProcess.Kill()};$ownedProcess.Dispose()}
    [Environment]::SetEnvironmentVariable('WEBVIEW2_USER_DATA_FOLDER',$previousProfile,'Process')
}
