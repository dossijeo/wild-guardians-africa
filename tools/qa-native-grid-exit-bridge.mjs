import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {animalExitConnector} from '../src/simulation/animal-exit-connectors.js';

const input=process.argv[2];assert.ok(input);
const bytes=readFileSync(input),s=deserialize(gunzipSync(bytes).toString());
const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[s.biome]+'.json',import.meta.url))).profile;
const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
const a=s.raid.animals.find(a=>a.status==='retreating'),before=serialize(s),samples=[];
const warmNative=process.argv[3]==='--warm-native',warmStart=performance.now();
if(warmNative){
 for(const margin of [16,32,64])nav.path(a,a.exit,a.radius,null,false,margin);
 if(nav.segmentClear(a.spawn,a.exit,a.radius,null,false))for(const margin of [16,32,64])nav.path(a,a.spawn,a.radius,null,false,margin);
 nav.propOverlapExitPath?.(a,a.exit,a.radius,null,false);
}
const warmMilliseconds=performance.now()-warmStart;
let queryOrigin=null;const nativeSteps=nav.findPathSteps;
nav.findPathSteps=function(...args){queryOrigin={...args[0]};return nativeSteps.apply(this,args);};
const slowest=[];
let path=null,checks=0,maxChecks=0;
for(const name of ['walkable','segmentClear']){const original=nav[name];nav[name]=function(...args){checks++;return original.apply(this,args);};}
for(let i=0;i<4000&&!path;i++){
 const c=checks,start=performance.now();path=animalExitConnector(a,a.exit,nav);const milliseconds=performance.now()-start;samples.push(milliseconds);maxChecks=Math.max(maxChecks,checks-c);
 slowest.push({call:i,milliseconds,clearanceQueries:checks-c,queryOrigin});slowest.sort((a,b)=>b.milliseconds-a.milliseconds);slowest.length=Math.min(slowest.length,5);
}
assert.ok(path);let previous=a;
for(const p of path){assert.ok(nav.walkable(p.x,p.z,a.radius,null,false));assert.ok(nav.segmentClear(previous,p,a.radius,null,false));previous=p;}
assert.deepEqual(previous,a.exit);assert.deepEqual(s.rng,JSON.parse(before).rng);assert.deepEqual(s.ledger,JSON.parse(before).ledger);
assert.deepEqual(readFileSync(input),bytes);
samples.sort((a,b)=>a-b);
console.log(JSON.stringify({input,snapshotSha256:createHash('sha256').update(bytes).digest('hex'),node:process.version,platform:process.platform,warmNative,warmMilliseconds,calls:samples.length,pathPoints:path.length,searchMilliseconds:{p50:samples[Math.floor(samples.length*.5)],p95:samples[Math.floor(samples.length*.95)],maximum:samples.at(-1),total:samples.reduce((a,b)=>a+b,0)},maximumNativeClearanceQueriesPerCall:maxChecks,slowest,scope:'Isolated connector CPU diagnostic, excluding navigator construction and disclosed existing route warmup; no synchronous grid drain, GPU or full-frame performance claim. Query instrumentation adds overhead.'},null,2));
