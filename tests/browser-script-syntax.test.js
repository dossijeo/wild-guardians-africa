import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,unlinkSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
test('QA syntax gate rejects malformed fixture modules, ignores shaders/data and never executes scripts',()=>{
 const folder=mkdtempSync(join(tmpdir(),'wg-browser-syntax-')),valid=join(folder,'valid.html'),broken=join(folder,'broken.html');
 try{
  writeFileSync(valid,'<script type="application/json">{invalid JS}</script><script type="x-shader/x-fragment">void main(){}</script><script type="module">import {x} from "./does-not-exist.js"; throw Error("must not execute");</script>');
  writeFileSync(broken,'<script type="module">const kernel={hitSites:[],fx=create();</script>');
  const ok=spawnSync(process.execPath,['tools/check_browser_script_syntax.mjs',valid],{encoding:'utf8'});
  assert.equal(ok.status,0,ok.stderr);assert.equal(JSON.parse(ok.stdout).scripts,1);
  const fail=spawnSync(process.execPath,['tools/check_browser_script_syntax.mjs',broken],{encoding:'utf8'}),report=JSON.parse(fail.stdout);
  assert.equal(fail.status,1);assert.equal(report.failures.length,1);assert.equal(report.failures[0].file,broken);assert.match(report.failures[0].error,/SyntaxError/);
 }finally{unlinkSync(valid);unlinkSync(broken);rmdirSync(folder);}
});
