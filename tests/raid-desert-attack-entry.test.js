import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as Game from '../src/simulation/game.js';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {createEventDrivenTaskPlanner} from '../src/world/wild-engine/spatial-intent-bridge.js';
import {exteriorRaidEntry,exteriorRaidWitness,raidWallEnvelope} from
  '../src/simulation/raid-exterior-entry.js';
import {exteriorGroupWitness} from '../src/simulation/raid-exterior-connectivity.js';
import {chooseRaidEntry,spawnRaid,targetFor} from '../src/simulation/raids.js';
import {animalSpec} from '../src/simulation/rules.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';

test('Desert/123 night 10 uses a native-reachable exterior attack side',()=>{
  const raw=readFileSync(new URL(
    '../docs/qa/desert-raid-pressure-audit/desierto123-d10-waiting-state.json.gz',
    import.meta.url));
  const state=deserialize(gunzipSync(raw).toString()),before=serialize(state);
  const binary=new WebAssembly.Module(readFileSync(new URL(
    '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
  const loaded=new Map(),session=createSpatialGameSession(binary,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const village=state.villages[0],cx=Math.floor((village.x+24)/48),
      cz=Math.floor((village.z+24)/48);
    for(let z=cz-4;z<=cz+4;z++)for(let x=cx-4;x<=cx+4;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    const planner=createEventDrivenTaskPlanner(session);
    planner.resetFromState(state);planner.nativeWallSelectionEnabled=true;
    const nav=createSpatialNavigationMovement(session,state);
    nav.intentTaskPlanner=planner;
    const bounds=[-168,-216,264,216];
    nav.setActiveBounds(bounds);
    nav.setRaidView({x:99.70247532024266,z:30.57367599590944},
      state.structures.find(item=>item.kind==='center'));
    const specs=state.raid.animals.map(animal=>({radius:animal.radius})),
      original={entries:state.raid.animals.map(animal=>animal.spawn),
        exits:state.raid.animals.map(animal=>animal.exit)};
    assert.notEqual(nav.spatialRouteStatus(original.entries[0],
      {x:99.42,z:.425},specs[0].radius),'found');
    const selected=exteriorRaidEntry(state,specs,bounds,0,nav,
      ()=>original,()=>null);
    assert(selected);
    assert.equal(selected.entries.length,specs.length);
    assert(selected.entries.every(point=>point.x<150));
    const box=raidWallEnvelope(state,nav);
    for(let index=0;index<specs.length;index++){
      const point=selected.entries[index],radius=specs[index].radius;
      assert(nav.walkable(point.x,point.z,radius,null,false));
    }
    assert(exteriorGroupWitness(selected,specs,box,nav,exteriorRaidWitness));
    assert.equal(serialize(state),before);
    const actor=state.raid.animals[0];
    Object.assign(actor,selected.entries[0]);
    const choice=targetFor(state,actor,nav);
    assert.equal(choice?.target?.kind,'wall');
  }finally{session.dispose();}
});

test('Desert/123 night 17 finds the winding exterior component without changing the raid',()=>{
  const raw=readFileSync(new URL(
    '../docs/qa/desert-raid-pressure-audit/desierto123-d17-waiting-state.json.gz',
    import.meta.url));
  const state=deserialize(gunzipSync(raw).toString()),before=serialize(state);
  const binary=new WebAssembly.Module(readFileSync(new URL(
    '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
  const loaded=new Map(),session=createSpatialGameSession(binary,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const village=state.villages[0],cx=Math.floor((village.x+24)/48),
      cz=Math.floor((village.z+24)/48);
    for(let z=cz-4;z<=cz+4;z++)for(let x=cx-4;x<=cx+4;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    const planner=createEventDrivenTaskPlanner(session);
    planner.resetFromState(state);
    const nav=createSpatialNavigationMovement(session,state),
      animal=state.raid.animals[0],wasm=session.core.wasm,
      attackStart={x:95,z:20},farStart=animal.spawn;
    nav.intentTaskPlanner=planner;
    nav.setActiveBounds([(cx-4)*48-24,(cz-4)*48-24,
      (cx+4)*48+24,(cz+4)*48+24]);
    // Select the real species profile before asking the native index.
    nav.spatialRouteStatus(attackStart,attackStart,animal.radius);
    const revision=wasm.lazy_route_revision(),sequence=wasm.nav_intent_last_sequence();
    const portals=wasm.nav_intent_wall_portals(animal.radius),
      portalRows=new Float64Array(wasm.memory.buffer,
        wasm.nav_intent_wall_portals_ptr(),portals*5);
    assert(!Array.from({length:portals},(_,index)=>portalRows[index*5])
      .includes(5123),'the partial wall is absent from region portals');
    const sidesAt=point=>{
      const count=wasm.nav_intent_relevant_wall_sides(point.x,point.z,
        animal.radius);
      const rows=new Float64Array(wasm.memory.buffer,
        wasm.nav_intent_relevant_wall_sides_ptr(),count*4);
      return Array.from({length:count},(_,index)=>({
        wallId:rows[index*4],x:rows[index*4+1],z:rows[index*4+2],
        groupId:rows[index*4+3]}));
    };
    const nearby=sidesAt(attackStart).filter(side=>side.wallId===5123);
    const originalPosition={x:animal.x,z:animal.z};
    Object.assign(animal,attackStart);
    const wallPlan=planner.planAttackWall(state,animal);
    assert.equal(wallPlan?.status,'found');
    assert.equal(wallPlan.target.id,'structure-5123');
    planner.cancelAttackIntent(animal.id);
    Object.assign(animal,originalPosition);
    assert(nearby.length>0,'the native advice includes the partial wall');
    assert(nearby.some(side=>nav.spatialRouteStatus(attackStart,side,
      animal.radius)==='found'));
    assert(nearby.every(side=>side.groupId>0));
    const distant=sidesAt(farStart);
    assert(distant.length>0);
    assert(distant.every(side=>nav.spatialRouteStatus(farStart,side,
      animal.radius)!=='found'));
    const box=raidWallEnvelope(state,nav),bounds=nav.activeBounds;
    const profile={worker:false,species:animal.species};
    assert.equal(session.actorExteriorRegionWitness(attackStart,bounds,box,
      profile),1);
    const edge=session.actorExteriorRegionEdge(attackStart,bounds,box,
      profile);
    assert(edge);
    assert.equal(nav.spatialRouteStatus(attackStart,edge,animal.radius),
      'found');
    assert.equal(exteriorRaidWitness(attackStart,animal.radius,box,nav),
      false,'the current raid policy still rejects this winding component');
    assert.notEqual(nav.spatialRouteStatus(farStart,attackStart,animal.radius),
      'found');
    assert.equal(serialize(state),before);
    assert.equal(wasm.lazy_route_revision(),revision);
    assert.equal(wasm.nav_intent_last_sequence(),sequence);
  }finally{session.dispose();}
});

test('Desert/123 partial night 17 shares a crop-facing wall route across the wave',()=>{
  const raw=readFileSync(new URL(
    '../docs/qa/desert-raid-pressure-audit/desierto123-partial-d17-waiting-state.json.gz',
    import.meta.url));
  const state=deserialize(gunzipSync(raw).toString()),before=serialize(state);
  const binary=new WebAssembly.Module(readFileSync(new URL(
    '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
  const loaded=new Map(),session=createSpatialGameSession(binary,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const village=state.villages[0],cx=Math.floor((village.x+24)/48),
      cz=Math.floor((village.z+24)/48);
    for(let z=cz-4;z<=cz+4;z++)for(let x=cx-4;x<=cx+4;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    const planner=createEventDrivenTaskPlanner(session);
    planner.resetFromState(state);planner.nativeWallSelectionEnabled=true;
    const nav=createSpatialNavigationMovement(session,state);
    nav.intentTaskPlanner=planner;
    const bounds=[(cx-4)*48-24,(cz-4)*48-24,
      (cx+4)*48+24,(cz+4)*48+24];
    nav.setActiveBounds(bounds);
    nav.setRaidView({x:99.70247532024266,z:30.57367599590944},
      state.structures.find(item=>item.kind==='center'));
    const specs=state.raid.animals.map(animal=>({radius:animal.radius})),
      original={entries:state.raid.animals.map(animal=>animal.spawn),
        exits:state.raid.animals.map(animal=>animal.exit)};
    const selected=exteriorRaidEntry(state,specs,bounds,0,nav,
      ()=>original,()=>null);
    assert(selected?.wallOpportunity);
    assert.equal(selected.entries.length,specs.length);
    const side=selected.wallOpportunity;
    for(let index=0;index<specs.length;index++)
      assert.equal(nav.spatialRouteStatus(selected.entries[index],side,
        specs[index].radius),'found');
    const actor=state.raid.animals[0],position={x:actor.x,z:actor.z};
    Object.assign(actor,selected.entries[0],{wallOpportunity:side});
    const choice=planner.planAttackWall(state,actor);
    assert.equal(choice?.status,'found');
    assert.equal(choice.target.id,`structure-${side.wallId}`);
    assert.deepEqual(deserialize(serialize(state)).raid.animals[0]
      .wallOpportunity,side);
    let prior={...selected.entries[0]};
    for(const point of choice.approach.path){
      assert(nav.segmentClear(prior,point,actor.radius,null,false));
      prior=point;
    }
    planner.cancelAttackIntent(actor.id);
    Object.assign(actor,position);
    const inaccessible=planner.planAttackWall(state,actor);
    assert.notEqual(inaccessible?.status,'found',
      'a shared hint cannot send an animal through an inaccessible component');
    delete actor.wallOpportunity;
    assert.equal(serialize(state),before);
  }finally{session.dispose();}
});

test('Desert/123 pending night 14 certifies an exterior wave after bounds expand',()=>{
  const raw=readFileSync(new URL(
    '../docs/qa/desert-raid-pressure-audit/desierto123-nativepartial-20-state.json.gz',
    import.meta.url));
  const state=deserialize(gunzipSync(raw).toString()),before=serialize(state);
  const binary=new WebAssembly.Module(readFileSync(new URL(
    '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
  const loaded=new Map(),session=createSpatialGameSession(binary,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    const nav=createSpatialNavigationMovement(session,state),
      bounds=[-24,-72,216,168],box=raidWallEnvelope(state,nav),
      specs=state.nightPlan.group.map(id=>({spec:animalSpec(id),
        radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
    for(let z=-1;z<=3;z++)for(let x=0;x<=4;x++){
      if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
      loaded.set(`${x},${z}`,session.core.chunkPayload());
    }
    nav.setActiveBounds(bounds);
    nav.setRaidView({x:99.70247532024266,z:30.57367599590944},
      state.structures.find(item=>item.kind==='center'));
    const revision=session.core.wasm.lazy_route_revision();
    const entry=chooseRaidEntry(state,specs,bounds,0,nav);
    assert.equal(entry?.entries.length,specs.length);
    assert.deepEqual(entry.selectionBounds,bounds);
    for(let index=0;index<specs.length;index++){
      const point=entry.entries[index],radius=specs[index].radius;
      assert(nav.walkable(point.x,point.z,radius,null,false));
      assert(nav.spatialExteriorEdge(point,radius,box));
    }
    assert.equal(session.core.wasm.lazy_route_revision(),revision);
    assert.equal(serialize(state),before);
    assert.equal(spawnRaid(state,state.nightPlan,nav),true);
    assert.equal(state.raid.animals.length,specs.length);
    const planner=createEventDrivenTaskPlanner(session);
    planner.resetFromState(state);
    planner.nativeWallSelectionEnabled=true;
    nav.intentTaskPlanner=planner;
    for(const animal of state.raid.animals.slice(0,3)){
      const choice=targetFor(state,animal,nav);
      assert.equal(choice?.target?.kind,'wall');
      planner.cancelAttackIntent(animal.id);
    }
    let hits=0,ruins=0;
    const stopTasks=planner.observeTasks(state),
      stopWorld=planner.observeWorld(state),
      stopEvents=Game.observeGameEvents(state,event=>{
        if(event.type==='AnimalLogicalHit')hits++;
        if(event.type==='StructureRuined')ruins++;
      });
    try{
      for(let second=0;second<180&&state.raid&&!state.result;second++){
        Game.tick(state,1,nav);
        planner.flushWorldEvents();
      }
    }finally{stopTasks();stopWorld();stopEvents();}
    assert.equal(state.raid,null,'the restored raid must finish');
    assert(hits>0,'the physically reachable wall attacks must land');
    assert(ruins>0,'the wave must be capable of breaking a wall');
  }finally{session.dispose();}
});
