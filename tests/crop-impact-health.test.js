import test from 'node:test';
import assert from 'node:assert/strict';
import {BALANCE as B} from '../src/simulation/balance.js';
import {createPlant} from '../src/simulation/crops.js';
import {applyCropImpact,cropImpactDamage,CROP_HIT_POINTS} from '../src/simulation/crop-impact-health.js';
import {newGame} from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';

function fixture(){const s=newGame();const p=createPlant('crop','mijo',10,10,'center');s.plants=[p];return {s,p};}
test('every crop dies from one direct point, without repeated destruction',()=>{
 assert.equal(CROP_HIT_POINTS,1);
 for(const crop of B.crops){const {s}=fixture(),p=createPlant('crop',crop.id,10,10,'center');s.plants=[p];p.harvestRequested=true;
  assert.equal(applyCropImpact(s,p,1).destroyed,true);assert.equal(p.attackHits,1);assert.equal(p.harvestRequested,false);assert.equal(applyCropImpact(s,p,1),null);
 }
});
test('two real half-point peripheral impacts are needed; reload is passive',()=>{
 const {s,p}=fixture();assert.equal(applyCropImpact(s,p,.5).destroyed,false);
 const saved=serialize(s),loaded=deserialize(saved);assert.equal(serialize(loaded),saved);
 assert.equal(applyCropImpact(loaded,loaded.plants[0],.5).destroyed,true);
});
test('old half-point wounds preserve their proportion only at the next physical impact',()=>{
 for(const oldDamage of [.5,1,1.5]){const {s,p}=fixture();delete p.attackHitPoints;p.attackHits=oldDamage;
  const saved=serialize(s),loaded=deserialize(saved),plant=loaded.plants[0];assert.equal(serialize(loaded),saved);assert(plant.alive);assert.equal(cropImpactDamage(plant),oldDamage/2);
  const hit=applyCropImpact(loaded,plant,.5);assert.equal(hit.before,oldDamage/2);assert.equal(plant.attackHitPoints,1);assert.doesNotThrow(()=>serialize(loaded));
 }
});
test('introductory quota protects remaining plants and survives a reload',()=>{
 const {s,p}=fixture();s.raid={introCropLimit:0,introCropsDestroyed:0};assert.equal(applyCropImpact(s,p,4),null);assert(p.alive);
 delete s.raid;assert.equal(applyCropImpact(s,p,4).damage,1);
});
test('unknown resistance and unrepresentable wounds cannot enter saved state',()=>{
 for(const value of [0,3,1.5]){const {s,p}=fixture();p.attackHitPoints=value;assert.throws(()=>serialize(s));}
 const {s,p}=fixture();p.attackHits=.1;assert.throws(()=>serialize(s));
});
