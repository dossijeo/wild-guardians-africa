import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {chooseRaidEntry,spawnRaid} from '../src/simulation/raids.js';
import {raidWallEnvelope,exteriorRaidWitness} from '../src/simulation/raid-exterior-entry.js';
import {animalSpec,operational} from '../src/simulation/rules.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';

test('Desert day-nine five-animal wave finds separated exterior births without changing the pending night',async()=>{
  const saved=gunzipSync(readFileSync(new URL('fixtures/desierto123-d9-exterior-formation.json.gz',import.meta.url))).toString();
  const state=deserialize(saved),module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
  const loaded=new Map(),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const bounds=[-24,-72,216,168];
    for(let z=-1;z<=3;z++)for(let x=0;x<=4;x++){
      assert(session.core.addChunk(x,z)>=0);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    const nav=createSpatialNavigationMovement(session,state);
    nav.setActiveBounds(bounds);
    const center=state.structures.find(operational);
    nav.setRaidView({x:99.70247532024266,z:30.57367599590944},center);
    const specs=state.nightPlan.group.map(id=>({spec:animalSpec(id),radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
    assert.equal(specs.length,5);
    const before=serialize(state),entry=chooseRaidEntry(state,specs,bounds,0,nav);
    assert(entry,'all five real animals need an exterior entry');
    assert.equal(serialize(state),before,'selection is read-only');
    const box=raidWallEnvelope(state,nav);
    for(let i=0;i<specs.length;i++){
      const point=entry.entries[i],exit=entry.exits[i],radius=specs[i].radius;
      assert(nav.walkable(point.x,point.z,radius,null,false));
      assert(nav.segmentClear(point,exit,radius,null,false));
      assert(exteriorRaidWitness(point,radius,box,nav));
      for(let j=0;j<i;j++)assert(Math.hypot(point.x-entry.entries[j].x,point.z-entry.entries[j].z)>radius+specs[j].radius+1);
    }
    assert(spawnRaid(state,state.nightPlan,nav));
    assert.deepEqual(state.raid.animals.map(animal=>animal.species),state.nightPlan.group);
    assert.equal(state.raid.animals.length,5);
    assert.equal(serialize(deserialize(serialize(state))),serialize(state));
  }finally{session.dispose()}
});

test('Desert day-28 follow-up wave keeps unknown detours speculative and admits the full group',()=>{
  const saved=gunzipSync(readFileSync(new URL('fixtures/desierto123-d28-exterior-unknown.json.gz',import.meta.url))).toString();
  const state=deserialize(saved),module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
  const loaded=new Map(),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const bounds=[-24,-72,216,168];
    for(let z=-1;z<=3;z++)for(let x=0;x<=4;x++){
      assert(session.core.addChunk(x,z)>=0);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    const nav=createSpatialNavigationMovement(session,state);
    nav.setActiveBounds(bounds);
    const center=state.structures.find(operational);
    nav.setRaidView({x:99.70247532024266,z:30.57367599590944},center);
    const plan=state.raid.pendingWavePlan;
    assert.equal(plan.group.length,4);
    assert(state.raid.animals.every(animal=>animal.status==='gone'));
    const specs=plan.group.map(id=>({spec:animalSpec(id),radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
    const before=serialize(state),entry=chooseRaidEntry(state,specs,bounds,0,nav);
    assert(entry,'an unknown optional detour cannot abort all valid entries');
    assert.equal(entry.entries.length,plan.group.length);
    assert.equal(serialize(state),before);
    assert(spawnRaid(state,plan,nav));
    assert.deepEqual(state.raid.animals.slice(-4).map(animal=>animal.species),plan.group);
    assert.equal(state.raid.animals.length,20);
  }finally{session.dispose()}
});
