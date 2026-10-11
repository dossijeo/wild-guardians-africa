// CPU diagnostic on a retained native farm; never mutates the retained file.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {nativeWorkerServiceProof} from './native-worker-service-proof.mjs';
const [input,output]=process.argv.slice(2);assert(input&&output&&!existsSync(output),'Snapshot and fresh output required');
const hash=b=>createHash('sha256').update(b).digest('hex'),bytes=readFileSync(input),s=deserialize(gunzipSync(bytes).toString('utf8')),before=serialize(s);
const profilePath='public/content/biome-'+BIOME_IDS[s.biome]+'.json',profile=JSON.parse(readFileSync(profilePath)).profile;
const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);assert.equal(serialize(s),before,'Navigator restoration changed retained state');
const samples=[];
for(let i=0;i<3;i++){
 const started=performance.now(),proof=nativeWorkerServiceProof(s,nav);
 samples.push({phase:i?'warm':'cold',cpuMilliseconds:performance.now()-started,valid:proof.valid,reason:proof.reason,
  workersChecked:proof.checks.workers.length,cropsChecked:proof.checks.crops.length,failedWorkerId:proof.workerId??null,failedTargetId:proof.targetId??null});
 assert.equal(serialize(s),before,'Static proof modified the retained native state');
}
assert.equal(hash(readFileSync(input)),hash(bytes),'Retained snapshot file changed');
const sources=['tools/benchmark-native-worker-service-proof.mjs','tools/native-worker-service-proof.mjs','src/world/navigation.js','src/world/work-points.js','src/world/centers.js',profilePath];
const result={input,inputSha256:hash(bytes),biome:s.biome,culture:s.culture,livingCrops:s.plants.filter(p=>p.alive).length,
 eligibleWorkers:s.workers.filter(w=>!w.incapacitated&&w.status!=='home').length,stateUnchanged:true,
 sourceHashes:Object.fromEntries(sources.map(p=>[p,hash(readFileSync(p))])),samples,
 scope:'Current standalone QA helper over retained historical native geometry. Concurrent local CPU observations only, not a controlled benchmark, historical campaign replay, GPU/frame-time or economic acceptance. Early rejection measures only the visited prefix, not a complete dense-farm proof. Warm calls reuse exact native navigation caches.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
