import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';

test('opposing animals physically yield and finish the retained day-11 raid',()=>{
 const snapshot=gunzipSync(readFileSync(new URL('./fixtures/raid-deadlock-day11.json.gz',import.meta.url))).toString();
 const s=deserialize(snapshot),profile=JSON.parse(readFileSync(new URL(`../public/content/biome-${BIOME_IDS[s.biome]}.json`,import.meta.url)));
 const nav=new Navigation(s.seed,s.biome,profile.profile);nav.setState(s);
 const before=new Map(s.raid.animals.map(a=>[a.id,{x:a.x,z:a.z}]));
 Game.tick(s,1,nav);
 assert(s.raid.animals.some(a=>a.status!=='gone'&&Math.hypot(a.x-before.get(a.id).x,a.z-before.get(a.id).z)>.1));
 let seconds=1;
 while(s.raid&&seconds<180){
  const positions=new Map(s.raid.animals.map(a=>[a.id,{x:a.x,z:a.z}]));
  Game.tick(s,1,nav);seconds++;
  if(!s.raid)break;
  const active=s.raid.animals.filter(a=>a.status!=='gone');
  for(const a of active){
   const previous=positions.get(a.id);
   if(!previous)continue;
   assert(Math.hypot(a.x-previous.x,a.z-previous.z)<=3.8+1e-6,'yield cannot teleport or speed up an animal');
  }
  for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
   const a=active[i],b=active[j];
   assert(Math.hypot(a.x-b.x,a.z-b.z)>=a.radius+b.radius-1e-5,'yield cannot overlap animal bodies');
  }
 }
 assert.equal(s.raid,null);
 assert.equal(s.completedNights,11);
 assert.equal(s.day,12);
 assert.equal(s.result,null);
 assert(s.events.some(e=>e.type==='RaidEnded'));
});
