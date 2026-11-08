import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialIntentBridge} from '../../src/world/wild-engine/spatial-intent-bridge.js';

// Extends the existing concurrent Worker harness. This checks control transport
// and real GPU uniforms, not character-model parity or full-route game safety.
export async function auditNativeRouteControl(){
 const response=await fetch('/tests/fixtures/desierto983-d15-partial-state.json.gz');
 const bytes=new Uint8Array(await response.arrayBuffer()),
  source=bytes[0]===31&&bytes[1]===139?
   await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():
   new TextDecoder().decode(bytes),
  state=deserialize(source),module=await WebAssembly.compileStreaming(fetch('/src/world/wild-engine/spatial-savanna.wasm'));
 state.workers=[];state.plants=[];state.tasks=[];state.crates=[];state.spells=[];state.elapsed=10;
 const loaded=new Map(),session=createSpatialGameSession(module,state,{
  loaded:()=>loaded,onData:chunk=>loaded.set(`${chunk.cx},${chunk.cz}`,chunk)});
 const canvas=document.createElement('canvas');canvas.width=canvas.height=96;document.body.append(canvas);
 const control=new MessageChannel(),resources=new MessageChannel(),
  worker=new Worker(new URL('./native-route-control-preparation-worker.js',import.meta.url),{type:'module'}),
  drawWorker=new Worker(new URL('../../src/rendering/webgpu-draw-worker.js',import.meta.url),{type:'module'});
 const waits=new Map(),messages=new Map();let failure=null,timer;
 const expect=kind=>messages.has(kind)?Promise.resolve(messages.get(kind)):
  new Promise((resolve,reject)=>waits.set(kind,{resolve,reject}));
 const received=(kind,value)=>{messages.set(kind,value);waits.get(kind)?.resolve(value);waits.delete(kind);};
 worker.onmessage=({data})=>{
  if(data.kind==='failure'){failure=Error(data.message);for(const item of waits.values())item.reject(failure);waits.clear();}
  else received(data.kind,data);
 };
 worker.onerror=event=>{failure=Error(event.message);for(const item of waits.values())item.reject(failure);waits.clear();};
 control.port1.onmessage=({data})=>received(`control-${data.sequence}`,{
  ...data,receivedAt:performance.timeOrigin+performance.now()});
 const run=async()=>{
  for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){
   if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
   loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  let actor,crop;
  for(let z=-10;z<=10&&!crop;z++)for(let x=-10;x<=10&&!crop;x++){
   const start={x:x+.2,z:z+.2},end={x:x+12.2,z:z+.2};
   if(session.routeActor(start,end,{worker:false,species:'warthog'}).status==='found'){
    actor={id:'animal-900002',species:'warthog',radius:1.1,status:'walking',hitsRemaining:2,...start};
    crop={id:'plant-900001',species:'mijo',alive:true,...end};
   }
  }
  if(!crop)throw Error('No native AttackCrops fixture route');
  state.plants=[crop];state.raid={animals:[actor],reservations:{}};
  const bridge=createSpatialIntentBridge(session);bridge.resetFromState(state);
  const plan=bridge.planAttackCrop(state,actor);
  if(plan.status!=='found')throw Error('Native AttackCrops failed');
  const other=bridge.planRetreatRoute({id:'animal-900003',species:'warthog',
   x:35.2,z:35.2,exit:{x:39.2,z:35.2}});
  if(other.status!=='found')throw Error('Disjoint native route failed');
  const events=bridge.intentChanges(),offscreen=canvas.transferControlToOffscreen();
  // Match product ownership: preparation and draw are sibling Workers owned by
  // the Window, so the draw Worker has the document's animation-frame provider.
  drawWorker.postMessage({type:'init',canvas:offscreen,port:resources.port2,
   intentControl:{port:control.port2,authorityEpoch:bridge.authorityEpoch}},
   [offscreen,resources.port2,control.port2]);
  worker.postMessage({kind:'initialize',port:resources.port1},[resources.port1]);
  for(const event of events)control.port1.postMessage(event);
  await Promise.all([expect('device-ready'),expect(`control-${events.at(-1).sequence}`)]);
  worker.postMessage({kind:'start',routes:events.filter(event=>event.type==='RouteAssigned')
   .map(event=>({actorId:event.actorId,routeHandle:event.routeHandle,assignmentSequence:event.sequence}))});
  const drawing=await expect('drawing');
  worker.postMessage({kind:'block'});const start=await expect('block-start');
  // Authority remains runnable while the real preparation Worker is blocked.
  state.elapsed=10+(performance.timeOrigin+performance.now()-drawing.anchor)/1000+.15;
  bridge.cancelAttackIntent(actor.id);
  const revocation=bridge.intentChanges().find(event=>event.type==='RouteInvalidated');
  if(!revocation)throw Error('Native cancellation omitted revocation');
  control.port1.postMessage(revocation);
  const applied=await expect(`control-${revocation.sequence}`),end=await expect('block-end');
  worker.postMessage({kind:'inspect'});const report=await expect('inspection');
  if(failure)throw failure;
  if(report.execution.consumer.backend!=='webgpu'||report.execution.consumer.gpuErrors)
   throw Error('Expected actual WebGPU without validation errors');
  if(applied.receivedAt>=end.end)throw Error('Revocation waited for the blocked preparer');
  if(Math.abs(report.values[0]-revocation.effectiveTime)>0.00001)
   throw Error('GPU did not retain the revoked route time');
  if(report.values[1]<=report.values[0]+.1)throw Error('Unrelated GPU route did not continue');
  const frames=report.execution.consumer.samples.filter(frame=>frame.at>=start.start&&frame.at<=end.end);
  if(frames.length<2)throw Error('Draw Worker did not continue during preparation stall');
  return {backend:'webgpu',adapter:report.execution.consumer.adapterInfo,
   blockedMs:end.end-start.start,controlAppliedDuringBlock:true,drawFramesDuringBlock:frames.length,
   maxIntervalMs:Math.max(...frames.map(frame=>frame.intervalMs??0)),
   gpuRouteTimes:report.values.slice(0,2),revokedAt:revocation.effectiveTime,
   packets:report.execution.consumer.packets,replayFrames:report.execution.consumer.replayFrames,
   nativeControl:report.execution.consumer.intentControl,
   scope:'Real WASM AttackCrops events, preparation/draw Workers and GPU uniform readback; triangle only, no character animation or authoritative simulation advance. Not acceptance A–F.'};
 };
 try{
  return await Promise.race([run(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Native route control audit timed out')),30000);})]);
 }finally{
  clearTimeout(timer);worker.postMessage({kind:'dispose'});worker.terminate();drawWorker.terminate();control.port1.close();
  session.dispose();canvas.remove();
 }
}
