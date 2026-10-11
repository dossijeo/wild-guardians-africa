import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';
import {nativeIntegratedPerimeterProof} from './native-integrated-perimeter-proof.mjs';
import {nativeWorkerServiceProofV3} from './native-worker-service-proof-v3.mjs';
const [directory,output]=process.argv.slice(2);assert(directory&&output);
assert.equal(JSON.parse(readFileSync(join(directory,'receipt.json'))).status,'stopped-early-calibration');
const bytes=readFileSync(join(directory,'partial-state.json.gz')),state=deserialize(gunzipSync(bytes).toString());
const defense=JSON.parse(readFileSync(join(directory,'partial.json'))).receipts.defense,contour=defense.completed;assert(contour);
const profile=JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[state.biome]}.json`)).profile;
const nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);
const plan=Game.quoteWallChain(state,defense.material,contour.points,nav,{smooth:false,snap:false});
const before=serialize(state),results=[];
for(const version of ['v2-cold','v3-warm','v3-repeat']){
 const start=performance.now(),proof=nativeIntegratedPerimeterProof(state,nav,plan,contour.bounds,{outline:contour.points,...(version.startsWith('v3')?{workerServiceProof:nativeWorkerServiceProofV3}:{})});
 results.push({version,milliseconds:performance.now()-start,proof});assert.equal(serialize(state),before);
}
assert.equal(results[0].proof.valid,false);assert.equal(results[1].proof.valid,true);assert.equal(results[2].proof.valid,true);
assert.deepEqual(results[1].proof.checks,results[0].proof.animalChecks);
assert.deepEqual(results[2].proof.workerService,results[1].proof.workerService);
const sourceHashes=Object.fromEntries(['tools/native-worker-service-proof-v3.mjs','tools/native-perimeter-reused-candidate-v2.mjs','tools/native-integrated-perimeter-proof.mjs','src/simulation/game.js'].map(path=>[path,createHash('sha256').update(readFileSync(path)).digest('hex')]));
writeFileSync(output,JSON.stringify({scope:'Read-only integrated proof on stopped snapshot; no simulation or restart',snapshotSha256:createHash('sha256').update(bytes).digest('hex'),sourceHashes,stateUnchanged:true,results},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(results.map(r=>({version:r.version,valid:r.proof.valid,reason:r.proof.reason,milliseconds:r.milliseconds}))));
