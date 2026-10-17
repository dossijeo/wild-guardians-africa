import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {chooseRaidEntry} from '../src/simulation/raids.js';
import * as Game from '../src/simulation/game.js';

const fixture=JSON.parse(gunzipSync(readFileSync(new URL(
  './fixtures/desierto983-d6-no-walls-raid.json.gz',import.meta.url))));
const wasm=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const chunkAt=value=>Math.floor((value+24)/48);

test('a full post-intro wave reaches the farm from outside its crops',()=>{
  const state=deserialize(JSON.stringify(fixture.state)),bounds=fixture.activeBounds;
  const loaded=new Map(),session=createSpatialGameSession(wasm,state,{
    loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  try{
    for(let z=chunkAt(bounds[1]);z<=chunkAt(bounds[3]);z++)
      for(let x=chunkAt(bounds[0]);x<=chunkAt(bounds[2]);x++){
        if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
        loaded.set(`${x},${z}`,session.core.chunkPayload());
      }
    const nav=createSpatialNavigationMovement(session,state);
    nav.setActiveBounds(bounds);
    nav.setRaidView(fixture.raidView.eye,fixture.raidView.target);
    const specs=state.raid.animals.map(animal=>({radius:animal.radius}));
    const before=serialize(state),entry=chooseRaidEntry(state,specs,bounds,0,nav);
    assert(entry);
    assert.equal(entry.entries.length,specs.length);
    assert.equal(serialize(state),before,'entry selection cannot change economy or RNG');
    assert.deepEqual(chooseRaidEntry(state,specs,bounds,0,nav),entry);

    const crops=state.plants.filter(plant=>plant.alive);
    const limits=crops.reduce((box,plant)=>({minX:Math.min(box.minX,plant.x),
      maxX:Math.max(box.maxX,plant.x),minZ:Math.min(box.minZ,plant.z),
      maxZ:Math.max(box.maxZ,plant.z)}),
    {minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity});
    for(const [i,point] of entry.entries.entries()){
      const radius=specs[i].radius,exit=entry.exits[i];
      assert(point.x<limits.minX-radius-1||point.x>limits.maxX+radius+1||
        point.z<limits.minZ-radius-1||point.z>limits.maxZ+radius+1,
      `animal ${i} was born among the crops`);
      assert(nav.walkable(point.x,point.z,radius,null,false));
      assert(nav.segmentClear(point,exit,radius,null,false));
      for(let j=0;j<i;j++)assert(Math.hypot(point.x-entry.entries[j].x,
        point.z-entry.entries[j].z)>radius+specs[j].radius+1);
    }

    const lastEvent=Number(state.events.at(-1).id.split('-')[1]);
    for(const [i,animal] of state.raid.animals.entries())Object.assign(animal,{
      ...entry.entries[i],spawn:entry.entries[i],exit:entry.exits[i],
      status:'walking',targetId:null,reservation:null,path:null,raidWait:null});
    state.raid.waitQueue=[];state.raid.waitProgress={};
    for(let i=0;i<130&&state.raid;i++)Game.tick(state,1,nav);
    const newEvents=state.events.filter(event=>Number(event.id.split('-')[1])>lastEvent);
    assert(newEvents.some(event=>event.type==='CropHit'),
      'the animals must actually move and attack, not just have a logical route');
    assert.equal(newEvents.filter(event=>event.type==='AnimalTargetUnavailable').length,0);
    assert.equal(newEvents.filter(event=>event.type==='AnimalRetreating'&&
      event.reason==='budget-exhausted').length,specs.length);
  }finally{session.dispose();}
});
