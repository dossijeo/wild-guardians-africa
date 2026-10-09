import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const launcher=new URL('../tools/run_desktop_worker_qa.ps1',import.meta.url);
test('launcher records exact same-process environment and bounded live descendant snapshots, with product smoke arguments only',()=>{
 const source=readFileSync(launcher,'utf8');assert.match(source,/before=\$taskBefore; child=\$taskChildEnvironment; after=\$taskAfter; exact=\$taskEnvironmentExact; process=\$PID/);assert.match(source,/Remove-Item Env:WEBVIEW2_USER_DATA_FOLDER/);assert.match(source,/\$taskObservation -lt 7/);assert.ok(source.indexOf('Get-CimInstance Win32_Process')<source.indexOf('$taskProc.WaitForExit()'));assert.match(source,/Output directory must be fresh/);assert.match(source,/productExitCode=\$taskProc.ExitCode;launcherExitCode=\$taskLauncherExitCode/);assert.ok(source.indexOf('exit $taskLauncherExitCode')>source.indexOf("(Join-Path $taskOut 'exit.json')"));assert.match(source,/Start-Process[^\n]+-WindowStyle Hidden -PassThru/);assert.deepEqual([...source.matchAll(/'(--[^']+)'/g)].map(x=>x[1]),['--smoke-report','--smoke-fixture']);assert.doesNotMatch(source,/ADDITIONAL_BROWSER_ARGUMENTS|loading.*flag|--disable|--use-angle/);
});
test('launcher CPU helpers restore missing, empty and path environments with presence/value records', {skip:process.platform!=='win32'},()=>{
 const path=decodeURIComponent(launcher.pathname).replace(/^\/(\w:)/,'$1');const script=`. '${path.replaceAll("'","''")}'; $original=Get-WorkerQaProfileEnvironment; try { $rows=@(); foreach($mode in @('absent','empty','path')) { if($mode -eq 'absent') { Remove-Item Env:WEBVIEW2_USER_DATA_FOLDER -ErrorAction SilentlyContinue } elseif($mode -eq 'empty') { Set-Item Env:WEBVIEW2_USER_DATA_FOLDER -Value '' } else { Set-Item Env:WEBVIEW2_USER_DATA_FOLDER -Value 'C:/qa-existing-profile' }; $before=Get-WorkerQaProfileEnvironment; Set-Item Env:WEBVIEW2_USER_DATA_FOLDER -Value 'C:/qa-child-profile'; $after=Restore-WorkerQaProfileEnvironment $before; $rows+=@{mode=$mode;before=$before;after=$after;exact=(Test-WorkerQaProfileEnvironmentExact $before $after)} }; $rows|ConvertTo-Json -Depth 5 -Compress } finally { $restored=Restore-WorkerQaProfileEnvironment $original; if(-not (Test-WorkerQaProfileEnvironmentExact $original $restored)) { throw 'Original test parent environment was not restored' } }`;
 const rows=JSON.parse(execFileSync('powershell',['-NoProfile','-Command',script],{encoding:'utf8'}));assert.equal(rows.length,3);assert.ok(rows.every(r=>r.exact));assert.equal(rows[0].before.kind,'absent');assert.equal(rows[2].before.kind,'path');assert.equal(rows[2].after.value,'C:/qa-existing-profile');
});

test('launcher CPU exit policy propagates product failure and fails exact-environment restoration independently',{skip:process.platform!=='win32'},()=>{
 const path=decodeURIComponent(launcher.pathname).replace(/^\/(\w:)/,'$1'),script=`. '${path.replaceAll("'","''")}'; @((Get-WorkerQaLauncherExitCode 0 $true),(Get-WorkerQaLauncherExitCode 1 $true),(Get-WorkerQaLauncherExitCode 2 $false),(Get-WorkerQaLauncherExitCode 0 $false))|ConvertTo-Json -Compress`;
 assert.deepEqual(JSON.parse(execFileSync('powershell',['-NoProfile','-Command',script],{encoding:'utf8'})),[0,1,2,1]);
});
