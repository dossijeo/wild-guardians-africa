// Read-only necessary-precondition experiment on a retained native campaign.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {quoteWallChain} from '../src/simulation/game.js';
import {nativeIntegratedPerimeterProof} from './native-integrated-perimeter-proof.mjs';
import {nativeWorkerServiceProofV3} from './native-worker-service-proof-v3.mjs';
const [directory,output,mode='worker-first',limitText='9']=process.argv.slice(2),limit=Number(limitText);assert(directory&&output&&!existsSync(output)&&['original','worker-first'].includes(mode)&&Number.isSafeInteger(limit)&&limit>=1&&limit<=9);
const read=name=>JSON.parse(readFileSync(directory+'/'+name));
assert.equal(read('receipt.json').status,'stopped-early-calibration');
const bytes=readFileSync(directory+'/partial-state.json.gz'),s=deserialize(gunzipSync(bytes).toString()),before=serialize(s);
const partial=read('partial.json'),defense=partial.receipts.defense,last=defense.history.at(-1);
const profilePath=`public/content/biome-${BIOME_IDS[s.biome]}.json`,profile=JSON.parse(readFileSync(profilePath)).profile,rows=[];
// Only rectangular native proposals can be recovered exactly from these bounds.
// Shore/routed polygons are deliberately excluded rather than fabricated.
for(const recorded of last.attempts.filter(a=>!a.shore&&!a.routed&&a.nativeBarrierProof).slice(0,limit)){
 const bounds=recorded.bounds,[x0,z0,x1,z1]=bounds,points=[[x0,z0],[x1,z0],[x1,z1],[x0,z1],[x0,z0]];
 const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
 const plan=quoteWallChain(s,defense.material,points,nav,{smooth:false,snap:false});
 assert.equal(plan.pieces.length,recorded.legalPieces);assert.equal(plan.suppressed.length,recorded.nativeVegetationRemoval);
 const start=performance.now(),proof=nativeIntegratedPerimeterProof(s,nav,plan,bounds,{outline:points,workerServiceProof:nativeWorkerServiceProofV3,workersFirst:mode==='worker-first',incrementalCrops:true});
 rows.push({bounds,recordedTime:last.time,snapshotTime:s.time,recordedReason:recorded.nativeBarrierProof.reason,recordedWorkerId:recorded.nativeBarrierProof.workerId??null,
  recordedTerrainRequests:recorded.nativeBarrierProof.terrainTileDiagnostics?.requests??null,milliseconds:performance.now()-start,proof});
 assert.equal(serialize(s),before);console.log(JSON.stringify({bounds,valid:proof.valid,reason:proof.reason,workerId:proof.workerId,animalSkipped:!!proof.animalCertificateSkipped,milliseconds:rows.at(-1).milliseconds}));
}
const hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(hash(readFileSync(directory+'/partial-state.json.gz')),hash(bytes));
const paths=['tools/probe-stopped-worker-first.mjs','tools/native-perimeter-reused-candidate-v2.mjs','tools/native-worker-service-proof-v3.mjs','tools/native-integrated-perimeter-proof.mjs',profilePath];
writeFileSync(output,JSON.stringify({scope:'Fresh native rectangular quotes and worker-first proofs on copied terminal snapshot. Snapshot follows the retained search by one native tick; historical counters are not timings or a same-state ABBA baseline. No campaign restart, gameplay changes or inferred animal protection.',mode,limit,snapshotSha256:hash(bytes),stateUnchanged:true,day:s.day,time:s.time,rows,sourceHashes:Object.fromEntries(paths.map(p=>[p,hash(readFileSync(p))]))},null,2)+'\n',{flag:'wx'});
