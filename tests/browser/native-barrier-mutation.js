import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialIntentBridge} from '../../src/world/wild-engine/spatial-intent-bridge.js';
import {createNativeIntentControlPublication} from '../../src/simulation/native-intent-control-publication.js';

const now=()=>performance.timeOrigin+performance.now();
export async function auditNativeBarrierMutation(){
 const bytes=new Uint8Array(await(await fetch('/tests/fixtures/desierto983-d15-partial-state.json.gz')).arrayBuffer()),
  text=bytes[0]===31&&bytes[1]===139?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(bytes),
  state=deserialize(text),template=structuredClone(state.workers[0]),module=await WebAssembly.compileStreaming(fetch('/src/world/wild-engine/spatial-savanna.wasm'));
 state.workers=[];state.tasks=[];state.plants=[];state.crates=[];state.spells=[];state.raid=null;state.elapsed=10;state.pauses=[];
 const loaded=new Map(),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:c=>loaded.set(`${c.cx},${c.cz}`,c)}),
  resources=new MessageChannel(),control=new MessageChannel(),transportSession='barrier-'+crypto.randomUUID(),
  preparer=new Worker(new URL('./native-gate-holds-preparation-worker.js',import.meta.url),{type:'module'}),
  draw=new Worker(new URL('../../src/rendering/webgpu-draw-worker.js',import.meta.url),{type:'module'}),
  canvas=document.createElement('canvas');canvas.width=canvas.height=96;document.body.append(canvas);
 let publication,timeout,commandTimer;const messages=new Map(),waiters=new Map();
 const expect=key=>messages.has(key)?Promise.resolve(messages.get(key)):new Promise((resolve,reject)=>waiters.set(key,{resolve,reject}));
 preparer.onmessage=({data})=>{
  if(data.kind==='failure'){for(const w of waiters.values())w.reject(Error(data.message));waiters.clear();return;}
  const key=data.id===undefined?data.kind:`${data.kind}-${data.id}`;messages.set(key,data);waiters.get(key)?.resolve(data);waiters.delete(key);
 };
 preparer.onerror=event=>{for(const w of waiters.values())w.reject(Error(event.message));waiters.clear();};
 const run=async()=>{
  for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
  session.core.setSettlement(20,30,20,20);const origin={x:20.05,z:24},end={x:20.05,z:36};
  state.workers=[{...template,id:'worker-900011',...origin,path:[],radius:.28,status:'returning',taskId:null,recovering:false,incapacitated:false}];
  const bridge=createSpatialIntentBridge(session);bridge.resetFromState(state);const w=session.core.wasm;
  session.actorSectorRevision({worker:true});const ptr=w.nav_intent_attack_route_input_ptr(1);new Float32Array(w.memory.buffer,ptr,2).set([end.x,end.z]);
  if(w.nav_intent_restore_home(900011,origin.x,origin.z,end.x,end.z,1)!==1)throw Error('Native route fixture failed');
  const raw=bridge.intentChanges().at(-1).routeHandle,prepared=bridge.prepareNativeRouteMotion(raw,{radius:.28});
  if(prepared.status!=='prepared'||w.spatial_body_upsert(1,origin.x,origin.z,.28,0,1)!==1||bridge.reserveNativeRoute(prepared.routeHandle,1).status!=='reserved'||bridge.beginNativeRouteExecution().status!=='started')
   throw Error('Native route execution fixture failed');
  const handle=prepared.routeHandle,plan=prepared.motionPlan,rows=Array.from(bridge.nativeRouteTimeKnots(handle)).flatMap(at=>{
   const p=bridge.sampleNativeRoute(handle,at);return [at,p.x,p.z,p.phase,p.runPhase,p.walkPhase,p.carryPhase,p.runRemaining];});
  if(bridge.commitNativeCausalClock().status!=='committed')throw Error('Native causal clock fixture failed');bridge.intentChanges();
  const offscreen=canvas.transferControlToOffscreen();draw.postMessage({type:'init',canvas:offscreen,port:resources.port2,intentControl:{port:control.port2,session:transportSession}},[offscreen,resources.port2,control.port2]);
  preparer.postMessage({kind:'initialize',port:resources.port1},[resources.port1]);
  publication=createNativeIntentControlPublication({port:control.port1,session:transportSession,observe:bridge.observeNativeIntentControl});
  await Promise.all([publication.ready,expect('device-ready')]);
  preparer.postMessage({kind:'start',startTime:plan.startTime,endTime:plan.endTime,rows,
   route:{actorId:plan.actorId,routeHandle:handle,assignmentSequence:plan.assignmentSequence}});await expect('drawing');
  preparer.postMessage({kind:'block',id:1});const blockStart=await expect('block-start-1');
  const command=new Promise((resolve,reject)=>{commandTimer=setTimeout(async()=>{try{
   state.elapsed=10.25;if(bridge.advanceNativeRouteExecution(state.elapsed).status!=='advanced'||bridge.commitNativeCausalClock().status!=='committed')throw Error('Native boundary advance failed');
   const beforeSnapshot=JSON.stringify(session.core.snapshot()),beforeCount=w.spatial_barrier_state_count(),sequence=w.nav_intent_transition_sequence(),stagedAt=now(),
    pending=bridge.addNativeBarrierAfterGpuQuiescence({getPublication:()=>publication,x:20.05,z:32,halfX:.15,halfZ:.6,yaw:.2});
   if(w.nav_intent_barrier_proposal_ticket()!==1||JSON.stringify(session.core.snapshot())!==beforeSnapshot||
      w.nav_intent_transition_sequence()!==sequence||!bridge.nativeRouteTiming(handle))throw Error('Barrier proposal was prematurely effective');
   const result=await pending,committedAt=now(),afterCount=w.spatial_barrier_state_count(),changes=bridge.intentChanges();
   if(result.status!=='committed'||afterCount!==beforeCount+1||bridge.nativeRouteTiming(handle)!==null||
      !changes.some(e=>e.type==='RouteInvalidated'&&e.revokedRouteHandle?.generation===handle.generation))
    throw Error('Conditioned barrier did not commit/revoke atomically '+JSON.stringify({result,beforeCount,afterCount,changes}));
   resolve({stagedAt,committedAt,beforeCount,afterCount,sequence,result,changes});
  }catch(error){reject(error);}},180);});
  const [blockEnd,mutation]=await Promise.all([expect('block-end-1'),command]);
  preparer.postMessage({kind:'inspect',id:1});const inspection=await expect('inspection-1'),host=inspection.execution.consumer,
   beforeFrames=host.samples.filter(frame=>frame.at>=blockStart.start&&frame.at<host.nativeMutationQuiescedAt),
   afterFrames=host.samples.filter(frame=>frame.at>=host.nativeMutationReleasedAt&&frame.at<=blockEnd.end);
  if(mutation.committedAt>=blockEnd.end||host.nativeMutationQuiescedAt<mutation.stagedAt||
     host.nativeMutationReleasedAt<host.nativeMutationQuiescedAt||host.nativeMutationEpoch!==1||host.nativeMutationFloor!==10.25||
     beforeFrames.length<2||afterFrames.length!==0||host.failed||host.gpuErrors||host.packets!==1)
    throw Error('Native mutation/draw boundary failed '+JSON.stringify({blockStart,blockEnd,mutation,host}));
  return {checklistId:'A6-04.f-R2',status:'partial',backend:'webgpu',adapter:host.adapterInfo,
   scope:'One oriented native barrier add only, with one causal draw connection and a diagnostic triangle. The old packet freezes after commit; replacement resources and other mutation types remain open.',
   block:{start:blockStart.start,end:blockEnd.end,blockedMs:blockEnd.end-blockStart.start,drawFramesBeforeQuiescence:beforeFrames.length,drawFramesAfterRelease:afterFrames.length},
   mutation:{stagedAt:mutation.stagedAt,committedAt:mutation.committedAt,beforeCount:mutation.beforeCount,afterCount:mutation.afterCount,
    sequence:mutation.sequence,barrierId:mutation.result.barrierId,receipt:mutation.result.receipt,
    changes:mutation.changes.map(e=>({type:e.type,sequence:e.sequence,effectiveTime:e.effectiveTime,actorId:e.actorId}))},
   drawStats:{quiescedAt:host.nativeMutationQuiescedAt,releasedAt:host.nativeMutationReleasedAt,mutationEpoch:host.nativeMutationEpoch,
    floor:host.nativeMutationFloor,packets:host.packets,nativeFrames:host.nativeFrames,replayFrames:host.replayFrames,gpuErrors:host.gpuErrors,failed:host.failed},
   readback:inspection.values,authorizedAutonomy:false,authorizedPassage:false};
 };
 try{return await Promise.race([run(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Native barrier mutation audit timed out')),30000);})]);}
 finally{clearTimeout(timeout);clearTimeout(commandTimer);publication?.dispose();preparer.terminate();draw.terminate();session.dispose();canvas.remove();}
}
