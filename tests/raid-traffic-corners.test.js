import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {tick} from '../src/simulation/game.js';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {actorSegmentClear} from '../src/simulation/actor-motion.js';

const root=new URL('../docs/qa/raid-traffic-corners/',import.meta.url);
const records=JSON.parse(readFileSync(new URL('snapshots.json',root)));
for(const record of records)test(record.key+': recorded opposing traffic yields around solid terrain and finishes the real raid',()=>{
 const raw=gunzipSync(readFileSync(new URL(record.key+'-state.json.gz',root)));
 assert.equal(createHash('sha256').update(raw).digest('hex'),record.sha256);
 const state=deserialize(raw.toString()),day=state.day;
 const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[state.biome]+'.json',import.meta.url))).profile;
 const nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);
 const actors=state.raid.animals,exits=new Map(actors.map(a=>[a.id,{...a.exit}]));
 const ended=state.events.filter(e=>e.type==='RaidEnded').length;
 let seconds=0;
 for(;state.raid&&!state.result&&seconds<120;seconds+=.1){
  const before=actors.map(a=>({x:a.x,z:a.z}));
  const previousActors=structuredClone(actors);
  tick(state,.1,nav);
  actors.forEach((a,i)=>{
   assert.ok(Math.hypot(a.x-before[i].x,a.z-before[i].z)<=.38+1e-8,'Movement respects the existing speed');
   assert.ok(nav.segmentClear(before[i],a,a.radius,null,false),'Movement respects native terrain and buildings');
   // Raid actors move sequentially: earlier bodies have already moved when
   // this actor is tested, while later bodies still have their previous pose.
   const others=actors.map((other,j)=>j<i?other:previousActors[j]).filter((other,j)=>j!==i&&other.status!=='gone');
   assert.ok(actorSegmentClear(before[i],a,{...a,...before[i]},others),'Movement respects the other bodies');
  });
  const present=actors.filter(a=>a.status!=='gone');
  for(let i=0;i<present.length;i++)for(let j=i+1;j<present.length;j++)assert.ok(Math.hypot(present[i].x-present[j].x,present[i].z-present[j].z)>=present[i].radius+present[j].radius-1e-8);
 }
 assert.equal(state.raid,null);assert.equal(state.result,null);assert.equal(state.day,day+1);
 assert.equal(state.events.filter(e=>e.type==='RaidEnded').length,ended+1);
 for(const a of actors){assert.equal(a.status,'gone');assert.deepEqual({x:a.x,z:a.z},exits.get(a.id));}
 assert.equal(serialize(deserialize(serialize(state))),serialize(state));
});
