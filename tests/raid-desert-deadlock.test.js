import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {tick} from '../src/simulation/game.js';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation} from '../src/world/navigation.js';

for(const dt of [.1,1])test(`recorded Desert day-59 opposing traffic finishes physically at dt=${dt}`,()=>{
 const state=deserialize(gunzipSync(readFileSync(new URL('../docs/qa/raid-desert-day59/desierto-mapungubwe-failure-state.json.gz',import.meta.url))).toString());
 const pack=JSON.parse(readFileSync(new URL('../public/content/biome-desert.json',import.meta.url),'utf8'));
 const nav=new Navigation(state.seed,state.biome,pack.profile);nav.setState(state);
 assert.equal(state.day,59);assert.equal(state.workers.length,79);assert.equal(state.raid.animals.length,4);
 const actors=state.raid.animals,exits=actors.map(a=>({...a.exit})),ended=state.events.filter(e=>e.type==='RaidEnded').length;
 // A one-second tick contains ten physical 0.1-second steps. Its straight
 // start-to-end chord can cross a wall when the actor actually went around it.
 const substep=dt===1?deserialize(serialize(state)):null,subNav=substep?new Navigation(substep.seed,substep.biome,pack.profile):null;
 if(subNav)subNav.setState(substep);
 const spent=actors[1];assert.equal(spent.hitsRemaining,0);
 let seconds=0;
 for(;state.raid&&!state.result&&seconds<120;seconds+=dt){
  const before=actors.map(a=>({x:a.x,z:a.z}));
  tick(state,dt,nav);
  if(substep){
   const subActors=substep.raid?.animals??[];
   for(let k=0;k<10;k++){
    const prior=subActors.map(a=>({x:a.x,z:a.z}));tick(substep,.1,subNav);
    for(let i=0;i<subActors.length;i++)assert.ok(subNav.segmentClear(prior[i],subActors[i],subActors[i].radius,null,false),'Every physical substep clears native terrain');
   }
   for(let i=0;i<actors.length;i++)assert.ok(Math.hypot(actors[i].x-subActors[i].x,actors[i].z-subActors[i].z)<1e-8,'One-second and ten substep motion agree');
  }
  for(let i=0;i<actors.length;i++){
   const a=actors[i],travel=Math.hypot(a.x-before[i].x,a.z-before[i].z);
   assert.ok(travel<=3.8*dt+1e-8,'No teleport or increased speed');
   if(!substep)assert.ok(nav.segmentClear(before[i],a,a.radius,null,false),'Native terrain remains solid');
   if(a.status==='gone')assert.ok(Math.hypot(a.x-exits[i].x,a.z-exits[i].z)<1e-8,'Original exit is reached');
  }
  const present=actors.filter(a=>a.status!=='gone');
  for(let i=0;i<present.length;i++)for(let j=i+1;j<present.length;j++)assert.ok(Math.hypot(present[i].x-present[j].x,present[i].z-present[j].z)>=present[i].radius+present[j].radius-1e-8,'Animals never overlap');
  assert.equal(spent.hitsRemaining,0,'Retreating animal never gains attacks');
 }
 assert.equal(state.result,null);assert.equal(state.raid,null);assert.equal(state.day,60);assert.deepEqual(state.pauses,['hiring']);
 assert.equal(state.events.filter(e=>e.type==='RaidEnded').length,ended+1);
 assert.equal(serialize(deserialize(serialize(state))),serialize(state));
});
