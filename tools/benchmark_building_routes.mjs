// Bounded CPU routing diagnostic. No renderer, simulation ticks or policy changes.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {deserialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {shortenBuildingRoute} from '../src/world/building-route-shortcut.js';
const raw=gunzipSync(readFileSync(new URL('../tests/fixtures/canyon-saheliana-day1-route.json.gz',import.meta.url))).toString('utf8');
const start={x:-15.10406224583656,z:53.49417272598826},end={x:-13.37303336523354,z:59.320231353738734};
const length=(a,route)=>route.reduce((sum,b,i)=>sum+Math.hypot(b.x-(i?route[i-1]:a).x,b.z-(i?route[i-1]:a).z),0);
const percentile=(samples,p)=>[...samples].sort((a,b)=>a-b)[Math.ceil(samples.length*p)-1];
const blocks=[];
for(const arm of ['A','B','B','A']){
 const state=deserialize(raw),profile=JSON.parse(readFileSync(new URL(`../public/content/biome-${BIOME_IDS[state.biome]}.json`,import.meta.url),'utf8')).profile;
 const nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);
 const samples=[],lengths=[],helperSamples=[];let cold;
 for(let i=0;i<74;i++){
  const b={x:end.x+(i%24)*.0001,z:end.z};
  const before=performance.now(),base=nav.smoothPath(start,nav.findPath(start,b,.28,null,true),.28,null,true),helperStart=performance.now();
  const route=arm==='B'?shortenBuildingRoute(nav,start,b,base,.28,null):base;
  const after=performance.now();let previous=start;
  // Verification runs after the timed query, in both arms.
  for(const point of route){if(!nav.segmentClear(previous,point,.28,null,true))throw Error('Invalid physical route');previous=point;}
  if(i===0)cold={totalMs:after-before,helperMs:after-helperStart};
  if(i>=10){samples.push(after-before);helperSamples.push(after-helperStart);lengths.push(length(start,route));}
 }
 blocks.push({arm,cold,samplesMs:samples,helperSamplesMs:helperSamples,routeLengths:lengths,medianMs:percentile(samples,.5),p95Ms:percentile(samples,.95),maximumMs:Math.max(...samples),helperP95Ms:percentile(helperSamples,.95),workerRouteCacheSize:nav.workerRouteCache.size,walkCacheSize:nav.walkCache.size});
}
const report={scope:'CPU findPath + smoothing + optional building shortcut, 10 warmup and 64 measured queries per fresh ABBA navigator. Geometry caches become warm; not whole-game frametime or GPU evidence.',blocks};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({scope:report.scope,blocks:blocks.map(({samplesMs,helperSamplesMs,routeLengths,...b})=>({...b,minLength:Math.min(...routeLengths),maxLength:Math.max(...routeLengths)}))},null,2));
