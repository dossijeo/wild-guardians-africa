// Read-only AB/BA experiment. The active campaign keeps the original adapter.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';
import {nativeIntegratedPerimeterProof as baseline} from './native-integrated-perimeter-proof.mjs';
import {nativeWorkerServiceProofV3} from './native-worker-service-proof-v3.mjs';

const [directory,output]=process.argv.slice(2);
assert(directory&&output&&!existsSync(output),'Pass stopped campaign and fresh output');
const read=name=>JSON.parse(readFileSync(directory+'/'+name)),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(read('receipt.json').status,'stopped-early-calibration');
const source=read('source.json');
for(const [path,value] of Object.entries(source.sourceHashes))assert.equal(sha(readFileSync(path)),value,'Retained source mismatch: '+path);
const original=readFileSync(new URL('./native-integrated-perimeter-proof.mjs',import.meta.url),'utf8');
const candidateSource=original.replace(/from '([^']+)'/g,(_match,path)=>`from ${JSON.stringify(new URL(path==='./terrain-lattice-tile-candidate.mjs'?'./terrain-lattice-last-tile-candidate.mjs':path,import.meta.url).href)}`);
const {nativeIntegratedPerimeterProof:candidate}=await import('data:text/javascript;base64,'+Buffer.from(candidateSource).toString('base64'));
const bytes=readFileSync(directory+'/partial-state.json.gz'),snapshot=gunzipSync(bytes).toString(),retained=read('partial.json').receipts.defense;
assert(retained.planned?.points?.length&&retained.perimeterQa==='worker-first-v4');
const profile=JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[deserialize(snapshot).biome]}.json`)).profile;
const result={scope:'Four cold prospective proofs in AB/BA order on identical copies of a stopped snapshot. Concurrent v116 and other workloads limit timing attribution; not isolated performance acceptance, game frame time or a promoted optimization.',snapshotSha256:sha(bytes),sourceHashes:Object.fromEntries(['tools/compare-planned-perimeter-last-tile.mjs','tools/terrain-lattice-last-tile-candidate.mjs','tools/terrain-lattice-tile-candidate.mjs','tools/native-integrated-perimeter-proof.mjs'].map(path=>[path,sha(readFileSync(path))])),runs:[]};
writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
let expected;
for(const mode of ['baseline','candidate','candidate','baseline']){
 const s=deserialize(snapshot),nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
 const before=serialize(s),plan=Game.quoteWallChain(s,retained.material,retained.planned.points,nav,{smooth:false,snap:false});
 const start=performance.now(),proof=(mode==='baseline'?baseline:candidate)(s,nav,plan,retained.planned.bounds,{outline:retained.planned.points,workerServiceProof:nativeWorkerServiceProofV3,incrementalCrops:true,workersFirst:true});
 const milliseconds=performance.now()-start;
 assert.equal(serialize(s),before,'Proof changed copied state');
 const {terrainTileDiagnostics,...physical}=proof;
 expected??=physical;assert.deepEqual(physical,expected,'Physical certificate changed');assert.equal(proof.valid,true);
 const row={mode,milliseconds,physicalCertificateSha256:sha(JSON.stringify(physical)),physicalCertificateExactlyEqual:true,stateUnchanged:true,quote:{cost:plan.cost,pieces:plan.pieces.length,updates:plan.updates.length},terrainTileDiagnostics};
 result.runs.push(row);writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(row));
}
result.status='completed-four-cold-proofs';writeFileSync(output,JSON.stringify(result,null,2)+'\n');
