import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import * as Game from '../src/simulation/game.js';

test('Musgum canyon retreat uses a valid land route beside the river and physically exits, including reload',()=>{
 let s=deserialize(readFileSync(new URL('./fixtures/canyon-retreat-musgum.json',import.meta.url),'utf8'));
 const profile=JSON.parse(readFileSync(new URL(`../public/content/biome-${BIOME_IDS[s.biome]}.json`,import.meta.url),'utf8')).profile;
 const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
 const initial=s.raid.animals.find(a=>a.status==='retreating'),exit={...initial.exit},radius=initial.radius;
 assert.ok(nav.path(initial,exit,radius,null,false,64),'the restored canyon retreat has a native dry route');
 assert.ok(nav.path(initial,initial.spawn,radius,null,false));
 assert.ok(nav.segmentClear(initial.spawn,exit,radius,null,false));
 const money=structuredClone(s.ledger.balance),hits=s.events.filter(e=>e.type==='AnimalLogicalHit').length,ended=s.events.filter(e=>e.type==='RaidEnded').length;
 let steps=0,last={x:initial.x,z:initial.z};
 while(s.raid&&steps<1000){
  const animal=s.raid.animals.find(a=>a.id===initial.id);
  Game.tick(s,.1,nav);
  assert.ok(nav.segmentClear(last,animal,radius,null,false));
  assert.ok(Math.hypot(animal.x-last.x,animal.z-last.z)<=.38+1e-9);
  last={x:animal.x,z:animal.z};steps++;
  if(steps===17){s=deserialize(serialize(s));nav.setState(s);assert.equal(s.raid.animals.find(a=>a.id===initial.id).status,'retreating');}
 }
 assert.ok(steps<1000);assert.equal(s.raid,null);assert.deepEqual(last,exit);
 assert.equal(s.day,11);assert.deepEqual(s.pauses,['hiring']);assert.equal(s.result,null);
 assert.deepEqual(s.ledger.balance,money);assert.equal(s.events.filter(e=>e.type==='AnimalLogicalHit').length,hits);
 assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,ended+1);
});
