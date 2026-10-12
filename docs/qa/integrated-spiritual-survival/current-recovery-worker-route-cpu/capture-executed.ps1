if((Get-NetTCPConnection -LocalPort 9229 -State Listen).OwningProcess -ne 51388){throw 'Inspector owner changed'}
if(Test-Path -LiteralPath '.cache-current-recovery-campaign.cpuprofile'){throw 'Evidence already exists'}
$ErrorActionPreference='Stop'
$targets=(Invoke-WebRequest -Uri http://127.0.0.1:9229/json/list -TimeoutSec 5).Content | ConvertFrom-Json
$target=@($targets)[0]
if($target.title -ne 'tools/run-reviewed-recovery-comparison.mjs' -or $target.url -notmatch 'raid-committed-target-fix'){throw 'Unexpected inspector target'}
$client=[Net.WebSockets.ClientWebSocket]::new()
$cancel=[Threading.CancellationTokenSource]::new(30000)
$client.ConnectAsync([Uri]$target.webSocketDebuggerUrl,$cancel.Token).GetAwaiter().GetResult()
function Command($id,$method,$params=@{}) {
 $json=@{id=$id;method=$method;params=$params} | ConvertTo-Json -Compress -Depth 5
 $bytes=[Text.Encoding]::UTF8.GetBytes($json)
 $client.SendAsync([ArraySegment[byte]]::new($bytes),[Net.WebSockets.WebSocketMessageType]::Text,$true,$cancel.Token).GetAwaiter().GetResult()
 while($true){
  $stream=[IO.MemoryStream]::new();$buffer=[byte[]]::new(65536)
  do{$chunk=$client.ReceiveAsync([ArraySegment[byte]]::new($buffer),$cancel.Token).GetAwaiter().GetResult();$stream.Write($buffer,0,$chunk.Count)}while(!$chunk.EndOfMessage)
  $message=[Text.Encoding]::UTF8.GetString($stream.ToArray());$stream.Dispose()
  $parsed=$message | ConvertFrom-Json -Depth 100
  if($parsed.id -eq $id){if($parsed.error){throw ($parsed.error | ConvertTo-Json)};return $parsed.result}
 }
}
try {
 $null=Command 1 'Profiler.enable'
 $null=Command 2 'Profiler.setSamplingInterval' @{interval=2000}
 $null=Command 3 'Profiler.start'
 Start-Sleep -Seconds 10
 $result=Command 4 'Profiler.stop'
 [IO.File]::WriteAllText((Join-Path (Get-Location) '.cache-current-recovery-campaign.cpuprofile'),($result.profile | ConvertTo-Json -Depth 100 -Compress),[Text.UTF8Encoding]::new($false))
 $null=Command 5 'Profiler.disable'
 Write-Output ('samples='+$result.profile.samples.Count)
}finally{$client.Abort();$client.Dispose();$cancel.Dispose()}

