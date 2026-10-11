// Bounded native snapshot replay. No player-policy actions or damage overrides.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
const [runtimeRoot,input,output,stepText='120']=process.argv.slice(2),steps=Number(stepText);
assert(runtimeRoot&&input&&output&&Number.isSafeInteger(steps)&&steps>0&&steps<=600,'Runtime, snapshot, fresh output and 1..600 steps required');
assert(!existsSync(join(output,'report.json')),'Never overwrite earlier evidence');
const root=resolve(runtimeRoot),load=p=>import(pathToFileURL(join(root,p)).href);
const [{Navigation,BIOME_IDS},Game,{serialize,deserialize},{actorBlockers,actorSegmentClear}]=await Promise.all([
 load('src/world/navigation.js'),load('src/simulation/game.js'),load('src/persistence/snapshots.js'),load('src/simulation/actor-motion.js')]);
const bytes=readFileSync(input),s=deserialize(gunzipSync(bytes).toString());assert(s.raid&&s.result===null);
const profile=JSON.parse(readFileSync(join(root,'public/content/biome-'+BIOME_IDS[s.biome]+'.json'))).profile;
const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
const hash=value=>createHash('sha256').update(value).digest('hex'),initialRng=s.rng,initialLedger=JSON.parse(serialize(s)).ledger;
const paths=['src/world/navigation.js','src/simulation/game.js','src/simulation/actor-motion.js','src/simulation/animal-route-clearance.js','src/simulation/raids.js','src/simulation/raid-target-reservations.js','src/simulation/balance.js'];
const sourceHashes=Object.fromEntries(paths.map(p=>[p,hash(readFileSync(join(root,p)))])),toolSha256=hash(readFileSync(new URL(import.meta.url)));
const actorRows=()=>s.raid?.animals.map(a=>({id:a.id,status:a.status,x:a.x,z:a.z,hitsRemaining:a.hitsRemaining,targetId:a.targetId,
 pathPoints:a.path?.length,next:a.path?.[0],staticNextClear:a.path?.length?nav.segmentClear(a,a.path[0],a.radius,null,false):null,
 dynamicNextClear:a.path?.length?actorSegmentClear(a,a.path[0],a,actorBlockers(s,a,false)):null}))??[];
const initial=actorRows(),rows=[],started=performance.now();
for(let step=1;step<=steps&&s.raid;step++){
 const before=new Map(s.raid.animals.map(a=>[a.id,{x:a.x,z:a.z}])),t=performance.now();Game.tick(s,1,nav);
 const actors=actorRows();for(const a of actors){const p=before.get(a.id);a.moved=p?Math.hypot(a.x-p.x,a.z-p.z):null;}
 rows.push({step,elapsed:s.elapsed,day:s.day,time:s.time,result:s.result,raidActive:!!s.raid,milliseconds:performance.now()-t,actors});
 if(step%30===0||!s.raid)console.log(JSON.stringify({step,raidActive:!!s.raid,moving:actors.filter(a=>a.moved>1e-6).length,remaining:actors.filter(a=>a.status!=='gone').length}));
}
mkdirSync(output,{recursive:true});
writeFileSync(join(output,'state.json.gz'),gzipSync(Buffer.from(serialize(s))));
writeFileSync(join(output,'report.json'),JSON.stringify({scope:'Bounded native retained-snapshot replay, no virtual-player actions or fabricated victory/defeat. A remaining raid is a diagnostic, not campaign completion.',runtimeRoot:root,snapshotSha256:hash(bytes),sourceHashes,toolSha256,initialRng,finalRng:s.rng,initialLedger,finalLedger:JSON.parse(serialize(s)).ledger,wallMilliseconds:performance.now()-started,initial,rows,final:{day:s.day,time:s.time,result:s.result,raidActive:!!s.raid}},null,2)+'\n',{flag:'wx'});
