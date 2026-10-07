import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {updateRaid} from '../src/simulation/raids.js';
import * as Game from '../src/simulation/game.js';

test('exact paid-defense night 54 buffalo walks out of its tree overlap and reaches its saved exit after reload',()=>{
 const bytes=gunzipSync(readFileSync(new URL('../docs/qa/raid-paid-defense-night54/failure-state.json.gz',import.meta.url)));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'17d4cb1243c34656d4b481fcd0ec926ebd21a988c6478ed68ac8e70ad0fea70c');
 let s=deserialize(bytes.toString());
 const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[s.biome]+'.json',import.meta.url))).profile;
 let nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
 let animal=s.raid.animals.find(a=>a.status!=='gone');
 assert.equal(animal.id,'animal-173044');assert.equal(s.day,54);
 assert.equal(nav.walkable(animal.x,animal.z,animal.radius,null,false),false);
 const exit={...animal.exit},ledger=structuredClone(s.ledger),structures=structuredClone(s.structures);
 const tree=nav.propsAt(animal.x,animal.z,animal.radius+4).find(p=>p.id==='0:7:2');
 const clearance=a=>Math.hypot(a.x-tree.x,a.z-tree.z);
 let previousClearance=clearance(animal),steps=0,reloaded=false;
 for(;steps<200&&s.raid;steps++){
  const before={x:animal.x,z:animal.z};s.elapsed+=.1;updateRaid(s,.1,nav);
  assert.ok(Math.hypot(animal.x-before.x,animal.z-before.z)<=.38+1e-8,'No teleport or speed increase');
  assert.ok(nav.testSegmentClear(before,animal,animal.radius,null,false,true),'Every swept segment respects terrain, structures and monotonic prop clearance');
  if(previousClearance<tree.radius+animal.radius)assert.ok(clearance(animal)>=previousClearance-1e-8);
  previousClearance=clearance(animal);
  if(steps===0){s=deserialize(serialize(s));nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);animal=s.raid.animals.find(a=>a.id==='animal-173044');reloaded=true;}
 }
 assert.ok(reloaded);assert.equal(s.raid,null);assert.equal(animal.status,'gone');
 assert.deepEqual({x:animal.x,z:animal.z},exit);
 assert.deepEqual(s.ledger,ledger);assert.deepEqual(s.structures,structures);
 assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,1);
 Game.tick(s,.1,nav);
 assert.equal(s.day,55);assert.equal(s.completedNights,54);
 assert.ok(s.pauses.includes('hiring'),'The real deferred dawn becomes available');
});

test('prop escape rejects inward travel, new props, buildings and unsafe terrain; normal collision remains strict',()=>{
 const nav=new Navigation(712,'sabana',{});
 nav.propsAt=()=>[{slot:0,x:0,z:0,radius:2}];nav.obstacles=[];nav.terrainValid=()=>true;
 const start={x:1.5,z:0},out={x:3,z:0};
 assert.equal(nav.testSegmentClear(start,out,.5,null,false),false);
 assert.equal(nav.testSegmentClear(start,out,.5,null,false,true),true);
 assert.equal(nav.testSegmentClear(start,{x:0,z:3},.5,null,false,true),false);
 nav.propsAt=()=>[{slot:0,x:0,z:0,radius:2},{slot:0,x:3,z:0,radius:.5}];
 assert.equal(nav.testSegmentClear(start,out,.5,null,false,true),false);
 nav.propsAt=()=>[{slot:0,x:0,z:0,radius:2}];
 nav.obstacles=[{kind:'house',x:2.7,z:0,radius:.4}];
 assert.equal(nav.testSegmentClear(start,out,.5,null,false,true),false);
 nav.obstacles=[];nav.terrainValid=()=>false;
 assert.equal(nav.testSegmentClear(start,out,.5,null,false,true),false);
});
