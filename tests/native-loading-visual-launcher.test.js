import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

test('real Windows visual launcher rejects wrong hashes and existing evidence before any launch',
 {skip:process.platform!=='win32'?'Real PowerShell preflight requires Windows':false},()=>{
  mkdirSync('.cache',{recursive:true});
  const dir=mkdtempSync(resolve('.cache/native visual preflight '));
  const executable=join(dir,'not-a-game.exe'),fixture=join(dir,'fixture.json');
  writeFileSync(executable,'inert fixture: deliberately not an executable');
  writeFileSync(fixture,'{}');
  const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
  const shell=process.env.SystemRoot+'\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
  const base=['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',resolve('tools/run_native_loading_visual.ps1'),
   '-Executable',executable,'-ExecutableSha256',hash(executable),'-SourceCommit','1'.repeat(40),
   '-Fixture',fixture,'-FixtureSha256',hash(fixture)];
  // Windows PowerShell must discover its own modules rather than inherited
  // PowerShell Core module paths from the host running this Node process.
  const env={...process.env,PSModulePath:join(process.env.SystemRoot,'System32','WindowsPowerShell','v1.0','Modules')};
  function run(args){const r=spawnSync(shell,args,{encoding:'utf8',timeout:30000,env});assert.equal(r.error,undefined);assert.notEqual(r.status,0);return r.stdout+r.stderr;}
  const wrongExe=base.slice();wrongExe[wrongExe.indexOf('-ExecutableSha256')+1]='0'.repeat(64);
  const first=join(dir,'wrong exe output');assert.match(run([...wrongExe,'-OutputDirectory',first]),/Executable digest mismatch/);assert.equal(existsSync(first),false);
  const wrongFixture=base.slice();wrongFixture[wrongFixture.indexOf('-FixtureSha256')+1]='0'.repeat(64);
  const second=join(dir,'wrong fixture output');assert.match(run([...wrongFixture,'-OutputDirectory',second]),/Fixture digest mismatch/);assert.equal(existsSync(second),false);
  const prior=join(dir,'prior evidence');mkdirSync(prior);const sentinel=join(prior,'receipt.json');writeFileSync(sentinel,'original evidence');
  assert.match(run([...base,'-OutputDirectory',prior]),/Prior evidence exists/);assert.equal(readFileSync(sentinel,'utf8'),'original evidence');
  assert.equal(existsSync(join(prior,'webview-profile')),false);
 });
