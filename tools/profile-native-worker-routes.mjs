import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation} from '../src/world/navigation.js';
import {evictOldest} from '../src/world/fifo-eviction.js';
import {createOpeningWorld} from './check_opening.mjs';
import * as Game from '../src/simulation/game.js';
import {nativeCameraPose} from '../src/rendering/terrain-camera.js';
import {activeChunkRegion} from '../src/world/active-region.js';
const [input,out,mode='cached']=process.argv.slice(2);
if(!['original','cached'].includes(mode))throw Error('Unknown comparison mode');
// Exact pre-candidate body from f60e926d; replace the prototype so inherited
// worker views also use the baseline. This is diagnostic-only, never production.
if(mode==='original')Navigation.prototype.walkable=function(x,z,radius=.3,ignore=null,worker=false){
 const exact=Number.isInteger(x)&&Number.isInteger(z),key=`${x},${z}:${radius}:${ignore}:${worker}`;
 if(exact&&this.walkCache.has(key))return this.walkCache.get(key);
 const result=this.testWalkable(x,z,radius,ignore,worker);
 if(exact){if(this.walkCache.size>=50000)evictOldest(this.walkCache);this.walkCache.set(key,result);}
 return result;
};
if(!input||!out||existsSync(out))throw Error('Use immutable INPUT snapshot.gz and fresh OUTPUT directory');
const original=readFileSync(input),digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const s=deserialize(gunzipSync(original).toString()),opening=createOpeningWorld({seed:s.seed,biome:s.biome,culture:s.culture,terrainVersion:s.terrainVersion}),nav=opening.nav;
if(s.time>=298||s.raid||s.result)throw Error('Diagnostic requires an uninterrupted daylight snapshot');
nav.setState(s);const center=s.structures[0];
const pose=nativeCameraPose(nav.field,[center.x,0,center.z],nav.field.canyon?0:.5,nav.field.canyon?1.18:1.16,nav.field.canyon?34:38);
nav.setRaidView({x:pose.eye[0],z:pose.eye[2]},center);nav.setActiveBounds(activeChunkRegion({x:pose.eye[0],z:pose.eye[2]}).bounds);
const queries={};
for(const name of ['path','workerPath','coarseSegmentClear','segmentClear','wateringRoute','portalGraph','walkable'])if(typeof nav[name]==='function'){
 const original=nav[name];queries[name]={calls:0,milliseconds:0};
 nav[name]=function(...args){const started=performance.now();try{return original.apply(this,args);}finally{queries[name].calls++;queries[name].milliseconds+=performance.now()-started;}};
}
const time=s.time,elapsed=s.elapsed,frames=[];mkdirSync(out,{recursive:true});
for(let i=0;i<40;i++){const started=performance.now();Game.tick(s,.05,nav);frames.push(performance.now()-started);}
if(digest(readFileSync(input))!==digest(original))throw Error('Input snapshot was modified');
const sorted=[...frames].sort((a,b)=>a-b);
const final=serialize(s);writeFileSync(out+'/final-state.json.gz',gzipSync(final));
const sourceFiles=['tools/profile-native-worker-routes.mjs','src/world/navigation.js','src/world/fractional-walkability-cache.js'];
writeFileSync(out+'/report.json',JSON.stringify({mode,baselineSource:'f60e926d',runtimeHashes:Object.fromEntries(sourceFiles.map(path=>[path,digest(readFileSync(path))])),finalStateSha256:digest(final),source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),input,inputSha256:digest(original),day:s.day,startTime:time,endTime:s.time,simulatedSeconds:s.elapsed-elapsed,
 frames,queries,totalCpuMilliseconds:frames.reduce((a,b)=>a+b,0),p50:sorted[20],p95:sorted[38],maximum:sorted[39],workers:s.workers.length,tasks:s.tasks.length,
 scope:'Read-only input; copied native snapshot advanced for two simulated daylight seconds, no player decisions, no raid, no campaign or GPU acceptance. Query timing is nested and instrumented: do not add categories or compare directly with uninstrumented gameplay.'},null,2)+'\n');
