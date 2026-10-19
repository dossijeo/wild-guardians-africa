import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {createEventDrivenTaskPlanner} from '../src/world/wild-engine/spatial-intent-bridge.js';
import {exteriorRaidEntry,exteriorRaidWitness,raidWallEnvelope} from
  '../src/simulation/raid-exterior-entry.js';
import {exteriorGroupWitness} from '../src/simulation/raid-exterior-connectivity.js';
import {targetFor} from '../src/simulation/raids.js';

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
