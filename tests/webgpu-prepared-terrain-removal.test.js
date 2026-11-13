import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {createChunkPublicationCoordinator} from '../src/rendering/webgpu-chunk-publication.js';
import {createWebGpuTerrainResidency} from '../src/rendering/webgpu-terrain-residency.js';
import {createWebGpuBiomeProps} from '../src/rendering/webgpu-biome-props.js';
import {prepareWebGpuTemporalTerrain} from '../src/rendering/webgpu-temporal-terrain.js';
import {createConfirmedTerrainReceiver} from '../src/rendering/confirmed-terrain-receiver.js';
import {createGrassSurfaceTimeline} from '../src/rendering/webgpu-grass-timeline.js';
import {createVisibleCameraTerrain} from '../src/rendering/visible-camera-terrain.js';
import {createConfirmedCameraTerrain,CameraTerrainUnavailable} from '../src/app/confirmed-camera-terrain.js';

const wasm=new WebAssembly.Module(await readFile(new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url))),
 pack=JSON.parse(await readFile(new URL('../public/content/biome-savanna.json',import.meta.url),'utf8'));
const removal=(sequence=2,revision=2)=>({payload:{authority:'spatial-wasm',cx:0,cz:0,removed:true,capturedAt:sequence},sequence,revision,epoch:'e'});
async function fixture({derivedViews=false}={}){
 const native=createSpatialWorld(wasm);native.generate(712,0,0,'savanna');const payload=native.chunkPayload();
 // Native terrain buffers plus one authored tree instance exercise both real
 // graphical owners. Pipeline tickets are simulated; these are not GPU tests.
 payload.instances=Array.from({length:20},()=>[]);payload.instances[0].push({id:'tree',slot:0,x:0,y:0,z:0,yaw:0,sx:1,sy:1,sz:1});
 const scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial(),contacts=[],trees=[],revisions=[],errors=[],prepared=[],discarded=[];
 let valid=true,order=0,grass=null,camera=null,cameraView=null,suspended=true;const grassKeys=new Set(),cameraMessages=[],grassRemovals=[],grassOwner={suspend(){suspended=true;},resume(){suspended=false;},syncChunk:key=>grassKeys.add(key),removeChunk(key){grassRemovals.push(key);grassKeys.delete(key);},occupancyChanged:()=>false};
 const admission={prepare(){},async prepareManyAndPublish(){throw Error('unexpected unprepared publication');},async prepareTicket(){return {valid:()=>valid,validAfterAttach:()=>valid};},deferRelease(_object,release){release();}},
  coordinator=createChunkPublicationCoordinator({admission,onError:error=>errors.push(error)}),
  terrain=createWebGpuTerrainResidency({scene,material,waterMaterial:material,pipelineAdmission:admission,coordinator,onRevision:r=>{revisions.push(r);if(r.cause==='confirmed')grass?.confirmedRemoval(r);},onPublished:(key,id)=>{grass?.published(key,id);camera?.published(key);},onAdmissionError:e=>errors.push(e)}),
  biome=createWebGpuBiomeProps({scene,state:{biome:'sabana',suppressed:[]},biomePack:pack,initialSlots:[0],pipelineAdmission:admission,coordinator,
   byteLoader:async url=>{const bytes=await readFile(new URL('../public'+url,import.meta.url));return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);},imageLoader:async()=>({close(){}}),
   onGroundContactChange:e=>{contacts.push(e);grass?.biome(e);},onCameraTreeChunk:e=>trees.push(e),onError:e=>errors.push(e)}),
  options={scene,residency:terrain,biome,coordinator,publicationEpoch:epoch=>'visual:'+epoch,publicationOrder:()=>++order,validateInstances(p){assert(Array.isArray(p.instances));},suppressed:[],
   onPreparedIdentity:(p,id)=>{prepared.push({p,id});grass?.prepared(p,id);},onDiscardIdentity:(p,id)=>{discarded.push({p,id});grass?.discarded(p,id);}};
 if(derivedViews){grass=createGrassSurfaceTimeline({owner:grassOwner,residency:terrain,onError:e=>errors.push(e)});cameraView=createConfirmedCameraTerrain();camera=createVisibleCameraTerrain({residency:terrain,send:p=>{cameraMessages.push(p);cameraView.ingest(p);}});}
 const prepare=(messages,extra={})=>prepareWebGpuTemporalTerrain(messages,{...options,...extra});
 try{assert.equal((await prepare([{payload,sequence:1,revision:1,epoch:'e'}])).commit(),true);if(derivedViews){grass.applied(payload,1,{epoch:'e',sequence:1,publicationOrder:1});grass.confirmed(1,new Set());camera.stage(payload,1,{epoch:'e',sequence:1});camera.published('0,0');cameraView.confirm(1);}}catch(error){grass?.dispose();camera?.dispose();cameraView?.dispose();biome.dispose();terrain.dispose();coordinator.dispose();material.dispose();throw error;}
 const initialMesh=terrain.getVisible(0,0),initialChildren=[...scene.children];let disposed=0;initialMesh.geometry.addEventListener('dispose',()=>disposed++);
 return {scene,terrain,biome,coordinator,payload,contacts,trees,revisions,prepared,discarded,errors,initialMesh,initialChildren,prepare,options,grass,camera,cameraView,cameraMessages,grassKeys,grassRemovals,
  get grassSuspended(){return suspended;},
  get disposed(){return disposed;},invalidateTickets(){valid=false;},
  payloadFor(cx,cz){native.addChunk(cx,cz);const value=native.chunkPayload();value.instances=Array.from({length:20},()=>[]);return value;},
  assertOriginal(){assert.equal(terrain.getVisible(0,0),initialMesh);assert.equal(terrain.get(0,0),initialMesh);assert.deepEqual(terrain.revisionAt(0,0),{cx:0,cz:0,epoch:'e',revision:1});assert.deepEqual(scene.children,initialChildren);assert.equal(biome.status().chunks,1);assert.equal(disposed,0);},
  dispose(){grass?.dispose();camera?.dispose();cameraView?.dispose();biome.dispose();terrain.dispose();coordinator.dispose();material.dispose();}};
}

test('prepared retirement keeps real terrain and biome visible until the entire batch commits',async()=>{
 const f=await fixture();try{
  const input=removal(),batch=await f.prepare([input]);f.assertOriginal();assert.equal(f.prepared.length,1,'removal must not enter terrain-geometry observers');
  assert.equal(batch.identityFor(input.payload),null);assert.equal(batch.commit(),true);assert.equal(f.terrain.size,0);assert.equal(f.terrain.getVisible(0,0),null);assert.equal(f.biome.status().chunks,0);assert.equal(f.scene.children.length,0);assert.equal(f.disposed,1);
  assert.equal(batch.identityFor(input.payload).removed,true);assert.equal(batch.identityFor(input.payload).publicationOrder,2);
  assert.deepEqual(f.revisions.at(-1),{cx:0,cz:0,revision:2,epoch:'e',kind:'remove',cause:'confirmed',sequence:2,publicationOrder:2});assert.deepEqual(f.contacts.at(-1),{kind:'remove',cx:0,cz:0,sequence:2,epoch:'e',revision:2,publicationOrder:2});assert(f.trees.at(-1).slots.every(slot=>!slot.instances.length));
  assert.equal(f.terrain.replace(f.payload,1,'e'),false);f.biome.replace(f.payload,1,{sequence:1,epoch:'e'});assert.equal(f.biome.status().chunks,0);
  assert.equal((await f.prepare([{payload:f.payload,sequence:3,revision:3,epoch:'e'}])).commit(),true);assert.equal(f.terrain.revisionAt(0,0).revision,3);assert.equal(f.biome.status().chunks,1);assert.notEqual(f.terrain.getVisible(0,0),f.initialMesh);assert.deepEqual(f.errors,[]);
 }finally{f.dispose();}
});

test('cancelling a prepared retirement retains both owners and releases the common reservation',async()=>{
 const f=await fixture();try{
  const controller=new AbortController(),batch=await f.prepare([removal()],{signal:controller.signal});controller.abort();f.assertOriginal();assert.equal(batch.abort(),false);assert.deepEqual(f.discarded,[]);
  assert.equal((await f.prepare([removal()])).commit(),true);assert.equal(f.scene.children.length,0);assert.deepEqual(f.errors,[]);
 }finally{f.dispose();}
});

for(const stage of ['activate','finalize'])test(`failure in biome ${stage} rolls back the earlier terrain retirement and every index`,async()=>{
 const f=await fixture();try{
  const biome=Object.create(f.biome);biome.prepareRemoval=(...args)=>{const token=f.biome.prepareRemoval(...args);return {...token,participant(){const part=token.participant();return {...part,[stage](){if(stage==='finalize')part.finalize();throw Error('injected '+stage);}};}};};
  const batch=await f.prepare([removal()],{biome});assert.throws(()=>batch.commit(),new RegExp('injected '+stage));f.assertOriginal();assert.equal(f.contacts.length,1);assert.equal(f.revisions.length,1);assert.deepEqual(f.errors,[]);
  assert.equal((await f.prepare([removal()])).commit(),true);assert.equal(f.scene.children.length,0);assert.equal(f.biome.status().chunks,0);
 }finally{f.dispose();}
});

test('retirement rejects synchronous observers before logical or graphical changes',async()=>{
 const f=await fixture();try{
  const listener=()=>{throw Error('must not observe partial retirement');};f.initialMesh.parent.addEventListener('removed',listener);
  const batch=await f.prepare([removal()]);assert.throws(()=>batch.commit(),/synchronous removed observer/);f.assertOriginal();f.initialMesh.parent.removeEventListener('removed',listener);assert.deepEqual(f.errors,[]);
 }finally{f.dispose();}
});

test('expired pipeline tickets and changed removal identity cannot publish a retirement',async()=>{
 const f=await fixture();try{
  const input=removal(),batch=await f.prepare([input]);input.payload.cx=1;assert.throws(()=>batch.commit(),/stale/);f.assertOriginal();
  const timed=removal(),changedTime=await f.prepare([timed]);timed.payload.capturedAt=1;assert.throws(()=>changedTime.commit(),/stale/);f.assertOriginal();
  const next=await f.prepare([removal()]);f.invalidateTickets();assert.throws(()=>next.commit(),/stale/);f.assertOriginal();assert.deepEqual(f.errors,[]);
 }finally{f.dispose();}
});

test('one admitted boundary can retire one chunk and add another without publishing a prefix',async()=>{
 const f=await fixture();try{
  const payload=f.payloadFor(1,0),batch=await f.prepare([removal(),{payload,sequence:2,revision:1,epoch:'e'}]);
  f.assertOriginal();assert.equal(f.terrain.getVisible(1,0),null);assert.equal(batch.commit(),true);
  assert.equal(f.terrain.getVisible(0,0),null);assert.equal(f.terrain.revisionAt(1,0).revision,1);assert.equal(f.terrain.size,1);assert.equal(f.biome.status().chunks,1);assert.equal(f.scene.children.length,2);assert.deepEqual(f.errors,[]);
 }finally{f.dispose();}
});

test('a failure finalizing a mixed boundary restores the removed chunk and drops all replacements',async()=>{
 const f=await fixture();try{
  const payload=f.payloadFor(1,0),biome=Object.create(f.biome);biome.prepareRevision=(...args)=>{const token=f.biome.prepareRevision(...args);return {...token,participant(){const part=token.participant();return {...part,finalize(){part.finalize();throw Error('mixed rollback');}};}};};
  const batch=await f.prepare([removal(),{payload,sequence:2,revision:1,epoch:'e'}],{biome});assert.throws(()=>batch.commit(),/mixed rollback/);
  f.assertOriginal();assert.equal(f.terrain.getVisible(1,0),null);assert.equal(f.terrain.size,1);assert.equal(f.revisions.length,1);assert.equal(f.contacts.length,1);assert.deepEqual(f.errors,[]);
 }finally{f.dispose();}
});

test('a superseding immediate removal cancels pending preparation without resurrecting the earlier generation',async()=>{
 const f=await fixture();try{
  const batch=await f.prepare([removal()]);assert.equal(f.terrain.remove(0,0,3),true);assert.equal(f.biome.remove(0,0,3,{epoch:'e',sequence:3}),true);
  assert.throws(()=>batch.commit(),/stale|no longer active/);assert.equal(f.scene.children.length,0);assert.equal(f.terrain.size,0);assert.equal(f.biome.status().chunks,0);assert.deepEqual(f.errors,[]);
 }finally{f.dispose();}
});

test('the history receiver commits the real paired retirement before notifying its confirmed boundary',async()=>{
 const f=await fixture(),port={postMessage(){},start(){},close(){}},notifications=[],input=removal(),receiver=createConfirmedTerrainReceiver({port,session:'s',confirmedSequence:1,confirmedElapsed:1,
  retainRevisions:true,allowReplay:true,residency:f.terrain,validateRevision:(...args)=>f.terrain.validateRevision(...args),prepareGraphicalBatch:(messages,{signal})=>f.prepare(messages,{signal}),
  onRemoved:(payload,revision,metadata)=>{assert.equal(f.terrain.size,0);assert.equal(f.biome.status().chunks,0);notifications.push({payload,revision,metadata});},onError:e=>f.errors.push(e)});
 try{
  receiver.beginReplay({sequence:1,epoch:'e'});receiver.stageReplayBoundary(2,[{chunks:[input.payload],terrainManifest:{epoch:'e',chunks:[{cx:0,cz:0,revision:2,removed:true}]}}]);
  await receiver.waitForReplayBoundary(2);f.assertOriginal();assert.deepEqual(notifications,[]);receiver.confirm(2,2);
  assert.equal(notifications.length,1);assert.equal(notifications[0].metadata.publicationOrder,2);assert.equal(receiver.status().confirmedSequence,2);assert.equal(f.scene.children.length,0);assert.deepEqual(f.errors,[]);
 }finally{receiver.dispose();f.dispose();}
});

test('committed terrain retirement updates camera and grass at the same boundary, then admits a later readmission',async()=>{
 const f=await fixture({derivedViews:true}),port={postMessage(){},start(){},close(){}},input=removal(),receiver=createConfirmedTerrainReceiver({port,session:'s',confirmedSequence:1,confirmedElapsed:1,
  retainRevisions:true,allowReplay:true,residency:f.terrain,validateRevision:(...args)=>f.terrain.validateRevision(...args),prepareGraphicalBatch:(messages,{signal})=>f.prepare(messages,{signal}),
  onRemoved:(p,r,m)=>f.camera.removed(p,r,m),onError:e=>f.errors.push(e)});
 try{
  const initialHeight=f.cameraView.surface(0,0);assert(Number.isFinite(initialHeight));assert.equal(f.grassSuspended,false);assert(f.grassKeys.has('0,0'));
  receiver.beginReplay({sequence:1,epoch:'e'});receiver.stageReplayBoundary(2,[{chunks:[input.payload],terrainManifest:{epoch:'e',chunks:[{cx:0,cz:0,revision:2,removed:true}]}}]);await receiver.waitForReplayBoundary(2);
  assert.equal(f.cameraView.surface(0,0),initialHeight);assert.equal(f.grassSuspended,false);assert.equal(f.cameraMessages.length,1);
  receiver.confirm(2,2);assert.equal(f.scene.children.length,0);assert.throws(()=>f.cameraView.surface(0,0),CameraTerrainUnavailable);assert.equal(f.cameraMessages[1].removed,true);
  assert.equal(f.grassSuspended,true);assert(!f.grassKeys.has('0,0'));assert.deepEqual(f.grassRemovals,['0,0']);assert.equal(f.grass.status().fault,null);
  f.cameraView.confirm(2);f.grass.confirmed(2,new Set());assert.equal(f.grassSuspended,false);
  const data={payload:f.payload,sequence:3,revision:3,epoch:'e'},batch=await f.prepare([data]);assert.equal(batch.commit(),true);
  f.grass.applied(data.payload,3,{epoch:'e',sequence:3,publicationOrder:3});f.camera.stage(data.payload,3,{epoch:'e',sequence:3});f.camera.published('0,0');
  assert.equal(f.grassSuspended,true);f.grass.confirmed(3,new Set());f.cameraView.confirm(3);assert.equal(f.cameraView.surface(0,0),initialHeight);assert(f.grassKeys.has('0,0'));assert.equal(f.grassSuspended,false);assert.deepEqual(f.errors,[]);
 }finally{receiver.dispose();f.dispose();}
});

test('removal-only preparation never loads instance slots or generates replacement terrain and mud',async()=>{
 const calls=[],token={participant(){return {};},abort(){}},batch={commit(){},abort(){}},input=removal();
 assert.equal(await prepareWebGpuTemporalTerrain([input],{scene:new THREE.Scene(),suppressed:[],validateInstances(){throw Error('must not validate replacement');},publicationEpoch:e=>e,publicationOrder:()=>1,
  mudPreparer:{prepare(){throw Error('must not rebuild mud');}},residency:{prepareRevision(){throw Error('must not prepare terrain');},prepareRemoval(){calls.push('terrain');return token;}},
  biome:{ready:Promise.resolve(true),requestSlots(){throw Error('must not load slots');},prepareRevision(){throw Error('must not prepare instances');},prepareRemoval(){calls.push('biome');return token;}},coordinator:{async prepareBatch(){return batch;}}}),batch);
 assert.deepEqual(calls,['terrain','biome']);
});
