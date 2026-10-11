import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {createNativeFundedDefensePolicy} from '../tools/native-funded-defense-policy.mjs';
import {nativeIntegratedPerimeterProof} from '../tools/native-integrated-perimeter-proof.mjs';
let stablePaidState;
const protocols=['legacy','incremental-v3','worker-first-v4','stable-plan-v5'].map(perimeterQa=>({perimeterQa,gateAnimationInvariant:false}));
protocols.push({perimeterQa:'stable-plan-v5',gateAnimationInvariant:true});
for(const {perimeterQa,gateAnimationInvariant} of protocols)test(`incremental Canyon completion requires actual native coverage (${perimeterQa}, gate invariant ${gateAnimationInvariant})`,()=>{
 const s=deserialize(gunzipSync(readFileSync(new URL('../docs/qa/integrated-spiritual-survival/native-paid-canyon-eight-crop-service-v2-state.json.gz',import.meta.url))).toString());
 const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[s.biome]+'.json',import.meta.url))).profile;
 const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
 const policy=createNativeFundedDefensePolicy({startDay:1,material:'zarzas',interval:5,chunkPieces:8,obstacleAware:true,shoreRouting:true,repairPolicy:'breach-first',funding:'contour',perimeterQa,gateAnimationInvariant});
 let id=0;
 for(let i=0;i<8;i++){
  policy.act(s,nav,{command:kind=>'completion-check-'+kind+'-'+id++,reserve:30});
  // Advance normal worker/time simulation between player decisions.
  if(i<7)awaitTick(s,nav);
 }
 const report=policy.report();assert.equal(report.perimeterQa,perimeterQa);assert(report.paidCost>0);assert(report.completed);
 const proof=nativeIntegratedPerimeterProof(s,nav,{pieces:[],updates:[],suppressed:[]},report.completed.bounds,{outline:report.completed.points,cache:false});
 assert.equal(proof.valid,true);assert.equal(report.coverageDiagnostics.valid,true);
 assert.equal(report.coverageDiagnostics.pieces,0);assert.equal(report.coverageDiagnostics.updates,0);
 assert.equal(report.planned,null);assert.equal(report.history.at(-1).reason,'existing-paid-native-contour');
 assert.equal(report.gateAnimationInvariant,gateAnimationInvariant);
 if(perimeterQa==='stable-plan-v5'){
  if(!gateAnimationInvariant)stablePaidState=serialize(s);
  else {assert(stablePaidState);assert.equal(serialize(s),stablePaidState,'QA reuse must preserve every native state field and payment');}
 }
});
test('gate-phase optimization rejects unsupported protocols and non-boolean settings',()=>{
 for(const perimeterQa of ['legacy','incremental-v3','worker-first-v4'])assert.throws(()=>createNativeFundedDefensePolicy({perimeterQa,gateAnimationInvariant:true}),/requires stable-plan/);
 assert.throws(()=>createNativeFundedDefensePolicy({perimeterQa:'stable-plan-v5',gateAnimationInvariant:1}),/requires stable-plan/);
 assert.equal(createNativeFundedDefensePolicy().report().gateAnimationInvariant,false);
});
import * as Game from '../src/simulation/game.js';
function awaitTick(s,nav){Game.tick(s,5,nav);}
