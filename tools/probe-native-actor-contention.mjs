// Read-only diagnosis: saved bodies, native terrain sweeps, no tick or mutation.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {actorBlockers,actorSegmentClear} from '../src/simulation/actor-motion.js';
const input=process.argv[2];assert.ok(input,'Pass retained partial-state.json.gz');
const bytes=readFileSync(input),s=deserialize(gunzipSync(bytes).toString()),before=serialize(s);
const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[s.biome]+'.json',import.meta.url))).profile;
const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
const started=performance.now();
const actors=s.raid.animals.filter(a=>a.status!=='gone').map(a=>{
 const blockers=actorBlockers(s,a,false),next=a.path?.[0];
 const legs=[.01,.1,.5].map(length=>{
  if(!next)return null;const d=Math.hypot(next.x-a.x,next.z-a.z),t=Math.min(1,length/d);
  const point={x:a.x+(next.x-a.x)*t,z:a.z+(next.z-a.z)*t};
  return {length,point,bodyClear:actorSegmentClear(a,point,a,blockers),terrainClear:nav.segmentClear(a,point,a.radius,null,false)};
 });
 const yields=[];
 for(const other of blockers)if(Math.hypot(a.x-other.x,a.z-other.z)<5){
  const heading=Math.atan2(a.x-other.x,a.z-other.z),reach=a.radius+(other.radius??.28)+.5;
  for(const distance of [.25,.5,1,reach])for(let i=0;i<16;i++){
   const angle=heading+i*Math.PI/8,point={x:a.x+Math.sin(angle)*distance,z:a.z+Math.cos(angle)*distance};
   const bodyClear=actorSegmentClear(a,point,a,blockers);
   yields.push({otherId:other.id,distance,angleIndex:i,point,bodyClear,terrainClear:bodyClear?nav.segmentClear(a,point,a.radius,null,false):null});
  }
 }
 return {id:a.id,species:a.species,status:a.status,hitsRemaining:a.hitsRemaining,radius:a.radius,position:{x:a.x,z:a.z},next,pathLength:a.path?.length??0,legs,yields};
});
assert.equal(serialize(s),before,'Diagnosis must not mutate actors, RNG, ledger or save');
assert.deepEqual(readFileSync(input),bytes,'Original evidence must remain unchanged');
console.log(JSON.stringify({input,snapshotSha256:createHash('sha256').update(bytes).digest('hex'),day:s.day,time:s.time,result:s.result,actors,cpuMilliseconds:performance.now()-started,scope:'Static physical contention diagnosis only; no movement, raid completion, economic or performance acceptance.'},null,2));
