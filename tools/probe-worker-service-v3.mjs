import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {nativeWorkerServiceProofV2} from './native-worker-service-proof-v2.mjs';
import {nativeWorkerServiceProofV3} from './native-worker-service-proof-v3.mjs';
const [directory,output]=process.argv.slice(2);assert(directory&&output);
assert.equal(JSON.parse(readFileSync(join(directory,'receipt.json'))).status,'stopped-early-calibration');
const bytes=readFileSync(join(directory,'partial-state.json.gz')),state=deserialize(gunzipSync(bytes).toString());
const profile=JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[state.biome]}.json`)).profile;
const before=serialize(state),results=[];
for(const [version,prove] of [['v2',nativeWorkerServiceProofV2],['v3',nativeWorkerServiceProofV3]]){
 const nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);
 const start=performance.now(),proof=prove(state,nav);
 assert.equal(serialize(state),before);
 results.push({version,milliseconds:performance.now()-start,proof});
}
const sourceHashes=Object.fromEntries(['tools/native-worker-service-proof-v2.mjs','tools/native-worker-service-proof-v3.mjs','src/world/worker-wall-overlap-recovery.js','src/world/navigation.js'].map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')]));
writeFileSync(output,JSON.stringify({scope:'Read-only worker proof comparison on stopped snapshot; not a campaign restart',snapshotSha256:createHash('sha256').update(bytes).digest('hex'),sourceHashes,stateUnchanged:true,results},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(results.map(r=>({version:r.version,valid:r.proof.valid,reason:r.proof.reason,milliseconds:r.milliseconds,returnChecks:r.proof.returnChecks,workerId:r.proof.workerId,targetId:r.proof.targetId}))));
