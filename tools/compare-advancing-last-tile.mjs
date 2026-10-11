// Native ticks on copied state; this is not a campaign or player strategy run.
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
const [directory,output]=process.argv.slice(2),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
assert(directory&&output&&!existsSync(output));
const read=name=>JSON.parse(readFileSync(directory+'/'+name));assert.equal(read('receipt.json').status,'stopped-early-calibration');
for(const [path,hash] of Object.entries(read('source.json').sourceHashes))assert.equal(sha(readFileSync(path)),hash);
const original=readFileSync(new URL('./native-integrated-perimeter-proof.mjs',import.meta.url),'utf8');
const replacement=original.replace(/from '([^']+)'/g,(_match,path)=>`from ${JSON.stringify(new URL(path==='./terrain-lattice-tile-candidate.mjs'?'./terrain-lattice-last-tile-candidate.mjs':path,import.meta.url).href)}`);
const {nativeIntegratedPerimeterProof:candidate}=await import('data:text/javascript;base64,'+Buffer.from(replacement).toString('base64'));
const bytes=readFileSync(directory+'/partial-state.json.gz'),snapshot=gunzipSync(bytes).toString(),retained=read('partial.json').receipts.defense;
assert(retained.planned&&retained.perimeterQa==='worker-first-v4');
const profile=JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[deserialize(snapshot).biome]}.json`)).profile;
const result={status:'running-copied-native-probe',scope:'Five native simulated seconds, without player commands, on identical copied stopped states. Every checkpoint compares state and full physical proof; concurrent wall times are diagnostic only, not isolated acceptance or a 100-night result.',snapshotSha256:sha(bytes),sourceHashes:Object.fromEntries(['tools/compare-advancing-last-tile.mjs','tools/terrain-lattice-last-tile-candidate.mjs','tools/native-integrated-perimeter-proof.mjs'].map(path=>[path,sha(readFileSync(path))])),runs:[]};
writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
const expectedStates=[],expectedProofs=[];
try{
 for(const mode of ['baseline','candidate']){
  const s=deserialize(snapshot),nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
  for(let step=0;step<=20;step++){
   if(step)Game.tick(s,.25,nav);
   const state=serialize(s);if(mode==='baseline')expectedStates.push(state);else assert.equal(state,expectedStates[step],'Advancing native state differs at step '+step);
   if(step%10)continue;
   const plan=Game.quoteWallChain(s,retained.material,retained.planned.points,nav,{smooth:false,snap:false}),before=serialize(s),start=performance.now();
   const proof=(mode==='baseline'?baseline:candidate)(s,nav,plan,retained.planned.bounds,{outline:retained.planned.points,workerServiceProof:nativeWorkerServiceProofV3,incrementalCrops:true,workersFirst:true});
   const milliseconds=performance.now()-start;assert.equal(serialize(s),before,'Proof changed copied game state');
   const {terrainTileDiagnostics,...physical}=proof;
   if(mode==='baseline')expectedProofs.push(physical);else assert.deepEqual(physical,expectedProofs[step/10],'Physical certificate differs at step '+step);
   const row={mode,step,simulatedSeconds:step*.25,day:s.day,time:s.time,valid:proof.valid,reason:proof.reason,milliseconds,stateSha256:sha(state),physicalCertificateSha256:sha(JSON.stringify(physical)),ledgerEntries:Object.keys(s.ledger.entries).length,living:s.plants.filter(p=>p.alive).length,terrainTileDiagnostics};
   result.runs.push(row);writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(row));
  }
 }
 result.status='completed-copied-native-probe';result.allTwentyOneNativeStatesEqual=true;result.allThreePhysicalCheckpointsEqual=true;
}catch(error){result.status='failed-copied-native-probe';result.error=error.stack;throw error;}finally{writeFileSync(output,JSON.stringify(result,null,2)+'\n');}
