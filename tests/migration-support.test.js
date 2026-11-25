import test from 'node:test';
import assert from 'node:assert/strict';
import {selectTests,browserJobs,command,runDirectory} from '../tools/guardian/migration-support/core.mjs';
import {guards,scenarios,integrationTests} from '../tools/guardian/migration-support/catalog.mjs';

const inventory=['src/a.js','src/b.js','src/orphan.js','tests/a.test.js','tests/unrelated.test.js',...new Set([...guards,...integrationTests])];
const contents={'src/b.js':"export {a} from './a.js';",'tests/a.test.js':"import('../src/b.js');"};
const select=(changed,tier='focused')=>selectTests(changed,tier,inventory,p=>contents[p]??'');
test('transitive imports select callers and preserve mandatory safety without unrelated tests',()=>{
  const p=select(['src/a.js']);assert(p.tests.includes('tests/a.test.js'));for(const g of guards)assert(p.tests.includes(g));assert(!p.tests.includes('tests/unrelated.test.js'));
});
test('unknown files, native ABI and an unreferenced runtime module fail open to more coverage',()=>{
  for(const file of ['package.json','public/content/model.glb','src/orphan.js'])assert(select([file]).tests.includes('tests/unrelated.test.js'));
  assert(select(['src/a.js','src/orphan.js']).tests.includes('tests/unrelated.test.js'));
  assert(select(['src/world/wild-engine/spatial-task-execution.inc']).tests.includes('tests/unrelated.test.js'));
});
test('documentation needs no runtime tests; integration keeps CPU and GPU obligations distinct',()=>{
  assert.deepEqual(select(['docs/example.md']).tests,[]);const p=select(['src/a.js'],'integration');for(const f of integrationTests)assert(p.tests.includes(f));assert(p.browserRequired);assert(p.buildRequired);
});
test('missing mandatory safety test fails instead of silently reducing coverage',()=>{
  assert.throws(()=>selectTests(['src/a.js'],'focused',inventory.filter(p=>p!==guards[0]),()=>''),/Required test missing/);
});
test('browser scenarios deduplicate the same harness invocation but preserve different variations',()=>{
  const jobs=browserJobs(['harvest','concurrent','preparation','gates','recovery'],scenarios);
  assert.deepEqual(jobs.map(job=>job.name),['harvest','concurrent','gates','recovery']);
  assert.equal(jobs[0].script,'tools/guardian/audit_native_farm_birth_world_owner.mjs');
  assert.equal(jobs[0].env.QA_NATIVE_BIRTH_SCENARIO,'cancel-before-task');
  for(const suffix of ['ACTION','CONSEQUENCE','SETTLEMENT','NEXT_TASK'])
    assert.equal(jobs[0].env['QA_NATIVE_BIRTH_FOLLOW_'+suffix],'true');
  assert.equal(jobs[0].env.QA_NATIVE_BIRTH_FOLLOW_HOME,undefined);
  assert.equal(jobs[1].env.QA_NATIVE_ACTION,'true');
  assert.equal(jobs[2].env.QA_GATE_MOTOR,'true');
  assert.throws(()=>browserJobs(['typo'],scenarios),/Unknown scenario/);
});
test('broad tier does not drop unrelated tests',()=>assert(select(['docs/example.md'],'broad').tests.includes('tests/unrelated.test.js')));

test('runner preserves failures and distinguishes TODO from an accepted test run',async()=>{
  const dir=runDirectory('runner-contract');
  const failed=await command(['-e',"console.log('# tests 1\\n# fail 1');process.exitCode=7"],dir,'failed');
  assert.equal(failed.status,'failed');assert.equal(failed.code,7);assert.equal(failed.counts.fail,1);
  const pending=await command(['-e',"console.log('# tests 1\\n# pass 0\\n# todo 1')"],dir,'pending');
  assert.equal(pending.status,'incomplete');assert.equal(pending.code,0);assert.equal(pending.counts.todo,1);
  const passed=await command(['-e',"console.log('# tests 1\\n# pass 1\\n# skipped 0\\n# todo 0')"],dir,'passed');
  assert.equal(passed.status,'passed');assert.match(passed.logSha256,/^[a-f0-9]{64}$/);assert(passed.runtimeVersion);
  const timeout=await command(['-e','setInterval(()=>{},1000)'],dir,'timeout',{timeoutMs:200});
  assert.equal(timeout.status,'failed');assert.equal(timeout.timedOut,true);
});
