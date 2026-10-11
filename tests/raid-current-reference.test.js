import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {raidAnimalCount,raidPressure,selectBudgetedRaid,RAID_PRESSURE_CANDIDATE} from '../src/simulation/raid-pressure-budget.js';
const military=['content/balance/raid_pressure_candidate.json','src/simulation/raid-pressure-budget.js','src/simulation/raid-pressure-plan.js'];
const review=JSON.parse(gunzipSync(readFileSync(new URL('../docs/qa/integrated-spiritual-survival/recovery-integration-source-review/source-review.json.gz',import.meta.url))));
test('current technical reference differs from reviewed integration only in three exact historical military files',()=>{
 const changed=[];
 for(const [path,hash] of Object.entries(review.current.sourceHashes)){
  const actual=createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex');
  if(actual!==hash){changed.push(path);assert(military.includes(path),path);assert.equal(actual,review.changed.find(p=>p.path===path).before,path);}
 }
 assert.deepEqual(changed.sort(),military.sort());
});
test('reference preserves candidate-three count and cannot use current-value recovery',()=>{
 assert.equal(RAID_PRESSURE_CANDIDATE.version,3);
 const p=raidPressure(36,675.7898549476145);assert.equal(raidAnimalCount(36,p),19);
 const options={night:36,pressure:p,unlocked:['warthog','hyena'],rng:712};
 const small=selectBudgetedRaid({...options,agriculturalValue:295});
 const large=selectBudgetedRaid({...options,agriculturalValue:25000});
 assert.deepEqual(small,large);assert.equal(small.actors.length,19);
});
