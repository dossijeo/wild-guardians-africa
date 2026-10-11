// CPU diagnosis on retained copies; never rewrites a campaign or claims GPU cost.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';
import {Session} from 'node:inspector';

const [directory,output,tickArgument='1',quoteArgument='1',profileArgument]=process.argv.slice(2);
const tickCount=Number(tickArgument),quoteCount=Number(quoteArgument),profiling=profileArgument==='profile';
assert(Number.isSafeInteger(tickCount)&&tickCount>=1&&tickCount<=50);
assert(Number.isSafeInteger(quoteCount)&&quoteCount>=1&&quoteCount<=20);
assert(profileArgument===undefined||profiling);
if(!directory||!output||existsSync(output))throw Error('Retained stopped campaign and fresh output required');
const profilePaths=[output+'.tick.cpuprofile',output+'.quote.cpuprofile'];
if(profiling)for(const path of profilePaths)assert(!existsSync(path),'Refusing to overwrite CPU profile');
const beginProfile=async()=>{
 if(!profiling)return null;
 const session=new Session();session.connect();
 const post=(method,params={})=>new Promise((ok,fail)=>session.post(method,params,(error,result)=>error?fail(error):ok(result)));
 await post('Profiler.enable');await post('Profiler.start');
 return {session,post};
};
const endProfile=async(active,path)=>{
 if(!active)return;
 try{const {profile}=await active.post('Profiler.stop');writeFileSync(path,JSON.stringify(profile)+'\n');}
 finally{active.session.disconnect();}
};
const receipt=JSON.parse(readFileSync(join(directory,'receipt.json'),'utf8'));
assert.equal(receipt.status,'stopped-early-calibration');
const source=JSON.parse(readFileSync(join(directory,'source.json'),'utf8'));
for(const [path,hash] of Object.entries(source.sourceHashes))assert.equal(createHash('sha256').update(readFileSync(resolve(path))).digest('hex'),hash,'Frozen source changed: '+path);
const bytes=readFileSync(join(directory,'partial-state.json.gz')),text=gunzipSync(bytes).toString('utf8');
const partial=JSON.parse(readFileSync(join(directory,'partial.json'),'utf8'));
const make=()=>{
 const s=deserialize(text);assert(!s.result&&!s.raid,'Live daylight snapshot required');
 const profile=JSON.parse(readFileSync('public/content/biome-'+BIOME_IDS[s.biome]+'.json','utf8')).profile;
 const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
 const calls={path:0,segmentClear:0,walkable:0,placement:0};
 for(const key of Object.keys(calls)){const method=nav[key].bind(nav);nav[key]=(...args)=>{calls[key]++;return method(...args);};}
 return {s,nav,calls};
};
const tick=make(),tickSamples=[],tickProfiler=await beginProfile();
try{for(let i=0;i<tickCount;i++){const start=performance.now();Game.tick(tick.s,.2,tick.nav);tickSamples.push(performance.now()-start);}}
finally{await endProfile(tickProfiler,profilePaths[0]);}
const tickMs=tickSamples.reduce((a,b)=>a+b,0);
const quote=make(),beforeQuote=serialize(quote.s),candidate=partial.receipts.defense.planned;
assert(candidate,'Retained partial contour required');
const quoteSamples=[],quoteProfiler=await beginProfile();let plan;
try{for(let i=0;i<quoteCount;i++){const start=performance.now();plan=Game.quoteWallChain(quote.s,partial.receipts.defense.material,candidate.points,quote.nav,{smooth:false,snap:false});quoteSamples.push(performance.now()-start);}}
finally{await endProfile(quoteProfiler,profilePaths[1]);}
const quoteMs=quoteSamples.reduce((a,b)=>a+b,0);
assert.equal(serialize(quote.s),beforeQuote,'Quote changed native state');
assert.equal(createHash('sha256').update(readFileSync(join(directory,'partial-state.json.gz'))).digest('hex'),createHash('sha256').update(bytes).digest('hex'));
const result={directory,status:'observed-cpu-diagnostic',snapshotSha256:createHash('sha256').update(bytes).digest('hex'),toolSha256:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),fullFrozenSourcesMatch:true,
 start:{day:partial.day,time:partial.time},profiling,profilePaths:profiling?profilePaths:[],tick:{count:tickCount,milliseconds:tickMs,samples:tickSamples,calls:tick.calls,elapsedAdvanced:tick.s.elapsed-deserialize(text).elapsed},
 quote:{count:quoteCount,milliseconds:quoteMs,samples:quoteSamples,calls:quote.calls,pieces:plan.pieces.length,updates:plan.updates.length},
 scope:'Bounded native 0.2-second ticks and repeated native quotes on separate restored copies, initially cold navigation. Optional CPU profiles add overhead. No campaign result or frame/GPU/performance acceptance; JIT/caches differ from a running world. Original snapshot and quote state unchanged.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
