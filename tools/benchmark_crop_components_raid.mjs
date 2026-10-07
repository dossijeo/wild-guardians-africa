import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import * as candidate from '../src/simulation/game.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {nativeCameraPose} from '../src/rendering/terrain-camera.js';
import {activeChunkRegion} from '../src/world/active-region.js';

assert.ok(process.argv[2],'Pass frozen reference root');assert.ok(process.argv[3],'Pass output JSON');
const reference=await import(pathToFileURL(resolve(process.argv[2],'src/simulation/game.js')));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const median=values=>[...values].sort((a,b)=>a-b)[values.length>>1];
const report={scope:'Replay of actual archived native active raids for at most sixty simulated seconds. Ordinary Game.tick, no changes to crop positions, life, targets, RNG, budgets, time, routes or money. Native continuation camera sets navigation residency. Alternating reference/candidate update order; exact snapshots after every tick. CPU simulation including navigation, not rendered frametime, GPU, FPS, mobile or a fresh current-balance campaign.',referenceRoot:resolve(process.argv[2]),sources:{referenceRaids:hash(readFileSync(resolve(process.argv[2],'src/simulation/raids.js'))),candidateRaids:hash(readFileSync(new URL('../src/simulation/raids.js',import.meta.url)))},cases:[]};
for(const name of ['gran-rio-mapungubwe','sabana-musgum']){
 const input=new URL('../docs/qa/raid-traffic-corners/'+name+'-state.json.gz',import.meta.url),raw=gunzipSync(readFileSync(input)),saved=deserialize(raw.toString()),worlds={};
 assert.ok(saved.raid);assert.equal(saved.result,null);assert.equal(saved.pauses.length,0);
 const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[saved.biome]+'.json',import.meta.url))).profile;
 for(const mode of ['reference','candidate']){
  const state=deserialize(raw.toString()),nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);
  const center=state.structures.find(c=>c.kind==='center'&&c.hp>0);assert.ok(center);
  const pose=nativeCameraPose(nav.field,[center.x,0,center.z],nav.field.canyon?0:.5,nav.field.canyon?1.18:1.16,nav.field.canyon?34:38);
  nav.setRaidView({x:pose.eye[0],z:pose.eye[2]},center);nav.setActiveBounds(activeChunkRegion({x:pose.eye[0],z:pose.eye[2]}).bounds);
  worlds[mode]={state,nav,module:mode==='reference'?reference:candidate,times:[],queries:0};
  const w=worlds[mode],find=nav.findPath;nav.findPath=function(...args){w.queries++;return find.apply(this,args);};
 }
 const checkpoints=[],changes=[];let previousTargets=new Map(saved.raid.animals.map(a=>[a.id,a.targetId]));
 for(let step=0;step<600;step++){
  for(const mode of step%2?['candidate','reference']:['reference','candidate']){
   const w=worlds[mode],start=performance.now();w.module.tick(w.state,.1,w.nav);w.times.push(performance.now()-start);
  }
  const a=serialize(worlds.reference.state),b=serialize(worlds.candidate.state);assert.equal(b,a,name+' step '+step);
  if(step%10===0)checkpoints.push({step,sha256:hash(b)});
  for(const animal of worlds.candidate.state.raid?.animals??[])if(animal.targetId!==previousTargets.get(animal.id)){
   changes.push({step,id:animal.id,from:previousTargets.get(animal.id),to:animal.targetId,referenceMs:worlds.reference.times.at(-1),candidateMs:worlds.candidate.times.at(-1)});previousTargets.set(animal.id,animal.targetId);
  }
  if(worlds.candidate.state.pauses.length||worlds.candidate.state.result)break;
 }
 assert.equal(worlds.candidate.queries,worlds.reference.queries);assert.ok(changes.some(c=>c.to),'Replay must exercise a new target selection');
 const timing=Object.fromEntries(Object.entries(worlds).map(([mode,w])=>[mode,{ticks:w.times.length,totalMs:w.times.reduce((a,b)=>a+b,0),medianMs:median(w.times),maximumMs:Math.max(...w.times)}]));
 const s=worlds.candidate.state,row={name,inputSha256:hash(raw),day:saved.day,history:saved.plants.length,living:saved.plants.filter(p=>p.alive).length,sourceAnimals:saved.raid.animals.map(a=>({species:a.species,status:a.status})),pathQueries:worlds.candidate.queries,raidEnded:!s.raid,elapsedSimulated:s.elapsed-saved.elapsed,finalSha256:hash(serialize(s)),checkpoints,targetChanges:changes,timing,samples:worlds.candidate.times.map((ms,step)=>({step,referenceMs:worlds.reference.times[step],candidateMs:ms}))};
 report.cases.push(row);writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({name,pathQueries:row.pathQueries,raidEnded:row.raidEnded,targetChanges:changes.length,timing}));
}
