import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialIntentBridge} from '../../src/world/wild-engine/spatial-intent-bridge.js';
import {createSpatialGateIntents} from '../../src/world/wild-engine/spatial-gate-intents.js';
import {createNativeIntentControlPublication} from '../../src/simulation/native-intent-control-publication.js';
import {createWorkerHostedRuntime} from '../../src/simulation/worker-hosted-runtime.js';
import {createConfirmedStateReceiver} from '../../src/simulation/confirmed-state-receiver.js';
import {createWebGpuWorldClient} from '../../src/rendering/webgpu-world-client.js';

async function fixtureText(name){
 const response=await fetch('/tests/fixtures/'+name),bytes=new Uint8Array(await response.arrayBuffer());
 return bytes[0]===31&&bytes[1]===139?
  new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():
  new TextDecoder().decode(bytes);
}

export async function auditNativeRuntimeControl(){
 const snapshot=await fixtureText('sabana712-d1-native-active-raid.json.gz'),state=deserialize(snapshot),
  session='native-runtime-'+crypto.randomUUID(),control=new MessageChannel(),diagnostic=new MessageChannel(),errors=[],
  canvas=document.createElement('canvas');canvas.width=canvas.height=64;document.body.append(canvas);
 let preparer,resolveBlockStart,resolveBlockEnd;
 const blockStart=new Promise(resolve=>{resolveBlockStart=resolve;}),
  blockEnd=new Promise(resolve=>{resolveBlockEnd=resolve;});
 diagnostic.port1.onmessage=({data})=>{
  if(data.kind==='block-start')resolveBlockStart(data);
  else if(data.kind==='block-end')resolveBlockEnd(data);
 };
 const actor=state.raid.animals[0],target=state.plants.find(item=>item.id===actor.targetId),
  report=error=>errors.push(String(error?.message??error)),client=createWebGpuWorldClient({
   canvas,session,snapshot,width:64,height:64,remoteDraw:true,intentControlPort:control.port2,
   workerFactory:()=>{preparer=new Worker(new URL('./fixtures/webgpu-preparation-stall-worker.js',import.meta.url),{type:'module'});
    preparer.postMessage({kind:'configure-control-fault',port:diagnostic.port2},[diagnostic.port2]);return preparer;},
   experimentalMinimalWorld:true,quality:'muy_baja',
   camera:{x:actor.x+8,y:20,z:actor.z+12,targetX:actor.x,targetY:0,targetZ:actor.z},onError:report});
 let runtime;
 try{
  await client.ready;
  runtime=createWorkerHostedRuntime({world:{createConfirmedReceiver:id=>createConfirmedStateReceiver(state,id)},
   session,clientOptions:{snapshot,chunkKeys:['1,-1','2,-1','3,-1','1,0','2,0','3,0','1,1','2,1','3,1']},
   terrainPort:client.terrainPort,presentationPort:client.presentationPort,
   runtimeOptions:{startupSuspended:true,stepSeconds:.05,maxBatchSteps:2,coalescePublications:true},onError:report});
  await runtime.start();
  const attached=await runtime.attachNativeIntentControl(control.port1),
   before=(await client.inspect()).drawExecution?.consumer?.intentControl;
  if(!before||before.active<1||before.authorityEpoch!==attached.authorityEpoch)
   throw Error('Real saved raid did not bootstrap an active native permission');
  await client.waitForFirstFrame();
  preparer.postMessage({kind:'block-control-preparation'});const blocked=await blockStart;
  const shield=await runtime.submit({kind:'castShield',id:'native-control-fixture-shield',x:target.x,z:target.z});
  if(shield.value!==true)throw Error('Legal shield fixture failed: '+shield.rejection);
  await runtime.activateClock();
  const resumed=await blockEnd;
  await runtime.submit({kind:'pause',reason:'native-control-fixture'});
  const inspection=await client.inspect(),after=inspection.drawExecution?.consumer?.intentControl;
  if(!after||after.closed||after.sequence<=before.sequence||after.revoked<1)
   throw Error('Real raid did not deliver a live native revocation: '+JSON.stringify({before,after,errors}));
  const draw=inspection.drawExecution.consumer,
   frames=draw.samples.filter(frame=>frame.at>=blocked.start&&frame.at<=resumed.end);
  if(!Number.isFinite(draw.nativeIntentControlAppliedAt)||draw.nativeIntentControlAppliedAt<blocked.start||
     draw.nativeIntentControlAppliedAt>resumed.end||frames.filter(frame=>frame.replay).length<2)
   throw Error('Product control/draw waited for the stalled preparation Worker');
  if(errors.length)throw Error(errors.join('; '));
  return {backend:inspection.backend,adapter:inspection.drawExecution.consumer.adapterInfo,
   attached,before,after,blockedMs:resumed.end-blocked.start,drawFramesDuringBlock:frames.length,
   replayFramesDuringBlock:frames.filter(frame=>frame.replay).length,
   maxIntervalMs:Math.max(...frames.map(frame=>frame.intervalMs??0)),
   controlAppliedAt:draw.nativeIntentControlAppliedAt,blockStartedAt:blocked.start,blockEndedAt:resumed.end,
   confirmedSequence:runtime.status().confirmedSequence,
   confirmedElapsed:runtime.status().confirmedElapsed,errors,
   scope:'Real saved warthog raid, legal Shield, authority Worker, hosted runtime and product preparation/draw Workers; real 500 ms preparation stall and WebGPU draws. No character meshes or native autonomous locomotion; validates direct control bootstrap/live events, not full acceptance A-F.'};
 }finally{runtime?.dispose();client.dispose();control.port1.close();diagnostic.port1.close();canvas.remove();}
}

// Extends the existing concurrent Worker harness. This checks control transport
// and real GPU uniforms, not character-model parity or full-route game safety.
export async function auditNativeRouteControl({gpuFence=false,gateTransaction=false,invalidateGateProposal=false,
 gateStaticObjects=false,invalidateGateObjectProposal=false}={}){
 const source=await fixtureText('desierto983-d15-partial-state.json.gz'),
  state=deserialize(source),module=await WebAssembly.compileStreaming(fetch('/src/world/wild-engine/spatial-savanna.wasm'));
 state.workers=[];state.plants=[];state.tasks=[];state.crates=[];state.spells=[];state.elapsed=10;
 const loaded=new Map(),session=createSpatialGameSession(module,state,{
  loaded:()=>loaded,onData:chunk=>loaded.set(`${chunk.cx},${chunk.cz}`,chunk)});
 const canvas=document.createElement('canvas');canvas.width=canvas.height=96;document.body.append(canvas);
 const control=new MessageChannel(),resources=new MessageChannel(),
  worker=new Worker(new URL('./native-route-control-preparation-worker.js',import.meta.url),{type:'module'}),
  drawWorker=new Worker(new URL('../../src/rendering/webgpu-draw-worker.js',import.meta.url),{type:'module'});
  const waits=new Map(),messages=new Map();let failure=null,timer,publication=null;
 const expect=kind=>messages.has(kind)?Promise.resolve(messages.get(kind)):
  new Promise((resolve,reject)=>waits.set(kind,{resolve,reject}));
 const received=(kind,value)=>{messages.set(kind,value);waits.get(kind)?.resolve(value);waits.delete(kind);};
 worker.onmessage=({data})=>{
  if(data.kind==='failure'){failure=Error(data.message);for(const item of waits.values())item.reject(failure);waits.clear();}
  else received(data.kind,data);
 };
 worker.onerror=event=>{failure=Error(event.message);for(const item of waits.values())item.reject(failure);waits.clear();};
  control.port1.addEventListener('message',({data})=>received(data.type==='intent-control-fenced'?`gpu-fence-${data.fenceId}`:`control-${data.sequence}`,{
   ...data,receivedAt:performance.timeOrigin+performance.now()}));control.port1.start();
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
   const transportSession='native-gate-transaction-'+crypto.randomUUID(),gates=gateTransaction?createSpatialGateIntents(session,state):null,
    gate={id:'structure-990001',gate:true,material:'zarzas',status:'intact',x:actor.x+20,z:actor.z,gateOpen:1};
   if(gates&&!gates.register(gate))throw Error('Could not register native gate proposal fixture');
   if(gates&&session.core.wasm.spatial_body_upsert(990077,gate.x+.3,gate.z-.9,.02,1,1)!==1)
    throw Error('Could not register the native sweep body');
   if(gateStaticObjects&&session.core.addOrientedBarrier(gate.x+.4,gate.z-.7,.005,.005,.73,0)<=0)
    throw Error('Could not register the native static sweep object');
  // Match product ownership: preparation and draw are sibling Workers owned by
  // the Window, so the draw Worker has the document's animation-frame provider.
   drawWorker.postMessage({type:'init',canvas:offscreen,port:resources.port2,
    intentControl:gateTransaction?{port:control.port2,session:transportSession}:{port:control.port2,authorityEpoch:bridge.authorityEpoch}},
   [offscreen,resources.port2,control.port2]);
  worker.postMessage({kind:'initialize',port:resources.port1},[resources.port1]);
   if(gateTransaction){publication=createNativeIntentControlPublication({port:control.port1,session:transportSession,observe:bridge.observeNativeIntentControl});await publication.ready;}
   else for(const event of events)control.port1.postMessage(event);
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
   if(!gateTransaction)control.port1.postMessage(revocation);
   let transaction=null;
   if(gateTransaction){
    const before=gates.read(gate.id),pending=bridge.prepareNativeGateMotionAfterGpuFence({getPublication:()=>publication,staticObjects:gateStaticObjects}),
     staged=gates.read(gate.id),checks=[session.core.wasm.nav_gate_worker_checks(),session.core.wasm.nav_gate_sweep_evaluations(),session.core.wasm.nav_intent_route_queries(),
      ...(gateStaticObjects?[session.core.wasm.nav_gate_static_evaluations(),session.core.wasm.nav_gate_static_pairs()]:[])];
    if(session.core.wasm.nav_gate_motion_ticket()!==1)throw Error('Native gate staging rejected: '+JSON.stringify(await pending));
    if(JSON.stringify(before)!==JSON.stringify(staged)||checks[1]<1)
     throw Error('Staging must sweep a real native body without making the motor effective');
    if(invalidateGateProposal&&session.core.wasm.spatial_body_upsert(990077,gate.x+.3,gate.z+.9,.02,1,1)!==1)
     throw Error('The pending proposal must not block the authoritative body change');
    if(invalidateGateObjectProposal&&session.core.addWall(gate.x+.3,gate.z+.9,.005,.005)<=0)
     throw Error('A staged certificate must not block the authoritative object change');
    const interrupted=invalidateGateProposal||invalidateGateObjectProposal,result=await pending,after=gates.read(gate.id),
     committedChecks=[session.core.wasm.nav_gate_worker_checks(),session.core.wasm.nav_gate_sweep_evaluations(),session.core.wasm.nav_intent_route_queries(),
      ...(gateStaticObjects?[session.core.wasm.nav_gate_static_evaluations(),session.core.wasm.nav_gate_static_pairs()]:[])];
    if(result.status!==(interrupted?'stale':'committed')||after.target!==(interrupted?1:0)||
       session.core.wasm.nav_gate_motion_ticket()!==0||JSON.stringify(checks)!==JSON.stringify(committedChecks))
     throw Error('Native gate proposal was not committed atomically after GPU drain');
    if(gateStaticObjects&&(checks[3]<1||gates.staticObjectsCertified(gate.id)===interrupted))
     throw Error('Expected an actual static object proof installed only on native commit');
    let collidingObjectVetoed=null;
    if(gateStaticObjects&&!interrupted){collidingObjectVetoed=session.core.addWall(gate.x+.3,gate.z+.9,.005,.005)===0;
     if(!collidingObjectVetoed)throw Error('Committed object certificate did not protect the remaining swing');}
    transaction={result,before,staged,after,checks,committedChecks,bodyChangedWhilePending:invalidateGateProposal,
     ...(gateStaticObjects?{objectChangedWhilePending:invalidateGateObjectProposal,staticObjectsCertified:gates.staticObjectsCertified(gate.id),collidingObjectVetoed}: {})};
   }
   if(gpuFence&&!gateTransaction)control.port1.postMessage({type:'IntentControlFence',protocolVersion:2,fenceVersion:1,
    authorityEpoch:bridge.authorityEpoch,sequence:revocation.sequence,effectiveTime:revocation.effectiveTime,fenceId:1});
   const fenced=gpuFence||gateTransaction?await expect('gpu-fence-1'):null;
   const applied=await expect(`control-${revocation.sequence}`),end=await expect('block-end');
  worker.postMessage({kind:'inspect'});const report=await expect('inspection');
  if(failure)throw failure;
  if(report.execution.consumer.backend!=='webgpu'||report.execution.consumer.gpuErrors)
   throw Error('Expected actual WebGPU without validation errors');
   if(applied.receivedAt>=end.end)throw Error('Revocation waited for the blocked preparer');
   if(fenced&&(fenced.accepted!==true||fenced.sequence!==revocation.sequence||fenced.effectiveTime!==revocation.effectiveTime||fenced.receivedAt>=end.end))
    throw Error('GPU drain receipt did not confirm the exact boundary during preparation stall');
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
    ...(fenced?{gpuFence:fenced,gpuFencedAt:report.execution.consumer.nativeIntentGpuFencedAt}:{}),
    ...(transaction?{gateTransaction:transaction}:{}),
    scope:gateStaticObjects?'Real WASM canonical static object sweep, pending gate motor, direct GPU receipt, conditional commit/rejection and live obstacle veto during preparation stall. Triangle/readback only; no leaf mesh/collider installation, frame-joint or terrain clearance, character locomotion or crossing admission. Not closure of A6-04.e/f or acceptance A-F.':
     gateTransaction?'Real WASM pending gate motor, live publication, GPU drain and conditional native commit/rejection during preparation stall. Triangle/readback only; no physical gate collider or resources, character animation or causal simulation/draw clock. Not closure of A6-04.e/f or acceptance A-F.':
     'Real WASM AttackCrops events, preparation/draw Workers and GPU uniform readback; triangle only, no character animation or authoritative simulation advance. Not acceptance A–F.'};
 };
 try{
  return await Promise.race([run(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Native route control audit timed out')),30000);})]);
 }finally{
   clearTimeout(timer);publication?.dispose();worker.postMessage({kind:'dispose'});worker.terminate();drawWorker.terminate();control.port1.close();
  session.dispose();canvas.remove();
 }
}
