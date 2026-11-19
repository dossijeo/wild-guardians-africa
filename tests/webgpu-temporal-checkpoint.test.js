import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {MeshBasicMaterial,Scene} from 'three';
import {deserialize} from '../src/persistence/snapshots.js';
import {serializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import {createChunkPublicationCoordinator} from '../src/rendering/webgpu-chunk-publication.js';
import {createWebGpuTerrainResidency} from '../src/rendering/webgpu-terrain-residency.js';
import {createWebGpuBiomeProps} from '../src/rendering/webgpu-biome-props.js';
import {prepareWebGpuTemporalCheckpoint} from '../src/rendering/webgpu-temporal-terrain.js';

test('fresh versioned checkpoint installs real terrain and biome together and rolls back a failed participant',async()=>{
 const originalFetch=globalThis.fetch,buffer=new ArrayBuffer(104);new Float32Array(buffer,0,9).set([0,0,0,1,0,0,0,1,0]);new Float32Array(buffer,36,9).set([0,0,1,0,0,1,0,0,1]);new Float32Array(buffer,72,6).set([0,0,1,0,0,1]);new Uint16Array(buffer,96,3).set([0,1,2]);const asset={lods:[{position:{type:'<f4',offset:0,count:9},normal:{type:'<f4',offset:36,count:9},uv:{type:'<f4',offset:72,count:6},index:{type:'<u2',offset:96,count:3}}]},manifest={binary:{url:'/props'},textures:['baseColor','normal','metallicRoughness'].map(role=>({role,base64:{url:'/'+role}})),assets:Array.from({length:20},()=>asset),material:{baseColorFactor:[1,1,1,1]}};globalThis.fetch=async()=>({ok:true,json:async()=>manifest,arrayBuffer:async()=>buffer});
 const state=deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString());state.biome='sabana';state.suppressed=['tree0'];const scene=new Scene(),material=new MeshBasicMaterial(),errors=[],ticketOptions=[],admission={prepare(){},prepareManyAndPublish(){},async prepareTicket(_object,options){ticketOptions.push(options);return {valid:()=>true};},deferRelease(_object,release){release();}},coordinator=createChunkPublicationCoordinator({admission,onError:e=>errors.push(e.message)}),terrain=createWebGpuTerrainResidency({scene,material,pipelineAdmission:admission,coordinator}),biome=createWebGpuBiomeProps({scene,state,initialSlots:[0],imageLoader:async()=>({close(){}}),pipelineAdmission:admission,coordinator});
 const chunk=cx=>{const instances=Array.from({length:20},()=>[]);instances[0].push({id:'tree'+cx,slot:0,x:cx*48,y:0,z:0,yaw:0,sx:1,sy:1,sz:1});return {authority:'spatial-wasm',cx,cz:0,instances,terrain:{positions:new Float32Array(49*49*3),colors:new Float32Array(49*49*3),indices:new Uint16Array(48*48*6)}};};const chunks=[chunk(0),chunk(1)],message={session:'s',sequence:10,elapsed:state.elapsed,snapshot:serializeConfirmedState(state),terrainCheckpoint:{sequence:10,chunks,terrainManifest:{epoch:'e',chunks:[{cx:0,cz:0,revision:5},{cx:1,cz:0,revision:6}]}}};let order=0;
 const options={session:'s',scene,residency:terrain,biome,coordinator,publicationEpoch:epoch=>epoch,publicationOrder:()=>++order,validateInstances:payload=>{if(payload.instances.length!==20)throw TypeError('Invalid instances');}};
 try{assert.equal(await biome.ready,true);const badManifest={...message,terrainCheckpoint:{...message.terrainCheckpoint,terrainManifest:{epoch:'e',chunks:[{cx:0,cz:0,revision:5},{cx:0,cz:0,revision:6}]}}};await assert.rejects(prepareWebGpuTemporalCheckpoint(badManifest,options),/manifest/);const invalid=structuredClone(message);invalid.terrainCheckpoint.chunks[1].terrain.indices[0]=3000;await assert.rejects(prepareWebGpuTemporalCheckpoint(invalid,options),/chunk/);const cancelled=await prepareWebGpuTemporalCheckpoint(message,options);assert.equal(cancelled.abort(),true);assert.equal(cancelled.abort(),false);assert.equal(scene.children.length,0);assert.equal(terrain.size,0);assert.equal(biome.status().chunks,0);
  const stale=await prepareWebGpuTemporalCheckpoint(message,options);state.suppressed=[];assert.throws(()=>stale.commit(),/stale|cancel/i);state.suppressed=['tree0'];assert.equal(terrain.size,0);assert.equal(biome.status().chunks,0);assert.equal(scene.children.length,0);
  const faulty={prepareBatch(parts,settings){const last=parts.at(-1),finalize=last.finalize;last.finalize=()=>{finalize();throw Error('checkpoint failed');};return coordinator.prepareBatch(parts,settings);}},rejected=await prepareWebGpuTemporalCheckpoint(message,{...options,coordinator:faulty});assert.equal(scene.children.length,0);assert.throws(()=>rejected.commit(),/checkpoint failed/);assert.equal(terrain.size,0);assert.equal(biome.status().chunks,0);assert.equal(scene.children.length,0);
  const prepared=await prepareWebGpuTemporalCheckpoint(message,options);assert.equal(terrain.size,0);assert.equal(biome.status().chunks,0);assert.deepEqual(prepared.suppressed,['tree0']);assert.equal(prepared.commit(),true);assert.equal(scene.children.length,4);for(const [index,payload] of chunks.entries()){const metadata={epoch:'e',revision:index?6:5};assert.equal(terrain.matchesCheckpoint(payload,metadata),true);assert.equal(biome.matchesCheckpoint(payload,metadata),true);}const first=scene.children.flatMap(group=>group.children).find(mesh=>mesh.userData.spatialChunk==='0,0');assert.equal(first.count,0);await assert.rejects(prepareWebGpuTemporalCheckpoint(message,options),/fresh graphical owners/);assert.deepEqual(errors,[]);assert.ok(ticketOptions.length>0&&ticketOptions.every(options=>options.requireShadowTarget===true));
 }finally{biome.dispose();terrain.dispose();coordinator.dispose();material.dispose();globalThis.fetch=originalFetch;}
});

// Real Three terrain/biome owners and atomic chunk coordinator; GPU admission
// and pack/image IO are deterministic doubles. This is resource preparation,
// not native-world/clock admission or a complete retained recovery claim.
async function retainedCheckpointFixture(){
 const originalFetch=globalThis.fetch,buffer=new ArrayBuffer(104);new Float32Array(buffer,0,9).set([0,0,0,1,0,0,0,1,0]);new Float32Array(buffer,36,9).set([0,0,1,0,0,1,0,0,1]);new Float32Array(buffer,72,6).set([0,0,1,0,0,1]);new Uint16Array(buffer,96,3).set([0,1,2]);
 const asset={lods:[{position:{type:'<f4',offset:0,count:9},normal:{type:'<f4',offset:36,count:9},uv:{type:'<f4',offset:72,count:6},index:{type:'<u2',offset:96,count:3}}]},pack={binary:{url:'/props'},textures:['baseColor','normal','metallicRoughness'].map(role=>({role,base64:{url:'/'+role}})),assets:Array.from({length:20},()=>asset),material:{baseColorFactor:[1,1,1,1]}};
 globalThis.fetch=async()=>({ok:true,json:async()=>pack,arrayBuffer:async()=>buffer});
 const state=deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString());state.biome='sabana';state.suppressed=['tree0'];
 const f={tickets:[],onTicket:null,errors:[],state},scene=new Scene(),material=new MeshBasicMaterial(),admission={prepare(){},prepareManyAndPublish(){},async prepareTicket(object,options){f.tickets.push({object,options});await f.onTicket?.(object);return {valid:()=>true,validAfterAttach:()=>true};},deferRelease(_object,release){release();}},coordinator=createChunkPublicationCoordinator({admission,onError:e=>f.errors.push(e.message)}),terrain=createWebGpuTerrainResidency({scene,material,pipelineAdmission:admission,coordinator}),biome=createWebGpuBiomeProps({scene,state,initialSlots:[0],imageLoader:async()=>({close(){}}),pipelineAdmission:admission,coordinator});let order=0;
 const chunk=cx=>{const instances=Array.from({length:20},()=>[]);instances[0].push({id:'tree'+cx,slot:0,x:cx*48,y:0,z:0,yaw:0,sx:1,sy:1,sz:1});return {authority:'spatial-wasm',cx,cz:0,instances,terrain:{positions:new Float32Array(49*49*3),colors:new Float32Array(49*49*3),indices:new Uint16Array(48*48*6)}};};
 const options={session:'s',scene,residency:terrain,biome,coordinator,publicationEpoch:epoch=>epoch,publicationOrder:()=>++order,validateInstances:payload=>{if(payload.instances.length!==20)throw TypeError('Invalid instances');}},message=(chunks,revisions=chunks.map((_,i)=>i+5))=>({session:'s',sequence:10,elapsed:state.elapsed,snapshot:serializeConfirmedState(state),terrainCheckpoint:{sequence:10,chunks,terrainManifest:{epoch:'e',chunks:chunks.map(({cx,cz},i)=>({cx,cz,revision:revisions[i]}))}}});
 Object.assign(f,{scene,terrain,biome,coordinator,chunk,message,options,retained(message,extra={}){return {...options,retainCurrent:true,assertCurrent(){if(serializeConfirmedState(state)!==message.snapshot)throw Error('Retained state boundary changed');},...extra};},async populate(chunks){await biome.ready;const initial=message(chunks),prepared=await prepareWebGpuTemporalCheckpoint(initial,options);assert.equal(prepared.commit(),true);return initial;},close(){biome.dispose();terrain.dispose();coordinator.dispose();material.dispose();globalThis.fetch=originalFetch;}});return f;
}

test('retained complete checkpoint keeps identical terrain, props, arrays and revisions without new resource admission',async()=>{
 const f=await retainedCheckpointFixture();try{
  const original=await f.populate([f.chunk(0),f.chunk(1)]),message=structuredClone(original),mesh=f.terrain.get(0,0),children=f.scene.children.slice(),geometry=mesh.geometry,position=geometry.attributes.position.array,tickets=f.tickets.length;
  const prepared=await prepareWebGpuTemporalCheckpoint(message,f.retained(message));assert.equal(f.tickets.length,tickets);assert.deepEqual(f.scene.children,children);assert.equal(prepared.retained,true);assert.deepEqual(prepared.removals,[]);assert.equal(prepared.commit(),true);
  assert.equal(f.terrain.get(0,0),mesh);assert.equal(mesh.geometry,geometry);assert.equal(geometry.attributes.position.array,position);assert.deepEqual(f.scene.children,children);assert.deepEqual(f.terrain.revisionAt(0,0),{cx:0,cz:0,epoch:'e',revision:5});assert.deepEqual(f.errors,[]);
  await assert.rejects(prepareWebGpuTemporalCheckpoint(message,f.options),/fresh graphical owners/);
 }finally{f.close();}
});

test('retained complete checkpoint stages additions, changed chunks and proven removals together while keeping identical owners',async()=>{
 const f=await retainedCheckpointFixture();try{
  const initial=await f.populate([f.chunk(0),f.chunk(1),f.chunk(2)]),same=f.terrain.get(0,0),changed=f.terrain.get(1,0),oldChildren=f.scene.children.slice(),chunks=[structuredClone(initial.terrainCheckpoint.chunks[0]),f.chunk(1),f.chunk(3)];chunks[1].terrain.colors[0]=.7;
  const message=f.message(chunks,[5,7,1]);message.terrainCheckpoint.terrainHandoff={epoch:'e',lastSequence:10,chunks:[{cx:0,cz:0,revision:5},{cx:1,cz:0,revision:7},{cx:3,cz:0,revision:1},{cx:2,cz:0,revision:8,removed:true,capturedAt:message.elapsed}]};
  const prepared=await prepareWebGpuTemporalCheckpoint(message,f.retained(message));assert.deepEqual(f.scene.children,oldChildren);assert.equal(f.terrain.get(1,0),changed);assert.equal(f.terrain.get(3,0),null);assert.equal(prepared.removals.length,1);assert.equal(prepared.removals[0].revision,8);assert.equal(prepared.commit(),true);
  assert.equal(f.terrain.get(0,0),same);assert.notEqual(f.terrain.get(1,0),changed);assert.equal(f.terrain.get(2,0),null);assert(f.terrain.get(3,0));assert.equal(f.terrain.size,3);assert.equal(f.biome.status().chunks,3);assert.deepEqual(f.errors,[]);
 }finally{f.close();}
});

test('checkpoint absence cannot invent a removal revision without its exact source handoff',async()=>{
 const f=await retainedCheckpointFixture();try{
  const initial=await f.populate([f.chunk(0),f.chunk(1)]),children=f.scene.children.slice(),tickets=f.tickets.length,message=f.message([structuredClone(initial.terrainCheckpoint.chunks[0])],[5]);
  await assert.rejects(prepareWebGpuTemporalCheckpoint(message,f.retained(message)),/handoff|retirement proof/i);assert.deepEqual(f.scene.children,children);assert.equal(f.tickets.length,tickets);assert.equal(f.terrain.size,2);
 }finally{f.close();}
});

test('retained checkpoint rejects foreign, stale, incomplete and future retirement handoffs before touching live owners',async()=>{
 const f=await retainedCheckpointFixture();try{
  const initial=await f.populate([f.chunk(0),f.chunk(1)]),children=f.scene.children.slice(),message=f.message([structuredClone(initial.terrainCheckpoint.chunks[0])],[5]),proof={epoch:'e',lastSequence:10,chunks:[{cx:0,cz:0,revision:5},{cx:1,cz:0,revision:7,removed:true,capturedAt:message.elapsed}]};
  for(const change of [p=>p.epoch='foreign',p=>p.lastSequence=9,p=>p.chunks[0].revision=4,p=>p.chunks[1].capturedAt=message.elapsed+1,p=>p.chunks[1].revision=6,p=>p.chunks.pop()]){
   const altered=structuredClone(proof);change(altered);message.terrainCheckpoint.terrainHandoff=altered;await assert.rejects(prepareWebGpuTemporalCheckpoint(message,f.retained(message)),/handoff|retirement|revision|stale/i);assert.deepEqual(f.scene.children,children);assert.equal(f.terrain.size,2);
  }
 }finally{f.close();}
});

test('same-revision payload corruption and absent state read sets cannot become a retained checkpoint',async()=>{
 const f=await retainedCheckpointFixture();try{
  const initial=await f.populate([f.chunk(0)]),mesh=f.terrain.get(0,0),message=structuredClone(initial);message.terrainCheckpoint.chunks[0].terrain.colors[0]=.5;
  await assert.rejects(prepareWebGpuTemporalCheckpoint(message,f.retained(message)),/revision|checkpoint.*conflict|stale/i);assert.equal(f.terrain.get(0,0),mesh);
  await assert.rejects(prepareWebGpuTemporalCheckpoint(initial,{...f.options,retainCurrent:true}),/read set|assertCurrent|retained checkpoint/i);
  await assert.rejects(prepareWebGpuTemporalCheckpoint(initial,{...f.retained(initial),retainCurrent:'yes'}),TypeError);
 }finally{f.close();}
});

test('retained checkpoint revalidates unchanged owner identity after an asynchronous admission',async()=>{
 const f=await retainedCheckpointFixture();let unblock;try{
  const initial=await f.populate([f.chunk(0)]),same=f.terrain.get(0,0),message=f.message([structuredClone(initial.terrainCheckpoint.chunks[0]),f.chunk(1)],[5,1]);f.onTicket=()=>new Promise(resolve=>{unblock=resolve;});
  const pending=prepareWebGpuTemporalCheckpoint(message,f.retained(message));pending.catch(()=>{});for(let i=0;i<100&&!unblock;i++)await new Promise(setImmediate);assert(unblock);same.position.y=2;f.onTicket=null;unblock();unblock=null;
  await assert.rejects(pending,/stale|read set|changed/i);assert.equal(f.terrain.get(0,0),same);assert.equal(f.terrain.get(1,0),null);assert.equal(f.terrain.size,1);
 }finally{unblock?.();f.close();}
});

test('retained checkpoint rejects state changes before commit without replacing unchanged roots',async()=>{
 const f=await retainedCheckpointFixture();try{
  const initial=await f.populate([f.chunk(0)]),same=f.terrain.get(0,0),message=f.message([structuredClone(initial.terrainCheckpoint.chunks[0]),f.chunk(1)],[5,1]),prepared=await prepareWebGpuTemporalCheckpoint(message,f.retained(message));f.state.suppressed=[];
  assert.throws(()=>prepared.commit(),/state boundary changed|stale/i);assert.equal(f.terrain.get(0,0),same);assert.equal(f.terrain.get(1,0),null);assert.equal(prepared.nativeWorldBoundary,null);assert.equal(prepared.abort(),false);
 }finally{f.close();}
});

test('a failed retained participant rolls back changed resources and leaves identical roots alone',async()=>{
 const f=await retainedCheckpointFixture();try{
  const initial=await f.populate([f.chunk(0),f.chunk(1)]),same=f.terrain.get(0,0),old=f.terrain.get(1,0),message=f.message([structuredClone(initial.terrainCheckpoint.chunks[0]),f.chunk(1)],[5,7]);message.terrainCheckpoint.chunks[1].terrain.colors[0]=.8;
  const coordinator={prepareBatch(parts,options){const last=parts.at(-1),finalize=last.finalize;last.finalize=()=>{finalize();throw Error('Retained participant failure');};return f.coordinator.prepareBatch(parts,options);}},prepared=await prepareWebGpuTemporalCheckpoint(message,f.retained(message,{coordinator}));
  assert.throws(()=>prepared.commit(),/Retained participant failure/);assert.equal(f.terrain.get(0,0),same);assert.equal(f.terrain.get(1,0),old);assert.equal(prepared.nativeWorldBoundary,null);
 }finally{f.close();}
});

test('retained checkpoint detects attribute and instance-buffer generation changes without relying on content differences',async()=>{
 const f=await retainedCheckpointFixture();try{
  const initial=await f.populate([f.chunk(1)]),message=structuredClone(initial),mesh=f.terrain.get(1,0),prepared=await prepareWebGpuTemporalCheckpoint(message,f.retained(message));mesh.geometry.attributes.position.needsUpdate=true;
  assert.throws(()=>prepared.commit(),/stale|read set|changed/i);assert.equal(f.terrain.get(1,0),mesh);
  const again=await prepareWebGpuTemporalCheckpoint(message,f.retained(message)),prop=f.scene.children.flatMap(group=>group.children).find(node=>node.isInstancedMesh);assert(prop);prop.instanceMatrix.needsUpdate=true;
  assert.throws(()=>again.commit(),/stale|read set|changed/i);assert.equal(f.terrain.get(1,0),mesh);
 }finally{f.close();}
});

test('retained resource certificates use an owned native boundary and reject altered checkpoint metadata',async()=>{
 const f=await retainedCheckpointFixture();try{
  f.state.suppressed=[];const initial=await f.populate([f.chunk(0)]),message=structuredClone(initial);message.terrainCheckpoint.nativeWorldBoundary={version:1,authorityEpoch:'resource-test/1',nativeSession:1,ticket:2,effectiveTime:0};
  const prepared=await prepareWebGpuTemporalCheckpoint(message,f.retained(message));assert.equal(prepared.nativeWorldBoundary,null);message.terrainCheckpoint.terrainManifest.chunks[0].revision=6;
  assert.throws(()=>prepared.commit(),/stale|read set|changed/i);assert.equal(prepared.nativeWorldBoundary,null);message.terrainCheckpoint.terrainManifest.chunks[0].revision=5;
  const next=await prepareWebGpuTemporalCheckpoint(message,f.retained(message));assert.equal(next.commit(),true);const boundary=next.nativeWorldBoundary;assert.equal(boundary.ticket,2);assert(Object.isFrozen(boundary));message.terrainCheckpoint.nativeWorldBoundary.ticket=99;assert.equal(boundary.ticket,2);
 }finally{f.close();}
});
