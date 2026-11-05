import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newGame} from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {prepareFreshWorkerBootstrap} from '../src/simulation/fresh-worker-bootstrap.js';
import {prepareFreshWorkerBootstrapInWorker,repairSavedVillageInWorker} from '../src/simulation/fresh-worker-bootstrap-client.js';
import {repairSavedVillage} from '../src/simulation/repair-saved-village.js';
import {savedNativeAuthorityOptions} from '../src/simulation/native-authority-checkpoint.js';
import {createSimulationAuthority} from '../src/simulation/simulation-authority.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {nativeCameraPose} from '../src/rendering/terrain-camera.js';
import {farmHomeFocus} from '../src/rendering/farm-focus.js';

test('fresh worker bootstrap creates a restorable native world without advancing simulation',async()=>{
 const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm')),payload=JSON.parse(readFileSync('public/content/villages.json','utf8')).find(item=>item.id==='suajili'),state=newGame({seed:712,biome:'sabana',culture:'suajili',slotId:'fresh-worker'});
 const result=await prepareFreshWorkerBootstrap(module,serialize(state),payload),prepared=deserialize(result.initial.snapshot);assert.equal(prepared.elapsed,0);assert.ok(prepared.villages[0].entry);assert.ok(result.initial.chunkKeys.length>0);assert.equal(result.pose.eye.length,3);assert.ok(result.pose.eye.every(Number.isFinite));
 const reference=createSpatialGameSession(module,prepared,{loaded:()=>new Map(),onData(){}});try{const focus=farmHomeFocus(prepared),pose=nativeCameraPose(reference.field,[focus.x,0,focus.z],focus.theta??.5,1.16,focus.distance??38);assert.deepEqual(result.pose,{eye:pose.eye,target:pose.target});}finally{reference.dispose();}
 const authority=createSimulationAuthority(module,result.initial.snapshot,result.initial.chunkKeys,result.initial);try{const snapshot=authority.execute({kind:'snapshot',sequence:1});assert.equal(snapshot.snapshot,result.initial.snapshot);assert.deepEqual(snapshot.events,[]);}finally{authority.dispose();}
});

test('fresh mangrove bootstrap keeps the connected islet recipe',async()=>{
 const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm')),payload=JSON.parse(readFileSync('public/content/villages.json','utf8')).find(item=>item.id==='suajili'),state=newGame({seed:712,biome:'manglares',culture:'suajili',slotId:'fresh-mangrove'});
 const result=await prepareFreshWorkerBootstrap(module,serialize(state),payload),prepared=deserialize(result.initial.snapshot);assert.equal(prepared.mangroveNetwork,true);assert.equal(prepared.mangroveSettlementVersion,2);assert.ok(prepared.villages[0].entry);const authority=createSimulationAuthority(module,result.initial.snapshot,result.initial.chunkKeys,result.initial);try{const saved=authority.execute({kind:'snapshot',sequence:1,nativeAuthorityCheckpoint:true});assert.equal(saved.snapshot,result.initial.snapshot);const snapshot=deserialize(saved.snapshot);snapshot.workerNativeAuthorityCheckpoint=saved.nativeAuthorityCheckpoint;snapshot.workerRaidWaitBindings=saved.raidWaitBindings;delete snapshot.villages[0].entry;const repaired=deserialize(repairSavedVillage(serialize(snapshot),[payload],{module}));assert.deepEqual(repaired.villages[0].entry,prepared.villages[0].entry);assert.equal(repaired.mangroveNetwork,true);}finally{authority.dispose();}
});

test('fresh bootstrap worker is cancelled and cannot adopt a late result',async()=>{
 const controller=new AbortController(),worker={postMessage(){},terminate(){this.terminated=true;}},pending=prepareFreshWorkerBootstrapInWorker('{}',{units:[]},{signal:controller.signal,workerFactory:()=>worker});controller.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal(worker.terminated,true);worker.onmessage({data:{kind:'result',result:{initial:{snapshot:'{}',chunkKeys:[],navigationView:{}},pose:{eye:[0,0,0],target:[0,0,0]}}}});
});

test('fresh bootstrap worker rejects invalid output and terminates after success',async()=>{
 let worker={postMessage(){},terminate(){this.terminated=true;}},pending=prepareFreshWorkerBootstrapInWorker('{}',{units:[]},{workerFactory:()=>worker});worker.onmessage({data:{kind:'result',result:{initial:{snapshot:'{}',chunkKeys:[],navigationView:{}},pose:{eye:[0,0,NaN],target:[0,0,0]}}}});await assert.rejects(pending,/Invalid fresh worker response/);assert.equal(worker.terminated,true);
 worker={postMessage(){},terminate(){this.terminated=true;}};pending=prepareFreshWorkerBootstrapInWorker('{}',{units:[]},{workerFactory:()=>worker});const result={initial:{snapshot:'{}',chunkKeys:[],navigationView:{}},pose:{eye:[0,0,0],target:[0,0,0]}};worker.onmessage({data:{kind:'result',result}});assert.equal(await pending,result);assert.equal(worker.terminated,true);
});
test('saved footprint repair preserves checkpoint and reconstructs the same native authority',async()=>{
 const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm')),catalog=JSON.parse(readFileSync('public/content/villages.json','utf8')),payload=catalog.find(item=>item.id==='suajili'),state=newGame({seed:712,biome:'sabana',culture:'suajili',slotId:'repair-worker'}),fresh=await prepareFreshWorkerBootstrap(module,serialize(state),payload),authority=createSimulationAuthority(module,fresh.initial.snapshot,fresh.initial.chunkKeys,fresh.initial);let restored;
 try{const saved=authority.execute({kind:'snapshot',sequence:1,nativeAuthorityCheckpoint:true}),snapshot=deserialize(saved.snapshot);snapshot.workerNativeAuthorityCheckpoint=saved.nativeAuthorityCheckpoint;snapshot.workerRaidWaitBindings=saved.raidWaitBindings;const reference=structuredClone(snapshot),building=snapshot.villages[0].buildings.find(item=>item.kind!=='Zona común');assert.ok(building?.footprint);delete building.footprint;
  const repaired=repairSavedVillage(serialize(snapshot),catalog),result=deserialize(repaired);assert.deepEqual(result.villages,reference.villages);assert.deepEqual(result.workerNativeAuthorityCheckpoint,reference.workerNativeAuthorityCheckpoint);assert.deepEqual(result.workerRaidWaitBindings,reference.workerRaidWaitBindings);
  const options=savedNativeAuthorityOptions(repaired);restored=createSimulationAuthority(module,options.snapshot,options.chunkKeys,options);assert.equal(restored.verifyNativeBootstrap(options.nativeBootstrap),true);assert.equal(restored.execute({kind:'snapshot',sequence:1}).snapshot,fresh.initial.snapshot);
  const missingEntry=structuredClone(snapshot);delete missingEntry.villages[0].entry;assert.throws(()=>repairSavedVillage(serialize(missingEntry),catalog),/requires Wild Engine/);const entryRepair=deserialize(repairSavedVillage(serialize(missingEntry),catalog,{module}));assert.deepEqual(entryRepair.villages,reference.villages);assert.deepEqual(entryRepair.workerNativeAuthorityCheckpoint,reference.workerNativeAuthorityCheckpoint);assert.throws(()=>repairSavedVillage(serialize(snapshot),[]),/culture/);
 }finally{authority.dispose();restored?.dispose();}
});
test('saved repair worker is cancellable and rejects malformed replies',async()=>{
 const controller=new AbortController(),worker={postMessage(message){this.message=message;},terminate(){this.terminated=true;}},pending=repairSavedVillageInWorker('{}',[],{signal:controller.signal,workerFactory:()=>worker});assert.equal(worker.message.kind,'repair-village');controller.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal(worker.terminated,true);worker.onmessage({data:{kind:'result',result:{snapshot:'late'}}});
 const next={postMessage(){},terminate(){}},bad=repairSavedVillageInWorker('{}',[],{workerFactory:()=>next});next.onmessage({data:{kind:'result',result:{snapshot:5}}});await assert.rejects(bad,/Invalid fresh worker response/);
});
