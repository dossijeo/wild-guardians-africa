import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {capacityAudit} from '../tools/audit-native-raid-capacity.mjs';
import {animalSpec} from '../src/simulation/rules.js';
test('native capacity separates two-hit healthy crops from one-hit wounded crops',()=>{
 const r=capacityAudit();
 for(const t of r.tiers){const a=t.strongest;
  assert.equal(a.hits,a.group.reduce((n,id)=>n+animalSpec(id).hit_budget_max,0));
  assert.equal(a.maxFreshCropKills,Math.floor(a.hits/2));assert.equal(a.maxAlreadyWoundedCropKills,a.hits);
  assert.ok(t.maxAnimals<=5);
 }
 const control=r.references.find(v=>v.night===100&&v.plants===400);
 assert.equal(control.targetKills,110);assert.equal(control.freshCropHitsRequired,220);assert.equal(control.optimisticMinimumAnimals,28);
 assert.ok(control.freshCropHitsRequired>r.maxHits);
});
test('capacity evidence reproduces with current native sources',()=>{
 const saved=JSON.parse(readFileSync(new URL('../docs/qa/native-economic-balance/capacity.json',import.meta.url))),r=capacityAudit();
 for(const k of Object.keys(r))assert.deepEqual(saved[k],r[k]);
 for(const [p,sha] of Object.entries(saved.sourceHashes))assert.equal(createHash('sha256').update(readFileSync(new URL('../'+p,import.meta.url))).digest('hex'),sha);
});
