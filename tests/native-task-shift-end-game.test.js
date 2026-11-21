import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nativeTaskConsequenceFixture} from './helpers/native-task-consequence.js';
import {nativeTaskSettlementFixture} from './helpers/native-task-settlement.js';
import {createNativeTaskGameFixture} from './helpers/native-task-game-execution.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {tick,prepareCrateDeliveryConsequence,projectNativeCrateDeliveryConsequence} from '../src/simulation/game.js';
import {PROFILES} from '../src/simulation/workforce.js';

// Real Game and installed native engines, using trusted source fixtures.
// Direct fixture commits are not GPU admission, Worker/Surface acceptance or
// evidence that a new producer or a 60 FPS presentation has been enabled.
for(const threaded of [false,true]){
async function fixture(kind,profile,run){let runtime,f;try{
 if(threaded){const{default:factory}=await import('../public/wild-engine/spatial-threaded.mjs');const wasm=fs.readFileSync(new URL('../public/wild-engine/spatial-threaded.wasm',import.meta.url));runtime=await createThreadedSpatialWorld(factory,{wasmBinary:wasm});}
 const options={core:runtime?.core,admitPeer:false,configureSave(saved){const actor=saved.workers[0].id;saved.workers=saved.workers.slice(0,1);saved.workers[0].profile=profile.id;saved.tasks=saved.tasks.filter(t=>!t.workerId||t.workerId===actor);}};
 f=kind==='walking'?createNativeTaskGameFixture({core:runtime?.core}):kind==='action'?nativeTaskConsequenceFixture({...options,progress:.1}):nativeTaskSettlementFixture({...options,arrived:false});await run(f);
 }finally{f?.close();await runtime?.dispose();}}
for(const profile of PROFILES)for(const kind of ['action','delivery'])test(`${threaded?'pthread':'standalone'} ${profile.id} ${kind} crosses shift end and finishes only its actual finite program`,async()=>fixture(kind,profile,f=>{
 assert.equal(f.state.workers.length,1);const read=()=>kind==='action'?f.planner.nativeTaskActionExecution(f.actor):f.planner.nativeDeliveryExecution(f.actor),binding=()=>kind==='action'?f.planner.nativeTaskActionBinding(f.actor):f.planner.nativeTaskConsequenceBinding(f.actor),before=read();assert(before);assert.equal(kind==='action'?before.completed:before.arrived,false);
 const source=binding(),body=f.body(1),count=f.w.spatial_body_count(),ledger=structuredClone(f.state.ledger),taskId=f.worker.taskId,crateId=f.worker.crateId,at=f.state.elapsed;assert(Array.isArray(body));assert.equal(body[0],1);f.state.time=profile.end-.05;
 assert.doesNotThrow(()=>tick(f.state,.1,f.nav));assert(f.state.time>=profile.end);assert(f.state.elapsed>at);assert.equal(f.worker.status,kind==='action'?'acting':'carrying');assert.equal(f.worker.nativeRouteAdmission,kind==='action'?'native-action':'native-delivery');assert.deepEqual(binding(),source);assert.equal(f.w.spatial_body_count(),count);assert.deepEqual(f.state.ledger,ledger);
 if(kind==='action'){assert.deepEqual(f.body(1),body);assert.equal(f.worker.taskId,taskId);tick(f.state,f.worker.actionRemaining+.15,f.nav);assert(read().completed);assert.equal(f.worker.actionRemaining,0);assert.equal(f.worker.taskId,taskId);assert.equal(f.state.tasks.find(t=>t.id===taskId).workerId,f.actor);assert.equal(f.state.crates.length,0);assert.deepEqual(f.body(1),body);}
 else{assert.notDeepEqual(f.body(1),body);assert.equal(f.body(1)[0],body[0]);assert.equal(f.worker.crateId,crateId);tick(f.state,Math.max(.1,source.reference.endTime-f.state.elapsed+.15),f.nav);assert(read().arrived);assert.equal(f.worker.crateId,crateId);const crate=f.state.crates.find(c=>c.id===crateId);assert.equal(crate.delivered,false);assert.equal(crate.carrierId,f.actor);}
 assert.equal(f.worker.status,kind==='action'?'acting':'carrying');assert.deepEqual(f.state.ledger,ledger);assert.deepEqual(binding(),source);assert.equal(f.w.spatial_body_count(),count);
}));
test(`${threaded?'pthread':'standalone'} a native Task walker retains its moving body and task until the prepared stop`,async()=>fixture('walking',PROFILES[2],f=>{
 const worker=f.state.workers[0],taskId=worker.taskId,at=f.state.elapsed,own=f.body(1);
 f.state.time=249.95;tick(f.state,.1,f.nav);
 assert(f.state.time>=250);assert(f.state.elapsed>at);
 assert.equal(worker.status,'walking');assert.equal(worker.nativeRouteAdmission,'native-task');
 assert.equal(worker.taskId,taskId);assert.equal(f.state.tasks.find(task=>task.id===taskId).workerId,worker.id);
 assert(own);assert(f.body(1));assert(f.body(3));assert.notDeepEqual(f.body(1),own);
 const execution=f.planner.nativeTaskExecution(worker.id),request=f.planner.nativeTaskRouteStopRequest(worker.id);
 assert.equal(execution.bodyId,1);
 assert.deepEqual(request,{reason:'home',taskId,bodyId:execution.bodyId,nativeRoute:execution.nativeRoute});
}));
test(`${threaded?'pthread':'standalone'} delivery completed after shift still settles once to the genuine Home source`,async()=>fixture('delivery',PROFILES[2],f=>{
 const source=f.carry.reference,ledger=structuredClone(f.state.ledger);f.state.time=249.95;tick(f.state,source.endTime-f.state.elapsed+.15,f.nav);assert(f.planner.nativeDeliveryExecution(f.actor).arrived);assert.deepEqual(f.state.ledger,ledger);const body=f.body(1),crate=f.state.crates.find(c=>c.id===f.worker.crateId),preview=prepareCrateDeliveryConsequence(f.state,f.worker,crate,f.center);assert.equal(preview.status,'returning');assert(preview.home);
 const p=f.prepareSettlement({home:preview.home});assert.equal(p.status,'proposed');assert.equal(f.commitSettlement(p.proposal),1);projectNativeCrateDeliveryConsequence(f.state,f.worker,preview,f.planner);assert.equal(f.planner.commitNativeCausalClock().status,'committed');assert.equal(f.worker.status,'returning');assert(crate.delivered);assert.equal(crate.carrierId,null);assert.equal(f.worker.crateId,null);assert.deepEqual(f.body(1),body);const held=f.planner.nativeTaskSettlementBinding(f.actor);assert(held.reference.home);assert.equal(f.planner.prepareNativeHomeRouteProposal(held).status,'proposed');assert.equal(Object.keys(f.state.ledger.entries).filter(k=>k==='deliver:'+crate.id).length,1);
}));

}
