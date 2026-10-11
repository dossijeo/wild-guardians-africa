import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('saved night16 contention finishes with real movement and a reload',()=>{
 const cwd=fileURLToPath(new URL('../',import.meta.url));
 const result=JSON.parse(execFileSync(process.execPath,['tools/qa-native-actor-contention.mjs','docs/qa/integrated-spiritual-survival/pilot-v40-good-q9-empalizada-grid-bridge-sabana-123-twentyone/partial-state.json.gz'],{cwd,encoding:'utf8',timeout:120000}));
 assert.equal(result.raidEnded,true);assert.equal(result.reloaded,true);
 assert.equal(result.day,17);assert.equal(result.completedNights,16);assert.equal(result.result,null);
 assert.equal(result.ledgerUnchanged,true);assert.ok(result.moves['animal-14151']>100);assert.ok(result.moves['animal-14152']>100);
 assert.ok(result.endings.length>=2);for(const a of result.endings){assert.equal(a.status,'gone');assert.deepEqual(a.position,a.exit);}
});
