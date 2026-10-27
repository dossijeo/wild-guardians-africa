param([string]$OutputFile,[int]$Seconds=60,[int]$IntervalMs=2000)
$ErrorActionPreference='Stop'
if(!$OutputFile -or $Seconds -lt 1 -or $IntervalMs -lt 1000){throw 'Output path, positive duration, and interval >=1000 ms required'}
$wgRows=[System.Collections.Generic.List[object]]::new()
$wgLast=@{}
Get-Process | ForEach-Object { $wgLast[$_.Id]=@{Cpu=$_.CPU;Name=$_.ProcessName} }
$wgClock=[System.Diagnostics.Stopwatch]::StartNew();$wgPrevious=0.0
while($wgClock.Elapsed.TotalSeconds -lt $Seconds){
 Start-Sleep -Milliseconds $IntervalMs
 $wgNow=$wgClock.Elapsed.TotalSeconds;$wgDelta=$wgNow-$wgPrevious;$wgPrevious=$wgNow
 $wgCurrent=@{};$wgCpu=[System.Collections.Generic.List[object]]::new()
 foreach($wgProcess in Get-Process){
  $wgCurrent[$wgProcess.Id]=@{Cpu=$wgProcess.CPU;Name=$wgProcess.ProcessName}
  if($wgLast.ContainsKey($wgProcess.Id) -and $wgLast[$wgProcess.Id].Name -eq $wgProcess.ProcessName){
   $wgUsed=$wgProcess.CPU-$wgLast[$wgProcess.Id].Cpu
   if($wgUsed -ge 0){$wgCpu.Add([pscustomobject]@{pid=$wgProcess.Id;name=$wgProcess.ProcessName;cpuSeconds=$wgUsed;coreEquivalents=$wgUsed/$wgDelta;workingSetBytes=$wgProcess.WorkingSet64})}
  }
 }
 $wgRows.Add([pscustomobject]@{utc=[DateTime]::UtcNow.ToString('o');elapsedSeconds=$wgNow;intervalSeconds=$wgDelta;processes=@($wgCpu | Sort-Object cpuSeconds -Descending | Select-Object -First 12)})
 $wgLast=$wgCurrent
}
$wgOs=Get-CimInstance Win32_OperatingSystem
[pscustomobject]@{scope='Process CPU deltas sampled during this interval, not GPU activity, temperature, or proof of interference. Top 12 only; newly started processes lack a first delta.';logicalProcessors=[Environment]::ProcessorCount;memoryAtEnd=@{freeKiB=$wgOs.FreePhysicalMemory;totalKiB=$wgOs.TotalVisibleMemorySize};samples=$wgRows} | ConvertTo-Json -Depth 7 | Set-Content -Encoding utf8 -LiteralPath $OutputFile
