import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import * as Game from '../src/simulation/game.js';
import {nativeStablePlanPerimeterProof} from '../tools/native-stable-plan-perimeter-proof.mjs';
import {nativeIntegratedPerimeterProof} from '../tools/native-integrated-perimeter-proof.mjs';
import {nativeWorkerServiceProofV3} from '../tools/native-worker-service-proof-v3.mjs';
const root=new URL('../docs/qa/integrated-spiritual-survival/campaign-v115-q15-good-sabana-123-hundred/',import.meta.url);
function fixture(){
 const state=deserialize(gunzipSync(readFileSync(new URL('partial-state.json.gz',root))).toString());
 const plan=JSON.parse(readFileSync(new URL('partial.json',root))).receipts.defense.planned;
 const profile=JSON.parse(readFileSync(new URL('../public/content/biome-'+BIOME_IDS[state.biome]+'.json',import.meta.url))).profile;
 const nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);return {state,nav,plan};
}
test('opt-in wrapper retains native geometry coverage across real deliveries with fresh workers and no state changes',()=>{
 const a=fixture(),b=fixture(),settings={outline:a.plan.points,incrementalCrops:true,workersFirst:true};let workerChecks=0;
 const workerProof=(s,view)=>{workerChecks++;return nativeWorkerServiceProofV3(s,view);};
 const quote=f=>Game.quoteWallChain(f.state,'zarzas',f.plan.points,f.nav,{smooth:false,snap:false});
 const first=quote(a),before=serialize(a.state),quoted=JSON.stringify(first);
 const cold=nativeStablePlanPerimeterProof(a.state,a.nav,first,a.plan.bounds,{...settings,workerServiceProof:workerProof});
 assert(cold.valid,cold.reason);assert.equal(serialize(a.state),before);assert.equal(JSON.stringify(first),quoted);
 for(let i=0;i<20;i++){Game.tick(a.state,.25,a.nav);Game.tick(b.state,.25,b.nav);assert.equal(serialize(a.state),serialize(b.state));}
 const current=quote(a),after=serialize(a.state),nativeQuote=JSON.stringify(current);
 assert.notEqual(current.pieces[0].id,first.pieces[0].id);
 const retained=nativeStablePlanPerimeterProof(a.state,a.nav,current,a.plan.bounds,{...settings,workerServiceProof:workerProof});
 assert(retained.valid);assert(retained.animalCertificateCoverage);assert.equal(workerChecks,2);
 assert.equal(serialize(a.state),after);assert.equal(JSON.stringify(current),nativeQuote);
 const fresh=nativeIntegratedPerimeterProof(b.state,b.nav,quote(b),b.plan.bounds,{...settings,cache:false,workerServiceProof:nativeWorkerServiceProofV3});
 assert(fresh.valid);assert.deepEqual(retained.workerService,fresh.workerService);assert.equal(serialize(a.state),serialize(b.state));
 // Actual purchase still consumes the native quote and uses its current IDs.
 for(const f of [a,b])assert(Game.buildWallChain(f.state,'native-paid-final','zarzas',f.plan.points,f.nav,{smooth:false,snap:false}));
 assert.equal(serialize(a.state),serialize(b.state));
 assert(a.state.structures.some(p=>p.id===current.pieces[0].id));
 assert.equal(a.state.ledger.entries['native-paid-final'].n,String(-current.cost));
});
