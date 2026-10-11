// Read-only CPU diagnosis of the QA hypothetical-perimeter proof, not combat.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {Session} from 'node:inspector';
import assert from 'node:assert/strict';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';
import {nativePerimeterProof} from './native-perimeter-proof.mjs';

const [directory,output]=process.argv.slice(2),profilePath=output+'.cpuprofile';
if(!directory||!output||existsSync(output)||existsSync(profilePath))throw Error('Stopped campaign and fresh outputs required');
const hash=v=>createHash('sha256').update(v).digest('hex');
const source=JSON.parse(readFileSync(join(directory,'source.json'),'utf8'));
const allowed=JSON.parse(readFileSync(join(directory,'boundary-faces-abba.json'),'utf8')).sourceDifferences;
const differences=[];
for(const [path,expected] of Object.entries(source.sourceHashes)){
 const actual=hash(readFileSync(resolve(path)));if(actual!==expected)differences.push({path,expected,actual});
}
assert.deepEqual(differences,allowed,'Only the recorded boundary candidate may differ');
assert.equal(JSON.parse(readFileSync(join(directory,'receipt.json'),'utf8')).status,'stopped-early-calibration');
const bytes=readFileSync(join(directory,'partial-state.json.gz')),s=deserialize(gunzipSync(bytes).toString('utf8')),before=serialize(s);
const partial=JSON.parse(readFileSync(join(directory,'partial.json'),'utf8')),candidate=partial.receipts.defense.planned;
const profile=JSON.parse(readFileSync('public/content/biome-'+BIOME_IDS[s.biome]+'.json','utf8')).profile;
const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
const plan=Game.quoteWallChain(s,partial.receipts.defense.material,candidate.points,nav,{smooth:false,snap:false});
const calls={path:0,approachPath:0,approachGroupBlocked:0,walkable:0};
const originalView=nav.forBuildingPlacement.bind(nav);
nav.forBuildingPlacement=(...args)=>{
 const view=originalView(...args);
 for(const key of Object.keys(calls)){const original=view[key].bind(view);view[key]=(...a)=>{calls[key]++;return original(...a);};}
 return view;
};
const session=new Session();session.connect();
const post=method=>new Promise((ok,fail)=>session.post(method,(error,value)=>error?fail(error):ok(value)));
let proof,coldMs;
try{
 await post('Profiler.enable');await post('Profiler.start');
 const start=performance.now();proof=nativePerimeterProof(s,nav,plan,candidate.bounds,{outline:candidate.shoreRouted?candidate.points:null});coldMs=performance.now()-start;
 const {profile}=await post('Profiler.stop');writeFileSync(profilePath,JSON.stringify(profile)+'\n');
}finally{session.disconnect();}
const coldCalls={...calls},start=performance.now(),warm=nativePerimeterProof(s,nav,plan,candidate.bounds,{outline:candidate.shoreRouted?candidate.points:null}),warmMs=performance.now()-start;
// Cache traversal can merge equivalent closed-region Set identities. Preserve
// both diagnostics; only that counter may differ, never physical conclusions.
const semantic=object=>JSON.stringify(object,(key,value)=>key==='regions'?undefined:value);
const semanticWarmMatch=semantic(warm)===semantic(proof);
assert.equal(serialize(s),before);
const result={status:'observed-hypothetical-proof-cpu',directory,snapshotSha256:hash(bytes),toolSha256:hash(readFileSync(new URL(import.meta.url))),sourceDifferences:differences,
 coldMilliseconds: coldMs,warmMilliseconds:warmMs,coldCalls,warmCalls:Object.fromEntries(Object.keys(calls).map(k=>[k,calls[k]-coldCalls[k]])),proof,warmProof:warm,semanticWarmMatch,
 scope:'Two native QA hypothetical-perimeter queries on an unchanged snapshot, first CPU-profiled and second cached. Unpaid proposed walls are not actual protection. Not campaign, frame, GPU or profitability acceptance.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
assert(semanticWarmMatch,'A warmed query changed more than region-cache diagnostics');
