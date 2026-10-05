import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {tick} from '../src/simulation/game.js';
import {raidEntryKey,raidEntryRequest} from '../src/world/raid-entry-data.js';
import {computeRaidEntry} from '../src/world/compute-raid-entry.js';

const [input,output,count='4']=process.argv.slice(2),repeats=Number(count),steps=20,dt=1/60;
assert.ok(input&&output&&Number.isSafeInteger(repeats)&&repeats>0);
const source=JSON.parse(readFileSync(input)),context=source.timing.navigationContext,group=source.group??['warthog','hyena','buffalo','lion','rhino'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),states=Array.from({length:steps},()=>new Set()),rows=[];
for(let iteration=0;iteration<repeats;iteration++)for(const mode of iteration%2?['prepared','reference']:['reference','prepared']){
 const state=deserialize(context.state),profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[state.biome]+'.json',import.meta.url))).profile;
 assert.equal(state.pauses.length,0,'Paused fixture cannot measure movement');
 const nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);nav.setActiveBounds(context.activeBounds);nav.setRaidView(context.raidView.eye,context.raidView.target);
 for(const key of context.warmedChunks){const [cx,cz]=key.split(',').map(Number);nav.chunk(cx,cz);}
 if(mode==='prepared'){
  const key=raidEntryKey(state,nav,group),reply=computeRaidEntry(raidEntryRequest(state,nav,group,key,1));
  nav.preparedRaidEntry=(s,g,b)=>raidEntryKey(s,nav,g,b)===reply.key?reply:undefined;
 }
 const start=performance.now();spawnRaid(state,source.plan??{group},nav);const spawnMs=performance.now()-start,updates=[];
 for(let step=0;step<steps;step++){
  const started=performance.now();tick(state,dt,nav);const cpuMs=performance.now()-started,sha256=hash(serialize(state));states[step].add(sha256);
  updates.push({step,cpuMs,sha256,animals:state.raid?.animals.map(a=>({id:a.id,status:a.status,x:a.x,z:a.z,pathPoints:a.path?.length??0,targetId:a.targetId}))});
 }
 rows.push({iteration,mode,spawnMs,updates});
}
for(const [step,hashes] of states.entries())assert.equal(hashes.size,1,`Movement changed at step ${step}`);
const median=values=>{const sorted=values.sort((a,b)=>a-b),i=Math.floor(sorted.length/2);return sorted.length%2?sorted[i]:(sorted[i-1]+sorted[i])/2;};
const summary=Object.fromEntries(['reference','prepared'].map(mode=>{const runs=rows.filter(r=>r.mode===mode);return [mode,{medianSpawnMs:median(runs.map(r=>r.spawnMs)),medianFirstUpdateMs:median(runs.map(r=>r.updates[0].cpuMs)),maximumUpdateMs:Math.max(...runs.flatMap(r=>r.updates.map(t=>t.cpuMs))),medianSpawnAndUpdatesMs:median(runs.map(r=>r.spawnMs+r.updates.reduce((n,t)=>n+t.cpuMs,0)))}];}));
const paths=['src/world/navigation.js','src/simulation/raids.js','src/simulation/game.js','src/world/compute-raid-entry.js','src/world/raid-entry-data.js','tools/benchmark_raid_first_routes.mjs'];
writeFileSync(output,JSON.stringify({input,group,repeats,dt,steps,sourceHashes:Object.fromEntries(paths.map(p=>[p,hash(readFileSync(new URL('../'+p,import.meta.url)))])),summary,rows,scope:'Recorded native spawn and first twenty Game ticks on identical terrain and game state. Complete state equivalence at every step; excludes preparation, rendering and physical phone.'},null,2)+'\n');console.log(JSON.stringify(summary));
