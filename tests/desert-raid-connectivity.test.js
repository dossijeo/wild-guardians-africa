import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../src/persistence/snapshots.js';import {Navigation} from '../src/world/navigation.js';import {tick} from '../src/simulation/game.js';
const folder=new URL('../docs/qa/desert-raid-connectivity/',import.meta.url),records=JSON.parse(readFileSync(new URL('originals.json',folder))),profile=JSON.parse(readFileSync(new URL('../public/content/biome-desert.json',import.meta.url))).profile;
for(const record of records)for(const dt of [.1,1])for(const reload of [false,true])test(`${record.culture}: exact native campaign snapshot dt=${dt}${reload?' with partial save/reload':''} resolves raid physically`,()=>{
 const raw=gunzipSync(readFileSync(new URL(record.culture+'-original-state.json.gz',folder)));assert.equal(createHash('sha256').update(raw).digest('hex'),record.rawSha256);
 let s=deserialize(raw.toString('utf8')),nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);const day=s.day,initialEnded=s.events.filter(e=>e.type==='RaidEnded').length;
 let elapsed=0,saved=false,moved=false;
 while(s.raid&&!s.result&&elapsed<300){
  const actors=s.raid.animals,before=new Map(actors.map(a=>[a.id,{x:a.x,z:a.z,hits:a.hitsRemaining,status:a.status}]));tick(s,dt,nav);elapsed+=dt;
  for(const a of actors){const old=before.get(a.id),distance=Math.hypot(a.x-old.x,a.z-old.z);assert(distance<=3.8*dt+1e-8,'Native speed bound excludes teleport');moved||=distance>1e-8;assert(a.hitsRemaining<=old.hits,'No reset or reroll of attack budget');if(a.status!=='gone')assert(nav.terrainValid(a.x,a.z,a.radius,false),'Every actual animal footprint remains legal');}
  if(reload&&!saved&&elapsed>=10){const serialized=serialize(s);s=deserialize(serialized);nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);saved=true;}
 }
 assert(moved);assert.equal(s.raid,null,'Real raid must finish, not only a route query');assert.equal(s.result,null);assert.equal(s.day,day+1);assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,initialEnded+1);if(reload)assert(saved);
});
