import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Worker} from 'node:worker_threads';
import {Scene} from 'three';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {createSpatialTerrainView} from '../src/world/wild-engine/spatial-terrain-view.js';
import {captureMudInputs} from '../src/simulation/mud-terrain-input.js';
import {createConfirmedTerrainReceiver} from '../src/rendering/confirmed-terrain-receiver.js';
import {createWebGpuMudPreparer} from '../src/rendering/webgpu-mud-preparer.js';
import {prepareWebGpuTemporalTerrain} from '../src/rendering/webgpu-temporal-terrain.js';

// Run the real triangulation worker with the browser event interface used by
// the production queue. GPU admission remains a deterministic test double.
class NodeMudWorker extends EventTarget {
 constructor(){super();this.started=new Promise(resolve=>{this.markStarted=resolve;});this.worker=new Worker(new URL('../tools/trees/mud-worker-node.js',import.meta.url),{type:'module'});this.worker.on('message',data=>this.dispatchEvent(new MessageEvent('message',{data})));this.worker.on('error',error=>{const event=new Event('error');event.message=error.message;this.dispatchEvent(event);});}
 postMessage(message,transfer){this.worker.postMessage(message,transfer);this.markStarted();}
 terminate(){return this.worker.terminate();}
}
function nativePayload(){const module=new WebAssembly.Module(readFileSync(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url))),world=createSpatialWorld(module);world.generate(712,0,0,'mangrove');world.addChunk(0,0);const payload=world.chunkPayload();payload.mudInputs=captureMudInputs(createSpatialTerrainView(world),0,0,payload.terrain.positions);payload.instances=Array.from({length:20},()=>[]);return payload;}
function fixture(){const errors=[],applied=[],port={postMessage(){},start(){},close(){}},worker=new NodeMudWorker(),preparer=createWebGpuMudPreparer({worker}),scene=new Scene();let disposed=0,committed=0;const residency={replace(){throw Error('unexpected legacy path');},prepareRevision(_payload,_revision,_epoch,{mudGeometry}){assert.ok(mudGeometry?.attributes.position.count>0);return {participant(){return {mudGeometry};},abort(){mudGeometry.dispose();disposed++;}};}};const biome={ready:Promise.resolve(true),requestSlots:async()=>{},prepareRevision(){return {participant(){return {};},abort(){}};}},coordinator={async prepareBatch(parts){return {commit(){committed++;parts[0].mudGeometry.dispose();disposed++;},abort(){parts[0].mudGeometry.dispose();disposed++;}};}};const receiver=createConfirmedTerrainReceiver({port,session:'s',confirmedSequence:1,confirmedElapsed:1,retainRevisions:true,allowReplay:true,validateRevision:()=>{},onError:error=>errors.push(error.message),onApplied:()=>applied.push(true),residency,prepareGraphicalBatch:(messages,{signal})=>prepareWebGpuTemporalTerrain(messages,{signal,scene,residency,biome,coordinator,mudPreparer:preparer,suppressed:[],validateInstances(){},publicationEpoch:value=>value,publicationOrder:()=>1})});const payload=nativePayload(),batch={chunks:[payload],terrainManifest:{epoch:'e',chunks:[{cx:0,cz:0,revision:1}]}};receiver.beginReplay({sequence:1,epoch:'e'});return {receiver,preparer,worker,batch,errors,applied,get disposed(){return disposed;},get committed(){return committed;}};}

test('cancelled replay wait leaves actual mud preparation available to a later recovery wait',async()=>{const f=fixture(),controller=new AbortController();try{f.receiver.stageReplayBoundary(2,[f.batch]);const cancelled=f.receiver.waitForReplayBoundary(2,{signal:controller.signal});controller.abort();await assert.rejects(cancelled,{name:'AbortError'});await f.receiver.waitForReplayBoundary(2);assert.equal(f.receiver.status().closed,false);assert.equal(f.committed,0);f.receiver.confirm(2,2);assert.equal(f.committed,1);assert.equal(f.disposed,1);assert.deepEqual(f.applied,[true]);f.receiver.finishReplay();assert.deepEqual(f.errors,[]);}finally{f.receiver.dispose();f.preparer.dispose();}});

test('disposing receiver during actual mud preparation cannot commit late geometry',async()=>{const f=fixture();try{f.receiver.stageReplayBoundary(2,[f.batch]);const waiting=f.receiver.waitForReplayBoundary(2);await f.worker.started;f.receiver.dispose();await assert.rejects(waiting,/disposed/);await new Promise(resolve=>setTimeout(resolve,100));assert.equal(f.committed,0);assert.deepEqual(f.errors,[]);assert.equal(f.receiver.status().retainedBytes,0);}finally{f.receiver.dispose();f.preparer.dispose();}});
