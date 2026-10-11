import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {capacityAudit} from '../tools/audit-native-raid-capacity.mjs';
import {animalSpec} from '../src/simulation/rules.js';
test('historical tier calculator retains its original two-HP reference bounds',()=>{
 const r=capacityAudit();
 for(const t of r.tiers){const a=t.strongest;
  assert.equal(a.hits,a.group.reduce((n,id)=>n+animalSpec(id).hit_budget_max,0));
  assert.equal(a.maxFreshCropKills,Math.floor(a.hits/2));assert.equal(a.maxAlreadyWoundedCropKills,a.hits);
  assert.ok(t.maxAnimals<=14);
 }
 assert.ok(r.tiers.at(-1).maxAnimals>5);
 const control=r.references.find(v=>v.night===100&&v.plants===400);
 assert.equal(control.targetKills,110);assert.equal(control.freshCropHitsRequired,220);assert.equal(control.optimisticMinimumAnimals,28);
 assert.ok(control.freshCropHitsRequired>r.maxHits);
});
test('historical capacity evidence remains unchanged without claiming current source provenance',()=>{
 const bytes=readFileSync(new URL('../docs/qa/agricultural-single-plant/current-native-capacity/capacity.json',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'a70e93ce2c3c042205c8e36c7dc498e3364c11eb5cddd0ff7f64466a4d544ed7');
 const saved=JSON.parse(bytes),r=capacityAudit();
 for(const k of Object.keys(r))assert.deepEqual(saved[k],r[k]);
 // Preserved hashes describe the historical source. The separate current
 // pressure audit verifies source hashes for the one-HP progressive planner.
 for(const sha of Object.values(saved.sourceHashes))assert.match(sha,/^[a-f0-9]{64}$/);
});
