// Isolated prospective metadata experiment. Never imported by a campaign.
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
import {nativeReusedServiceComponentProofV2} from './native-reused-service-component-proof-v2.mjs';
import {operational} from '../src/simulation/rules.js';
import {stableProspectiveWallPlan} from './stable-prospective-wall-plan-candidate.mjs';
const [directory,output]=process.argv.slice(2),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
assert(directory&&output&&!existsSync(output));
const read=name=>JSON.parse(readFileSync(directory+'/'+name));assert.equal(read('receipt.json').status,'stopped-early-calibration');
for(const [path,hash] of Object.entries(read('source.json').sourceHashes))assert.equal(sha(readFileSync(path)),hash);
const absoluteImports=source=>source.replace(/from '([^']+)'/g,(_match,path)=>`from ${JSON.stringify(new URL(path,import.meta.url).href)}`);
const source=readFileSync(new URL('./native-perimeter-reused-candidate-v2.mjs',import.meta.url),'utf8');
const marker=' // Native epochs invalidate';assert.equal(source.split(marker).length,2);
const changed=`import {stableProspectiveWallPlan} from '${new URL('./stable-prospective-wall-plan-candidate.mjs',import.meta.url).href}';\n`+absoluteImports(source).replace(marker,' plan=stableProspectiveWallPlan(s,nav,plan);\n'+marker);
const perimeterUrl='data:text/javascript;base64,'+Buffer.from(changed).toString('base64');
const integrated=readFileSync(new URL('./native-integrated-perimeter-proof.mjs',import.meta.url),'utf8').replace(/from '([^']+)'/g,(_match,path)=>`from ${JSON.stringify(path==='./native-perimeter-reused-candidate-v2.mjs'?perimeterUrl:new URL(path,import.meta.url).href)}`);
const {nativeIntegratedPerimeterProof:candidate}=await import('data:text/javascript;base64,'+Buffer.from(integrated).toString('base64'));
const bytes=readFileSync(directory+'/partial-state.json.gz'),snapshot=gunzipSync(bytes).toString(),retained=read('partial.json').receipts.defense;
assert(retained.planned&&retained.perimeterQa==='worker-first-v4');
const profile=JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[deserialize(snapshot).biome]}.json`)).profile;
const result={status:'running-copied-native-probe',scope:'Five simulated native seconds without player commands. Candidate aliases QA-only pending metadata after native gate choice. Native states and worker proofs must agree; final retained animal origins independently re-certified against all current targets. Concurrent CPU times are diagnostic, not isolated acceptance or game FPS.',snapshotSha256:sha(bytes),promoted:false,sourceHashes:Object.fromEntries(['tools/compare-advancing-stable-wall-plan.mjs','tools/stable-prospective-wall-plan-candidate.mjs'].map(path=>[path,sha(readFileSync(path))])),runs:[]};
writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
const expectedStates=[],expectedProofs=[];
try{
 for(const mode of ['baseline','candidate']){
  const s=deserialize(snapshot),nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);let workerChecks=0;
  const workerProof=(state,view)=>{workerChecks++;return nativeWorkerServiceProofV3(state,view);};
  for(let step=0;step<=20;step++){
   if(step)Game.tick(s,.25,nav);
   const state=serialize(s);if(mode==='baseline')expectedStates.push(state);else assert.equal(state,expectedStates[step],'Native state differs at step '+step);
   if(step%10)continue;
   const plan=Game.quoteWallChain(s,retained.material,retained.planned.points,nav,{smooth:false,snap:false}),planBefore=JSON.stringify(plan),before=serialize(s),start=performance.now();
   const proof=(mode==='baseline'?baseline:candidate)(s,nav,plan,retained.planned.bounds,{outline:retained.planned.points,workerServiceProof:workerProof,incrementalCrops:true,workersFirst:true});
   const milliseconds=performance.now()-start;assert.equal(serialize(s),before);assert.equal(JSON.stringify(plan),planBefore);assert(proof.valid,proof.reason);
   const {terrainTileDiagnostics,...physical}=proof;
   if(mode==='baseline')expectedProofs.push(physical);
   else {
    assert.deepEqual(proof.workerService,expectedProofs[step/10].workerService);
    if(!step)assert.deepEqual(physical,expectedProofs[0]);
    if(step===20){
     const canonical=stableProspectiveWallPlan(s,nav,plan),updates=new Map(canonical.updates.map(p=>[p.id,p]));
     const view=nav.forBuildingPlacement({id:'qa-independent-empty',x:1e12,z:1e12,radius:0,kind:'house'});
     view.obstacles=[...nav.obstacles.map(p=>updates.has(p.id)?{...p,...updates.get(p.id)}:p),...canonical.pieces];
     const checks=proof.checks.map(check=>({radius:check.radius,proof:nativeReusedServiceComponentProofV2(s,view,[...s.plants.filter(p=>p.alive),...s.structures.filter(operational)],check.radius,check.outside,retained.planned.points)}));
     assert(checks.every(c=>c.proof.valid),'Independent native retained-origin proof failed');result.independentFinalChecks=checks;
    }
   }
   const row={mode,step,simulatedSeconds:step*.25,milliseconds,valid:proof.valid,workerChecks,stateSha256:sha(state),living:s.plants.filter(p=>p.alive).length,ledgerEntries:Object.keys(s.ledger.entries).length,retainedCoverage:proof.animalCertificateCoverage??null,terrainTileDiagnostics};
   result.runs.push(row);writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(row));
  }
  assert.equal(workerChecks,3);
 }
 result.status='completed-copied-native-probe';result.allTwentyOneNativeStatesEqual=true;result.allThreeFreshWorkerProofsEqual=true;result.initialFullCertificateEqual=true;result.finalCurrentTargetsIndependentlyCertified=true;
}catch(error){result.status='failed-copied-native-probe';result.error=error.stack;throw error;}finally{writeFileSync(output,JSON.stringify(result,null,2)+'\n');}
