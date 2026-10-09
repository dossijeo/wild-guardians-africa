import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../src/persistence/snapshots.js';import {Navigation} from '../src/world/navigation.js';import {tick} from '../src/simulation/game.js';
const raw=gunzipSync(readFileSync(new URL('../docs/qa/campaign-ci/current-3324d17d-terminals/desierto-saheliana-37876748172/desierto-saheliana-failure-state.json.gz',import.meta.url))),expectedSha='da68eb2a2c4904c0681537946500368964f451b5a3ca307c0fc7d5b96ac59d73',profile=JSON.parse(readFileSync(new URL('../public/content/biome-desert.json',import.meta.url))).profile;
for(const dt of [.05,.1,1])for(const reload of [false,true])test(`exact original Saheliana100 native raid finishes physically dt=${dt}${reload?' with partial reload':''}`,()=>{
 assert.equal(createHash('sha256').update(raw).digest('hex'),expectedSha);let s=deserialize(raw.toString('utf8')),nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);assert.equal(s.day,100);assert.equal(s.completedNights,99);assert.equal(s.result,null);const actorId='animal-509118',initial=s.raid.animals.find(a=>a.id===actorId),exit={...initial.exit},balance=structuredClone(s.ledger.balance);assert.equal(initial.radius,1.1);assert.equal(initial.hitsRemaining,0);let elapsed=0,saved=false,moved=false,lastActor=initial;
 while(s.raid&&!s.result&&elapsed<300){
  const actor=s.raid.animals.find(a=>a.id===actorId),before={x:actor.x,z:actor.z},path=actor.path,pathCopy=path?.map(p=>({...p}));tick(s,dt,nav);elapsed+=dt;lastActor=actor;
  const distance=Math.hypot(actor.x-before.x,actor.z-before.z);assert(distance<=3.8*dt+1e-8,'No teleport or speed boost');moved||=distance>1e-9;assert.equal(actor.hitsRemaining,0,'No new attacks or reroll');assert(nav.terrainValid(actor.x,actor.z,actor.radius,false));
  // The same retained path exposes any turns consumed this frame. Validate
  // every leg, rather than a straight chord across several valid bends.
  if(path&&actor.path===path){let previous=before;for(const point of [...pathCopy.slice(0,pathCopy.length-path.length),{x:actor.x,z:actor.z}]){assert(nav.segmentClear(previous,point,actor.radius,null,false),'Every retained path leg keeps native physical clearance');previous=point;}}
  if(reload&&!saved&&elapsed>=10){s=deserialize(serialize(s));nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);saved=true;}
 }
 assert(moved);assert.equal(s.raid,null);assert.equal(s.result,'victory');assert.equal(s.day,101);assert.equal(s.completedNights,100);assert.equal(lastActor.status,'gone');assert.deepEqual({x:lastActor.x,z:lastActor.z},exit);assert.deepEqual(s.ledger.balance,balance);if(reload)assert(saved);
});
