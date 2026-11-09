import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialIntentBridge} from '../../src/world/wild-engine/spatial-intent-bridge.js';
import {createSpatialGateIntents} from '../../src/world/wild-engine/spatial-gate-intents.js';
import {createNativeIntentControlPublication} from '../../src/simulation/native-intent-control-publication.js';

export async function auditNativeGateMultiwaits(){
 const bytes=new Uint8Array(await(await fetch('/tests/fixtures/desierto983-d15-partial-state.json.gz')).arrayBuffer()),
  source=bytes[0]===31&&bytes[1]===139?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(bytes),
  state=deserialize(source),template=structuredClone(state.workers[0]),module=await WebAssembly.compileStreaming(fetch('/src/world/wild-engine/spatial-savanna.wasm'));
 state.workers=[];state.plants=[];state.tasks=[];state.crates=[];state.spells=[];state.raid=null;state.elapsed=10;
 const loaded=new Map(),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:chunk=>loaded.set(`${chunk.cx},${chunk.cz}`,chunk)}),
  resources=new MessageChannel(),control=new MessageChannel(),transportSession='native-gate-holds-'+crypto.randomUUID(),
  preparer=new Worker(new URL('./native-gate-holds-preparation-worker.js',import.meta.url),{type:'module'}),
  draw=new Worker(new URL('../../src/rendering/webgpu-draw-worker.js',import.meta.url),{type:'module'}),
  canvas=document.createElement('canvas');canvas.width=canvas.height=96;document.body.append(canvas);
 let publication,timer,failure;const messages=new Map(),waiters=new Map();
 const expect=key=>messages.has(key)?Promise.resolve(messages.get(key)):new Promise((resolve,reject)=>waiters.set(key,{resolve,reject}));
 preparer.onmessage=({data})=>{
  if(data.kind==='failure'){failure=Error(data.message);for(const waiter of waiters.values())waiter.reject(failure);waiters.clear();return;}
  const key=data.id===undefined?data.kind:`${data.kind}-${data.id}`;messages.set(key,data);waiters.get(key)?.resolve(data);waiters.delete(key);
 };
 preparer.onerror=event=>{failure=Error(event.message);for(const waiter of waiters.values())waiter.reject(failure);waiters.clear();};
 const run=async()=>{
  for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
  session.actorSectorRevision({worker:false,species:'warthog'});const w=session.core.wasm;let center;
  for(let z=-12;z<=12&&!center;z+=2)for(let x=-12;x<=12&&!center;x+=2){const cx=x+.2,cz=z+.2,
   clear=(ax,az,bx,bz)=>w.spatial_execution_segment_clear(ax,az,bx,bz,1.1)===1;
   if(clear(cx-6,cz,cx+6,cz)&&clear(cx,cz-6,cx,cz+6)&&clear(cx-6,cz+6,cx+6,cz+6)&&clear(cx-6,cz-3.3,cx+6,cz-3.3))center={x:cx,z:cz};}
  if(!center)throw Error('Native hold audit requires continuously clear fixture corridors');
  const point=(x,z)=>({x:center.x+x,z:center.z+z}),origin=point(0,-3),other=point(0,3.3);
  state.workers=[origin,other].map((p,i)=>({...structuredClone(template),id:`worker-${900011+i}`,...p,status:'returning',taskId:null,radius:.28,recovering:false,incapacitated:false}));
  const bridge=createSpatialIntentBridge(session);bridge.resetFromState(state);
  const home=(id,a,b)=>{session.actorSectorRevision({worker:true});const ptr=w.nav_intent_attack_route_input_ptr(1);
   new Float32Array(w.memory.buffer,ptr,2).set([b.x,b.z]);if(w.nav_intent_restore_home(id,a.x,a.z,b.x,b.z,1)!==1)throw Error('Native home route fixture failed');
   return bridge.intentChanges().find(event=>event.actorId===id&&event.routeHandle)?.routeHandle;};
  const first=home(900011,origin,point(0,6)),free=bridge.prepareNativeRouteMotion(first,{radius:.28,urgent:true,runRemaining:.05});
  if(free.status!=='prepared')throw Error('Native motion preparation failed');bridge.intentChanges();home(900012,other,point(0,-6));
  if(w.spatial_body_upsert(1,origin.x,origin.z,.28,0,1)!==1||w.spatial_body_upsert(2,other.x,other.z,.28,0,1)!==1)throw Error('Native body fixture failed');
  const gates=createSpatialGateIntents(session,state),base={gate:true,status:'intact',material:'zarzas'};
  if(!gates.register({...base,id:'structure-990001',...point(0,0),gateOpen:.75})||
     !gates.register({...base,id:'structure-990002',...point(0,.3),gateOpen:0})||
     !gates.bindWorker('worker-900011',1)||!gates.bindWorker('worker-900012',2)||gates.prepareMotion().status!=='prepared')throw Error('Native gate clock fixture failed');
  const prepared=bridge.prepareNativeRouteMotion(free.routeHandle,{radius:.28,urgent:true,runRemaining:.05,waitForGates:true});
  if(prepared.status!=='prepared'||prepared.motionPlan.holds.length!==2)throw Error('Native timetable did not contain both holds');
  const plan=prepared.motionPlan,knots=Array.from(bridge.nativeRouteTimeKnots(prepared.routeHandle)),rows=knots.flatMap(at=>{
   const p=bridge.sampleNativeRoute(prepared.routeHandle,at);return [at,p.x,p.z,p.phase,p.runPhase,p.walkPhase,p.carryPhase,p.runRemaining];});
  bridge.intentChanges();const counters=()=>({rangeSegments:w.nav_gate_wait_segments(),prefixSegments:w.nav_gate_prefix_segments(),
   sensors:w.nav_gate_worker_checks(),sweeps:w.nav_gate_sweep_evaluations(),clearance:w.spatial_execution_clearance_checks(),queries:w.nav_intent_route_queries(),sequence:w.nav_intent_transition_sequence()}),before=counters();
  const offscreen=canvas.transferControlToOffscreen();draw.postMessage({type:'init',canvas:offscreen,port:resources.port2,intentControl:{port:control.port2,session:transportSession}},[offscreen,resources.port2,control.port2]);
  preparer.postMessage({kind:'initialize',port:resources.port1},[resources.port1]);
  publication=createNativeIntentControlPublication({port:control.port1,session:transportSession,observe:bridge.observeNativeIntentControl});
  await Promise.all([publication.ready,expect('device-ready')]);
  preparer.postMessage({kind:'start',startTime:plan.startTime,endTime:plan.endTime,rows,
   route:{actorId:plan.actorId,routeHandle:prepared.routeHandle,assignmentSequence:plan.assignmentSequence}});const drawing=await expect('drawing'),blocks=[],samples=[];let inspection=null;
  for(let id=1;id<=2;id++){
   preparer.postMessage({kind:'block',id});const start=await expect(`block-start-${id}`),end=await expect(`block-end-${id}`);
   preparer.postMessage({kind:'inspect',id});const report=await expect(`inspection-${id}`),gpu=report.values,
    expected=bridge.sampleNativeRoute(prepared.routeHandle,gpu[0]),cpu=[expected.x,expected.z,expected.phase,expected.runPhase,expected.walkPhase,expected.carryPhase,expected.runRemaining],
    maxError=Math.max(...cpu.map((value,i)=>Math.abs(value-gpu[i+1]))),consumer=report.execution.consumer,
    frames=consumer.samples.filter(frame=>frame.at>=start.start&&frame.at<=end.end);
   if(!gpu.every(Number.isFinite)||!cpu.every(Number.isFinite)||!Number.isFinite(maxError)||maxError>2e-5||
      consumer.gpuErrors||consumer.packets!==1||consumer.computePackets!==0||consumer.uniformForks||consumer.stagedOperations||frames.length<2)
    throw Error('Native GPU hold replay diverged: '+JSON.stringify({gpu,cpu,maxError,consumer}));
   const lateHold=plan.holds[1],inside=gpu[0]>=lateHold.from&&gpu[0]<lateHold.until;
   if(id===1&&!inside||id===2&&inside)throw Error('GPU diagnostic clock did not cover held and resumed samples');
   inspection=consumer;samples.push({gpu,cpu,maxError,insideIntermediateHold:inside});blocks.push({start:start.start,end:end.end,blockedMs:end.end-start.start,drawFrames:frames.length,maxIntervalMs:Math.max(...frames.map(frame=>frame.intervalMs??0))});
  }
  if(samples[1].gpu[2]<=samples[0].gpu[2]||JSON.stringify(before)!==JSON.stringify(counters())||failure)throw Error('Native replay did not resume independently or repeated authority work');
  return {backend:'webgpu',adapter:inspection.adapterInfo,drawStats:{packets:inspection.packets,computePackets:inspection.computePackets,nativeFrames:inspection.nativeFrames,
   replayFrames:inspection.replayFrames,gpuErrors:inspection.gpuErrors,uniformForks:inspection.uniformForks,stagedOperations:inspection.stagedOperations},
   holds:plan.holds,knots,blocks,samples,anchor:drawing.anchor,countersBefore:before,countersAfter:counters(),
   authorizedPassage:plan.authorizedPassage,authorizedAutonomy:plan.authorizedAutonomy,
   scope:'Diagnostic native worker timetable replay from one prepared native knot table, with separate immutable render/readback resources; real WASM/WebGPU, two 500 ms preparation stalls, held/resumed position and phase/budget readback. Triangle only; no character meshes, native execution, future gate lease, physical crossing or causal clock acceptance.'};
 };
 try{return await Promise.race([run(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Native gate hold audit timed out')),30000);})]);}
 finally{clearTimeout(timer);publication?.dispose();preparer.terminate();draw.terminate();control.port1.close();session.dispose();canvas.remove();}
}
