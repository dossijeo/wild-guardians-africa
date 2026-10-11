import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';
import {nativeStablePlanPerimeterProof} from '../tools/native-stable-plan-perimeter-proof.mjs';
import {nativeWorkerServiceProofV3} from '../tools/native-worker-service-proof-v3.mjs';

test('native gate-phase reuse never carries protection across actual wall removals',()=>{
 const root=new URL('../docs/qa/integrated-spiritual-survival/campaign-v115-q15-good-sabana-123-hundred/',import.meta.url);
 const state=deserialize(gunzipSync(readFileSync(new URL('partial-state.json.gz',root))).toString());
 const trace=JSON.parse(readFileSync(new URL('partial.json',root))).receipts.defense.planned;
 const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[state.biome]+'.json',import.meta.url))).profile;
 const nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);
 const options={outline:trace.points,workersFirst:true,incrementalCrops:true,workerServiceProof:nativeWorkerServiceProofV3,gateAnimationInvariant:true};
 const quote=Game.quoteWallChain(state,'zarzas',trace.points,nav,{smooth:false,snap:false});
 assert.equal(quote.pieces.length,1,'Retained fixture has one proposed piece');
 const before=serialize(state),cold=nativeStablePlanPerimeterProof(state,nav,quote,trace.bounds,options);
 assert(cold.valid,cold.reason);assert.equal(serialize(state),before);
 const gates=state.structures.filter(w=>w.kind==='wall'&&w.gate);assert(gates.length);
 for(const gate of gates)gate.gateOpen=1;
 const current=serialize(state),warm=nativeStablePlanPerimeterProof(state,nav,quote,trace.bounds,options);
 assert(warm.valid,warm.reason);assert.equal(serialize(state),current);
 // Use real removals and their native graph invalidations. Withholding the
 // sole proposed piece alone did not open this historical fixture: both the
 // candidate and uncached reference still certified the original geometry.
 const walls=state.structures.filter(w=>w.kind==='wall');assert(walls.length);
 for(const wall of walls)assert(Game.removeWall(state,'qa-open-'+wall.id,wall.id,nav));
 assert.equal(state.structures.filter(w=>w.kind==='wall').length,0);
 const openedState=serialize(state);
 const open={...quote,pieces:[],previewPieces:[],updates:[]};
 const candidate=nativeStablePlanPerimeterProof(state,nav,open,trace.bounds,{...options,workersFirst:false});
 const baseline=nativeStablePlanPerimeterProof(state,nav,open,trace.bounds,{...options,workersFirst:false,gateAnimationInvariant:false,cache:false});
 assert.equal(candidate.valid,false,'Removed perimeter cannot remain certified');
 assert.equal(candidate.reason,baseline.reason);assert.equal(baseline.valid,false);
 assert.equal(candidate.reason,'native-animal-route-through-perimeter');
 assert.equal(serialize(state),openedState,'QA certification cannot build walls or damage crops');
});
