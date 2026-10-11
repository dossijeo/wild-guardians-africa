import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {createNativeFundedDefensePolicy} from '../tools/native-funded-defense-policy.mjs';
import {nativeIntegratedPerimeterProof} from '../tools/native-integrated-perimeter-proof.mjs';
for(const perimeterQa of ['legacy','incremental-v3'])test(`incremental Canyon completion requires actual native coverage (${perimeterQa})`,()=>{
 const s=deserialize(gunzipSync(readFileSync(new URL('../docs/qa/integrated-spiritual-survival/native-paid-canyon-eight-crop-service-v2-state.json.gz',import.meta.url))).toString());
 const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[s.biome]+'.json',import.meta.url))).profile;
 const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
 const policy=createNativeFundedDefensePolicy({startDay:1,material:'zarzas',interval:5,chunkPieces:8,obstacleAware:true,shoreRouting:true,repairPolicy:'breach-first',funding:'contour',perimeterQa});
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
});
import * as Game from '../src/simulation/game.js';
function awaitTick(s,nav){Game.tick(s,5,nav);}
