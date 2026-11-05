import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newGame} from '../src/simulation/game.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {prepareFreshWorkerBootstrap} from '../src/simulation/fresh-worker-bootstrap.js';
import {prepareFreshWorkerBootstrapInWorker} from '../src/simulation/fresh-worker-bootstrap-client.js';
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
 const result=await prepareFreshWorkerBootstrap(module,serialize(state),payload),prepared=deserialize(result.initial.snapshot);assert.equal(prepared.mangroveNetwork,true);assert.equal(prepared.mangroveSettlementVersion,2);assert.ok(prepared.villages[0].entry);const authority=createSimulationAuthority(module,result.initial.snapshot,result.initial.chunkKeys,result.initial);try{assert.equal(authority.execute({kind:'snapshot',sequence:1}).snapshot,result.initial.snapshot);}finally{authority.dispose();}
});

test('fresh bootstrap worker is cancelled and cannot adopt a late result',async()=>{
 const controller=new AbortController(),worker={postMessage(){},terminate(){this.terminated=true;}},pending=prepareFreshWorkerBootstrapInWorker('{}',{units:[]},{signal:controller.signal,workerFactory:()=>worker});controller.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal(worker.terminated,true);worker.onmessage({data:{kind:'result',result:{initial:{snapshot:'{}',chunkKeys:[],navigationView:{}},pose:{eye:[0,0,0],target:[0,0,0]}}}});
});

test('fresh bootstrap worker rejects invalid output and terminates after success',async()=>{
 let worker={postMessage(){},terminate(){this.terminated=true;}},pending=prepareFreshWorkerBootstrapInWorker('{}',{units:[]},{workerFactory:()=>worker});worker.onmessage({data:{kind:'result',result:{initial:{snapshot:'{}',chunkKeys:[],navigationView:{}},pose:{eye:[0,0,NaN],target:[0,0,0]}}}});await assert.rejects(pending,/Invalid fresh worker response/);assert.equal(worker.terminated,true);
 worker={postMessage(){},terminate(){this.terminated=true;}};pending=prepareFreshWorkerBootstrapInWorker('{}',{units:[]},{workerFactory:()=>worker});const result={initial:{snapshot:'{}',chunkKeys:[],navigationView:{}},pose:{eye:[0,0,0],target:[0,0,0]}};worker.onmessage({data:{kind:'result',result}});assert.equal(await pending,result);assert.equal(worker.terminated,true);
});
