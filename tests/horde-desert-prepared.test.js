import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {RaidEntryPreparer} from '../src/world/raid-entry-preparer.js';
import {computeRaidEntry} from '../src/world/compute-raid-entry.js';
import {spawnRaid,reachableApproach} from '../src/simulation/raids.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {actorSegmentClear} from '../src/simulation/actor-motion.js';
import {randomInt,animalSpec} from '../src/simulation/rules.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
const group=[...Array(4).fill('warthog'),...Array(3).fill('hyena'),...Array(2).fill('buffalo'),...Array(2).fill('lion'),'rhino'];
const biome=process.env.HORDE_PREFLIGHT_BIOME??'desierto';
test(`${biome}: native twelve-body preparation, attack approaches and reversible exits preserve first-draw RNG`,()=>{
 const {s,nav}=createOpeningWorld({biome,seed:712}),center=s.structures[0],eye={x:center.x+16,z:center.z+20};
 nav.setActiveBounds(activeChunkRegion(eye).bounds);nav.setRaidView(eye,center);s.nightPlan={at:400,group:[...group],plannedNight:41,done:false};
 const before=serialize(s),worker={requests:[],postMessage(request){this.requests.push(request);},terminate(){this.terminated=true;}},preparer=new RaidEntryPreparer(nav,{createWorker:()=>worker});
 preparer.update(s);const reply=computeRaidEntry(worker.requests[0]);assert.ok(reply.entry);assert.equal(reply.entry.entries.length,12);assert.equal(serialize(s),before);
 worker.onmessage({data:reply});assert.equal(preparer.stats.accepted,1);
 const reference=deserialize(before),side=randomInt(reference,0,3),expectedHits=group.map(id=>{const spec=animalSpec(id);return randomInt(reference,spec.hit_budget_min,spec.hit_budget_max);});
 assert.equal(spawnRaid(s,s.nightPlan,nav),'spawned');assert.equal(preparer.stats.used,1);assert.equal(s.nightPlan.entryPreferredSide,side);assert.equal(s.rng,reference.rng);
 assert.deepEqual(s.raid.animals.map(a=>a.hitsRemaining),expectedHits);assert.deepEqual(s.raid.animals.map(a=>a.species),group);
 for(const [i,actor] of s.raid.animals.entries()){
  assert.equal(actor.radius,ANIMAL_ACTIONS.animals[actor.species].presentation.footprint.radius);
  const approach=reachableApproach(actor,center,nav,null);assert.ok(approach,`native attack approach ${i}`);
  let previous=actor;for(const point of approach.path){assert.ok(nav.segmentClear(previous,point,actor.radius,null,false));assert.ok(nav.segmentClear(point,previous,actor.radius,null,false));previous=point;}
  const exit=reply.entry.exits[i];assert.ok(nav.walkable(exit.x,exit.z,actor.radius,null,false));assert.ok(nav.segmentClear(actor,exit,actor.radius,null,false));assert.ok(nav.segmentClear(exit,actor,actor.radius,null,false));assert.ok(actorSegmentClear(actor,exit,actor,s.raid.animals.filter(a=>a!==actor)));
 }
 preparer.dispose();assert.equal(worker.terminated,true);assert.equal(nav.preparedRaidEntry,undefined);
});
