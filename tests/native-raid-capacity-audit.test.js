import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {capacityAudit} from '../tools/audit-native-raid-capacity.mjs';
import {animalSpec} from '../src/simulation/rules.js';
test('archived two-hit crop capacity evidence retains its historical bounds',()=>{
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
test('archived capacity numbers remain reproducible without treating old source hashes as current',()=>{
 const saved=JSON.parse(readFileSync(new URL('../docs/qa/native-economic-balance/main-8f3c0021-capacity/capacity.json',import.meta.url))),r=capacityAudit();
 // Preserve the original capacity evidence and compare its numerical result
 // with today's auditor. Its source hashes identify the historical revision;
 // current source files have changed and must not be required to hash alike.
 const historical=JSON.parse(readFileSync(new URL('../docs/qa/native-economic-balance/capacity.json',import.meta.url)));
 for(const k of Object.keys(r))assert.deepEqual(saved[k],historical[k]);
 for(const k of Object.keys(r))assert.deepEqual(saved[k],r[k]);
});
