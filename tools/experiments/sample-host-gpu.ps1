param([Parameter(Mandatory=$true)][string]$OutputFile,[int]$Samples=10,[int]$IntervalSeconds=2)
$ErrorActionPreference='Stop'
if($Samples -lt 1 -or $Samples -gt 300 -or $IntervalSeconds -lt 1){throw 'Invalid bounded sampling interval'}
$wgSelf=Get-Process -Id $PID
$wgCpuStart=$wgSelf.CPU
$wgTimer=[Diagnostics.Stopwatch]::StartNew()
$wgRows=[Collections.Generic.List[object]]::new()
Get-Counter '\GPU Engine(*)\Utilization Percentage' -SampleInterval $IntervalSeconds -MaxSamples $Samples | ForEach-Object {
 $wgNames=@{};Get-Process | ForEach-Object {$wgNames[$_.Id]=$_.ProcessName}
 $wgCounters=@($_.CounterSamples | Where-Object {$_.Status -eq 0 -and $_.CookedValue -gt 1} | ForEach-Object {
  $wgId=0;if($_.InstanceName -match '^pid_(\d+)_'){$wgId=[int]$Matches[1]}
  [pscustomobject]@{instance=$_.InstanceName;percent=$_.CookedValue;processId=$wgId;process=$wgNames[$wgId]}
 })
 $wgRows.Add([pscustomobject]@{utc=$_.Timestamp.ToUniversalTime().ToString('o');engineCounters=$wgCounters;invalidCounters=@($_.CounterSamples | Where-Object {$_.Status -ne 0}).Count})
}
$wgElapsed=$wgTimer.Elapsed.TotalSeconds
$wgSelf.Refresh();$wgCpu=$wgSelf.CPU-$wgCpuStart
[pscustomobject]@{scope='Per-engine Windows utilization above1%, not additive adapter load, GPU frametime, clock or thermal telemetry. Invalid counters counted. Diagnostic only.';wallSeconds=$wgElapsed;samplerCpuSeconds=$wgCpu;samplerCoreEquivalents=$wgCpu/$wgElapsed;samples=$wgRows} | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 -LiteralPath $OutputFile
