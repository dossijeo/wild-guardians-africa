import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

test('JavaScript and native navigation caches agree with fresh queries across topology changes',()=>{
  const run=spawnSync(process.execPath,
    ['tools/experiments/check-nav-cache-coherence.mjs','--verify'],
    {cwd:new URL('..',import.meta.url),encoding:'utf8',timeout:30000});
  if(run.error)throw run.error;
  assert.equal(run.status,0,run.stderr||run.stdout);
  const result=JSON.parse(run.stdout);
  assert.equal(result.discrepancies,0);
  for(const stage of ['uncommitted-wall-preview','wall-preview-discarded',
    'residency-remove-and-restore','active-worker-route-residency','native-portal-only-revision',
    'save-load-new-session'])assert(result.stages.includes(stage),stage);
});
