import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {setTimeout as delay} from 'node:timers/promises';
import {createNativeRouteExecutionFixture} from './helpers/native-route-execution.js';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';
import {createTerrainPublication} from '../src/simulation/terrain-publication.js';
import {createConfirmedTerrainReceiver} from '../src/rendering/confirmed-terrain-receiver.js';
import {reconcileNativeWorldResources} from '../src/world/native-world-boundary.js';

function setup(options={}){
 const f=createNativeRouteExecutionFixture(options);f.worker(1,f.point(-6,0),f.point(6,0));
 f.bridge.beginNativeRouteExecution();f.advance(11);f.bridge.commitNativeCausalClock();
 const {port1,port2}=new MessageChannel(),messages=[];let acknowledge=true,holdStart=0;
 port2.onmessage=({data:m})=>{
  messages.push(m);
  if(m.type==='IntentBaseline')port2.postMessage({type:'intent-control-applied',session:m.session,authorityEpoch:m.authorityEpoch,
   sequence:m.sequence,accepted:true,clockSequence:m.clock.clockSequence,clockIntentSequence:m.clock.intentSequence,clockCommittedThrough:m.clock.committedThrough});
  else if(m.type==='IntentClock')port2.postMessage({type:'intent-clock-applied',session:m.session,authorityEpoch:m.authorityEpoch,
   clockSequence:m.clockSequence,intentSequence:m.intentSequence,committedThrough:m.committedThrough,accepted:true});
  else if(m.type==='IntentMutationQuiesce'&&acknowledge)port2.postMessage({...m,type:'intent-mutation-quiesced',accepted:true});
  else if(['RouteAssigned','RouteInvalidated','IntentChanged','RouteCompleted','RouteReplaced'].includes(m.type))port2.postMessage({
   type:'intent-control-applied',session:m.session,authorityEpoch:m.authorityEpoch,sequence:m.sequence,accepted:true});
 };
 const source=createNativeIntentControlPublication({port:port1,session:'native-resources',observe:f.bridge.observeNativeIntentControl});
 return {...f,source,messages,mutate:mutation=>f.bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>source,mutation}),
  hold(){acknowledge=false;holdStart=messages.length;},release(){const m=messages.slice(holdStart).findLast(m=>m.type==='IntentMutationQuiesce');assert(m);port2.postMessage({...m,type:'intent-mutation-quiesced',accepted:true});},
  async waitHold(){for(let i=0;i<200&&!messages.slice(holdStart).some(m=>m.type==='IntentMutationQuiesce');i++)await delay(1);assert(messages.slice(holdStart).some(m=>m.type==='IntentMutationQuiesce'));},
  dispose(){source.dispose();port2.close();f.session.dispose();}};
}
const key=p=>`${p.cx},${p.cz}`;
function payloads(core){const selected=core.currentChunk(),result=new Map();try{
 for(const k of core.captureResidentChunks().keys){const [cx,cz]=k.split(',').map(Number);assert(core.selectChunk(cx,cz)>=0);result.set(k,core.chunkPayload());}
}finally{if(selected)core.selectChunk(selected.cx,selected.cz);}return result;}
function canonical(core,resources){
 const before=core.captureResidentChunks(),actual=payloads(core);
 for(const chunk of resources.chunks)assert.deepEqual(chunk,actual.get(key(chunk)));
 for(const removed of resources.removed)assert.equal(actual.has(key(removed)),false);
 assert.deepEqual(core.captureResidentChunks(),before);
}

test('a native addition emits only its actual canonical chunk after the GPU receipt and preserves independent data ownership',async()=>{
 const observed=[],f=setup({onNativeWorldResources:r=>observed.push(r)});try{
  await f.source.ready;assert.equal(f.bridge.nativeWorldResourceBoundary(),null);f.hold();const before=f.session.core.captureResidentChunks(),pending=f.mutate({type:'addChunk',cx:4,cz:4});
  await f.waitHold();assert.equal(f.w.spatial_world_resource_snapshot(),0);assert.deepEqual(observed,[]);assert.deepEqual(f.session.core.captureResidentChunks(),before);
  f.release();const result=await pending;assert.equal(result.status,'committed');const r=result.resources;
  assert.equal(r.kind,6);assert.equal(r.ticket,result.worldBoundary.ticket);assert.equal(r.nativeSession,result.worldBoundary.nativeSession);assert.equal(r.effectiveTime,11);assert.deepEqual(f.bridge.nativeWorldResourceBoundary(),result.worldBoundary);assert(Object.isFrozen(f.bridge.nativeWorldResourceBoundary()));
  assert.deepEqual(r.chunks.map(key),['4,4']);assert.deepEqual(r.removed,[]);assert.equal(observed.length,1);assert.deepEqual(observed[0].worldBoundary,result.worldBoundary);canonical(f.session.core,r);
  const height=r.chunks[0].terrain.positions[1];r.chunks[0].terrain.positions[1]+=100;
  assert.equal(f.session.core.chunkPayload().terrain.positions[1],height,'resource buffers must not alias WASM');
 }finally{f.dispose();}
});

test('native eviction emits exact tombstones and never rebuilds an evicted chunk while reading the projection',async()=>{
 const f=setup();try{
  await f.source.ready;assert.equal((await f.mutate({type:'addChunk',cx:4,cz:4})).status,'committed');
  const result=await f.mutate({type:'removeChunks',chunks:[[4,4],[4,4]],releaseOnly:true});assert.equal(result.status,'committed');
  assert.equal(result.resources.kind,7);assert.deepEqual(result.resources.chunks,[]);assert.deepEqual(result.resources.removed,[{cx:4,cz:4}]);
  canonical(f.session.core,result.resources);assert.equal(f.w.spatial_has_chunk(4,4),0);
 }finally{f.dispose();}
});

test('a native removal reaches the existing terrain channel only after its physical commit and state confirmation',async()=>{
 const {port1,port2}=new MessageChannel(),errors=[],accepted=[],removed=[],boundaries=[],
  publication=createTerrainPublication({port:port1,session:'terrain-removal',epoch:'terrain/1'}),
  receiver=createConfirmedTerrainReceiver({port:port2,session:'terrain-removal',confirmedElapsed:11,
   residency:{replace:(payload,revision)=>{accepted.push({payload,revision});return true;},remove:(cx,cz,revision)=>{removed.push({cx,cz,revision});return true;}},
   onRemoved(){},onError:e=>errors.push(e)}),
  f=setup({onData:payload=>publication.stage(payload,11),onRelease:(cx,cz,metadata)=>{
   assert.equal(f.w.spatial_has_chunk(cx,cz),0);boundaries.push(metadata.nativeWorldBoundary);
   assert.equal(publication.stage({authority:'spatial-wasm',cx,cz,removed:true},11),true);
  }});
 try{
  await f.source.ready;assert.equal((await f.mutate({type:'addChunk',cx:4,cz:4})).status,'committed');publication.commit(1);receiver.confirm(1,11);
  for(let i=0;i<100&&!accepted.length;i++)await delay(1);assert.equal(accepted.length,1);
  f.hold();const pending=f.mutate({type:'removeChunks',chunks:[[4,4]],releaseOnly:true});await f.waitHold();assert.deepEqual(boundaries,[]);assert.equal(f.w.spatial_has_chunk(4,4),1);
  f.release();const result=await pending;assert.equal(result.status,'committed');assert.deepEqual(boundaries,[result.worldBoundary]);
  publication.commit(2);await delay(5);assert.deepEqual(removed,[]);receiver.confirm(2,11);
  for(let i=0;i<100&&!removed.length;i++)await delay(1);assert.deepEqual(removed,[{cx:4,cz:4,revision:2}]);assert.deepEqual(errors,[]);
  assert.deepEqual(publication.manifest(),{epoch:'terrain/1',chunks:[]});assert.equal(f.w.spatial_has_chunk(4,4),0);
 }finally{receiver.dispose();publication.dispose();f.dispose();}
});

test('real native commits correlate through canonical terrain transport and the paired graphical owners',async()=>{
 const THREE=await import('three'),{readFile}=await import('node:fs/promises'),
  {createChunkPublicationCoordinator}=await import('../src/rendering/webgpu-chunk-publication.js'),
  {createWebGpuTerrainResidency}=await import('../src/rendering/webgpu-terrain-residency.js'),
  {createWebGpuBiomeProps}=await import('../src/rendering/webgpu-biome-props.js'),
  {prepareWebGpuTemporalTerrain}=await import('../src/rendering/webgpu-temporal-terrain.js');
 const {port1,port2}=new MessageChannel(),errors=[],publication=createTerrainPublication({port:port1,session:'native-paired',epoch:'e',retainRevisions:true}),
  f=setup({onData:p=>publication.stage(p,11),onRelease:(cx,cz)=>publication.stage({authority:'spatial-wasm',cx,cz,removed:true},11)}),
  scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial(),admission={prepare(){},async prepareManyAndPublish(){throw Error('Unprepared publication');},async prepareTicket(){return {valid:()=>true,validAfterAttach:()=>true};},deferRelease(_o,release){release();}},
  coordinator=createChunkPublicationCoordinator({admission,onError:e=>errors.push(e)}),terrain=createWebGpuTerrainResidency({scene,material,waterMaterial:material,pipelineAdmission:admission,coordinator}),
  pack=JSON.parse(await readFile(new URL('../public/content/biome-desert.json',import.meta.url),'utf8')),
  biome=createWebGpuBiomeProps({scene,state:f.state,biomePack:pack,initialSlots:[],pipelineAdmission:admission,coordinator,imageLoader:async()=>({close(){}}),
   byteLoader:async url=>{const value=await readFile(new URL('../public'+url,import.meta.url));return value.buffer.slice(value.byteOffset,value.byteOffset+value.byteLength);},onError:e=>errors.push(e)});
 let order=0;const receiver=createConfirmedTerrainReceiver({port:port2,session:'native-paired',confirmedElapsed:11,retainRevisions:true,residency:terrain,validateRevision:(...args)=>terrain.validateRevision(...args),
  prepareGraphicalBatch:(messages,{signal})=>prepareWebGpuTemporalTerrain(messages,{signal,scene,residency:terrain,biome,coordinator,publicationEpoch:e=>e,publicationOrder:()=>++order,validateInstances(){},suppressed:f.state.suppressed??[]}),onRemoved(){},onError:e=>errors.push(e)});
 try{
  await f.source.ready;let previous=null;
  for(const [sequence,mutation] of [[1,{type:'addChunk',cx:4,cz:4}],[2,{type:'removeChunks',chunks:[[4,4]],releaseOnly:true}]]){
   const result=await f.mutate(mutation);assert.equal(result.status,'committed');assert.equal(publication.commit(sequence),true);
   for(let i=0;i<1000&&!receiver.ready(sequence)&&!receiver.status().closed;i++)await delay(1);assert.deepEqual(errors,[]);assert.equal(receiver.ready(sequence),true);
   const compact={version:1,kind:result.resources.kind,worldBoundary:result.worldBoundary,chunks:result.resources.chunks.map(({cx,cz})=>({cx,cz})),removed:result.resources.removed};
   assert.throws(()=>reconcileNativeWorldResources({publication:{sequence,elapsed:11,nativeWorldResources:[compact]},admitted:receiver.admittedBoundary(sequence),previous}),/lack/);
   receiver.confirm(sequence,11);const boundary=reconcileNativeWorldResources({publication:{sequence,elapsed:11,nativeWorldResources:[compact]},admitted:receiver.admittedBoundary(sequence),previous});assert.deepEqual(boundary,f.bridge.nativeWorldResourceBoundary());
   if(sequence===1){assert.equal(terrain.matchesCheckpoint(result.resources.chunks[0],{epoch:'e',revision:1}),true);assert.equal(biome.matchesCheckpoint(result.resources.chunks[0],{epoch:'e',revision:1}),true);}
   else{assert.equal(terrain.size,0);assert.equal(biome.status().chunks,0);assert.equal(scene.children.length,0);assert(boundary.ticket>previous.ticket);}
   previous=boundary;
  }
  assert.deepEqual(errors,[]);
 }finally{receiver.dispose();publication.dispose();biome.dispose();terrain.dispose();coordinator.dispose();material.dispose();f.dispose();}
});

test('the existing session stream and terrain channel carry canonical post-commit resources with the confirmed sequence',async()=>{
 const {port1,port2}=new MessageChannel(),errors=[],accepted=[],publication=createTerrainPublication({port:port1,session:'terrain-resources',epoch:'terrain/1'}),
  receiver=createConfirmedTerrainReceiver({port:port2,session:'terrain-resources',confirmedElapsed:11,
   residency:{replace:(payload,revision,epoch)=>{accepted.push({payload,revision,epoch});return true;}},onError:e=>errors.push(e)}),
  observed=[],f=setup({onData:payload=>{observed.push(payload);assert.equal(publication.stage(payload,11),true);}});
 try{
  await f.source.ready;assert.deepEqual(observed,[]);const result=await f.mutate({type:'addChunk',cx:4,cz:4});assert.equal(result.status,'committed');
  assert.deepEqual(observed.map(key),['4,4']);assert.equal(observed[0].terrainRevision,1);
  assert.equal(publication.status().staged,1);assert.equal(publication.commit(1),true);await delay(5);assert.deepEqual(accepted,[]);
  receiver.confirm(1,11);for(let i=0;i<100&&!accepted.length;i++)await delay(1);
  assert.equal(accepted.length,1);assert.equal(accepted[0].revision,1);assert.equal(accepted[0].epoch,'terrain/1');
  assert.deepEqual(accepted[0].payload.terrain,result.resources.chunks[0].terrain);assert.deepEqual(accepted[0].payload.instances,result.resources.chunks[0].instances);
  assert.equal(accepted[0].payload.capturedAt,11);assert.deepEqual(errors,[]);
  assert.throws(()=>f.session.publishNativeWorldResources(result.worldBoundary),/stale/);
 }finally{receiver.dispose();publication.dispose();f.dispose();}
});

test('canonical prop suppression and restoration cover every changed visible chunk including native halos',async()=>{
 const f=setup();try{
  await f.source.ready;f.session.core.selectChunk(1,1);const prop=f.session.core.props().find(p=>p.group<=5&&Math.hypot(p.x-f.body(1).x,p.z-f.body(1).z)>20);assert(prop);
  const original=f.session.core.snapshot().removedProps,before=payloads(f.session.core),id=`spatial:${prop.group}:${prop.gx}:${prop.gz}`;
  const removed=await f.mutate({type:'removeProp',group:prop.group,gx:prop.gx,gz:prop.gz});assert.equal(removed.status,'committed');assert.equal(removed.resources.kind,8);canonical(f.session.core,removed.resources);
  const after=payloads(f.session.core),changed=[...before].filter(([k,p])=>JSON.stringify(p.instances)!==JSON.stringify(after.get(k).instances)).map(([k])=>k);
  assert(changed.length>0);for(const k of changed)assert(removed.resources.chunks.some(p=>key(p)===k),'changed visible chunk omitted: '+k);
  assert([...before.values()].some(p=>p.instances.some(slot=>slot.some(item=>item.id===id))));
  assert(![...after.values()].some(p=>p.instances.some(slot=>slot.some(item=>item.id===id))));
  assert(!f.session.queryPropsAt(prop.x,prop.z,20).props.some(item=>item.id===id),'the existing JS prop read view must use the new native payload');
  const restored=await f.mutate({type:'restoreRemovedProps',records:original});assert.equal(restored.status,'committed');assert.equal(restored.resources.kind,9);canonical(f.session.core,restored.resources);
  for(const [k,p] of payloads(f.session.core))assert.deepEqual(p.instances,before.get(k).instances);
  assert(f.session.queryPropsAt(prop.x,prop.z,20).props.some(item=>item.id===id));
 }finally{f.dispose();}
});

test('native terrain commits project their canonical refreshed chunks rather than a JS regeneration',async()=>{
 const f=setup();try{
  await f.source.ready;const before=payloads(f.session.core),result=await f.mutate({type:'settlements',sites:[{x:50,z:50,hx:2,hz:2}]});
  assert.equal(result.status,'committed');assert.equal(result.resources.kind,10);canonical(f.session.core,result.resources);
  assert.deepEqual(result.resources.chunks.map(key).sort(),f.session.core.changedChunks().map(key).sort());
  assert(result.resources.chunks.some(p=>!p.terrain.positions.every((v,i)=>v===before.get(key(p)).terrain.positions[i])));
 }finally{f.dispose();}
});

test('a staging attempt cannot replace the last commit projection and stale or foreign tickets cannot read it as current',async()=>{
 const f=setup();try{
  await f.source.ready;const committed=await f.mutate({type:'addChunk',cx:4,cz:4}),boundary=committed.worldBoundary,core=f.session.core;
  const ptr=f.w.spatial_world_proposal_int_ptr(2);new Int32Array(f.w.memory.buffer,ptr,2).set([5,5]);f.w.spatial_world_proposal_float_ptr(0);
  assert.equal(f.w.spatial_world_proposal_stage(6,0,0,2),1);assert.deepEqual(core.captureNativeWorldResources(boundary).chunks.map(key),['4,4']);
  assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);const t=Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6));f.w.nav_intent_barrier_proposal_cancel(t[0],t[1]);
  assert.deepEqual(f.bridge.nativeWorldResourceBoundary(),boundary);
  const selected=core.captureResidentChunks();for(const change of [{ticket:boundary.ticket+1},{nativeSession:boundary.nativeSession+1},{effectiveTime:12}])assert.throws(()=>core.captureNativeWorldResources({...boundary,...change}),/does not match/);
  assert.deepEqual(core.captureResidentChunks(),selected);assert(core.addChunk(6,6)>=0);assert.throws(()=>core.captureNativeWorldResources(boundary),/stale/);assert.throws(()=>f.bridge.nativeWorldResourceBoundary(),/changed outside/);
 }finally{f.dispose();}
});

test('failed resource publication after a native commit retires the hold instead of claiming an aborted world change',async()=>{
 const f=setup({onNativeWorldResources:()=>{throw Error('resource staging failed');}});try{
  await f.source.ready;const result=await f.mutate({type:'addChunk',cx:4,cz:4});assert.equal(result.status,'committed-control-failed');
  assert.match(result.error,/resource staging failed/);assert.equal(f.w.spatial_has_chunk(4,4),1);assert.equal(f.source.status().closed,true);
  assert(!f.messages.some(m=>m.type==='IntentMutationRelease'));
 }finally{f.dispose();}
});

test('a failure of the existing onData delivery after commit cannot release drawing as an aborted mutation',async()=>{
 const f=setup({onData:()=>{throw Error('terrain transport refused canonical data');}});try{
  await f.source.ready;const result=await f.mutate({type:'addChunk',cx:4,cz:4});assert.equal(result.status,'committed-control-failed');
  assert.match(result.error,/terrain transport refused canonical data/);assert.equal(f.w.spatial_has_chunk(4,4),1);
  assert.equal(f.source.status().closed,true);assert(!f.messages.some(m=>m.type==='IntentMutationRelease'));
 }finally{f.dispose();}
});

test('real pthread publication provides the same native resource journal and payload after its conditioned commit',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),world=await createThreadedSpatialWorld(factory),f=setup({core:world.core});
 try{
  await f.source.ready;const p=f.session.core.preparation,id=p.start(4,4);assert(id>0);
  for(let i=0;i<1000&&p.status()!==3;i++)await delay(4);assert.equal(p.status(),3);assert.equal(f.w.spatial_world_resource_snapshot(),0);
  const result=await f.mutate({type:'publishPreparedChunk',id});assert.equal(result.status,'committed');assert.equal(result.resources.kind,11);
  assert.deepEqual(result.resources.chunks.map(key),['4,4']);canonical(f.session.core,result.resources);
 }finally{f.dispose();await world.dispose();}
});
