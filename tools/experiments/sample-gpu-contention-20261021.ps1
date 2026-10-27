param([string]$OutputPath = 'docs/qa/global-visual-lab/gpu-contention-20261021/samples.json', [int]$Samples = 8)
$ErrorActionPreference = 'Stop'
if(Test-Path -LiteralPath $OutputPath){throw 'Output exists; choose a new path.'}
$observations = @()
for($sampleIndex=0;$sampleIndex -lt $Samples;$sampleIndex++){
 $engines = @(Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine | Where-Object UtilizationPercentage -gt 2)
 $entries = @($engines | ForEach-Object {
  $engine = $_
  $processNumber = [int]([regex]::Match($engine.Name,'pid_(\d+)')).Groups[1].Value
  $processInfo = Get-CimInstance Win32_Process -Filter "ProcessId=$processNumber"
  $browserInfo = if($processInfo){Get-CimInstance Win32_Process -Filter "ProcessId=$($processInfo.ParentProcessId)"}
  $ownerInfo = if($browserInfo){Get-CimInstance Win32_Process -Filter "ProcessId=$($browserInfo.ParentProcessId)"}
  [pscustomobject]@{engine=$engine.Name;percent=$engine.UtilizationPercentage;pid=$processNumber;process=$processInfo.Name;parentPid=$processInfo.ParentProcessId;parent=$browserInfo.Name;ownerPid=$ownerInfo.ProcessId;owner=$ownerInfo.Name;scripts=@([regex]::Matches([string]$ownerInfo.CommandLine,'[^\s"'']+\.(?:mjs|cjs|js)') | ForEach-Object Value)}
 })
 $observations += [pscustomobject]@{utc=(Get-Date).ToUniversalTime().ToString('o');engines=$entries}
 if($sampleIndex -lt $Samples-1){Start-Sleep -Seconds 1}
}
$parentFolder = Split-Path -Parent $OutputPath
New-Item -ItemType Directory -Force -Path $parentFolder | Out-Null
[IO.File]::WriteAllText((Join-Path (Get-Location) $OutputPath), ($observations | ConvertTo-Json -Depth 8), [Text.UTF8Encoding]::new($false))
Write-Output "Saved $Samples read-only GPU observations to $OutputPath"
