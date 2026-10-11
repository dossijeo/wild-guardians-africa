import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';
import {nativeStablePlanPerimeterProof} from './native-stable-plan-perimeter-proof.mjs';
import {nativeWorkerServiceProofV3} from './native-worker-service-proof-v3.mjs';
const output=process.argv[2];assert(output&&!existsSync(output),'Fresh output required');
const root=new URL('../docs/qa/integrated-spiritual-survival/campaign-v115-q15-good-sabana-123-hundred/',import.meta.url);
const bytes=readFileSync(new URL('partial-state.json.gz',root)),text=gunzipSync(bytes).toString();
const trace=JSON.parse(readFileSync(new URL('partial.json',root))).receipts.defense.planned;
const hash=value=>createHash('sha256').update(value).digest('hex'),rows=[],expected=new Map();let expectedPaid;
// Only this counter records whether an already-proven component was found
// warm. Keep validity, poses, blocked/certified counts, connectors and regions
// in the equality oracle; retain the complete original proof in each row.
const physicalProof=proof=>JSON.parse(JSON.stringify(proof,function(key,value){
 if(key==='terrainTileDiagnostics'||key==='terrainMemoDiagnostics')return undefined;
 if(key==='reusedComponents'&&this.reason==='native-service-poses-in-positive-closed-components')return undefined;
 return value;
}));
for(const arm of ['baseline','candidate','candidate','baseline']){
 const s=deserialize(text),profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[s.biome]+'.json',import.meta.url))).profile;
 const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
 const gates=s.structures.filter(w=>w.kind==='wall'&&w.gate);assert(gates.length,'Retained native gate required');
 for(const phase of [0,1]){
  // Controlled read-only certification input, not simulated motion, income or
  // a virtual-player action. Both arms receive exactly the same gate phase.
  for(const gate of gates)gate.gateOpen=phase;
  const before=serialize(s),plan=Game.quoteWallChain(s,'zarzas',trace.points,nav,{smooth:false,snap:false}),quote=JSON.stringify(plan);
  const started=performance.now(),proof=nativeStablePlanPerimeterProof(s,nav,plan,trace.bounds,{outline:trace.points,workersFirst:true,incrementalCrops:true,workerServiceProof:nativeWorkerServiceProofV3,gateAnimationInvariant:arm==='candidate'}),milliseconds=performance.now()-started;
  const physical=physicalProof(proof);
  assert.equal(serialize(s),before);assert.equal(JSON.stringify(plan),quote);assert(proof.valid,proof.reason);
  if(expected.has(phase))assert.deepEqual(physical,expected.get(phase));else expected.set(phase,physical);
  rows.push({arm,phase,milliseconds,certificateSha256:hash(JSON.stringify(physical)),quoteSha256:hash(quote),cropCount:s.plants.filter(p=>p.alive).length,gateCount:gates.length,fullProof:proof});const {fullProof,...summary}=rows.at(-1);console.log(JSON.stringify(summary));
 }
 const before=serialize(s);s.workers=[];
 const rejected=nativeStablePlanPerimeterProof(s,nav,Game.quoteWallChain(s,'zarzas',trace.points,nav,{smooth:false,snap:false}),trace.bounds,{outline:trace.points,workersFirst:true,workerServiceProof:nativeWorkerServiceProofV3,gateAnimationInvariant:arm==='candidate'});
 assert.equal(rejected.valid,false);assert.equal(rejected.reason,'worker-passage-not-observable');
 s.workers=deserialize(before).workers;assert.equal(serialize(s),before);
 assert(Game.buildWallChain(s,'qa-gate-invariant-paid','zarzas',trace.points,nav,{smooth:false,snap:false}));
 const paid=serialize(s);if(expectedPaid)assert.equal(paid,expectedPaid);else expectedPaid=paid;
}
const paths=['tools/benchmark-proof-gate-animation.mjs','tools/proof-geometry-signature-candidate.mjs','tools/native-perimeter-reused-candidate-v2.mjs','tools/static-animal-certificate-cache.mjs','tools/native-stable-plan-perimeter-proof.mjs','tools/stable-prospective-wall-plan-candidate.mjs','src/world/navigation.js'];
writeFileSync(output,JSON.stringify({scope:'AB/BA native cold and changed-gate-phase certification on retained snapshot. Controlled gate phase is diagnostic input, not physical motion or a campaign. Full certificates/quotes/state match and absent workers still reject. Concurrent CPU timings, not isolated hardware/GPU or campaign acceptance.',snapshotSha256:hash(bytes),rows,paidStateSha256:hash(expectedPaid),sourceHashes:Object.fromEntries(paths.map(p=>[p,hash(readFileSync(new URL('../'+p,import.meta.url)))]))},null,2)+'\n',{flag:'wx'});
