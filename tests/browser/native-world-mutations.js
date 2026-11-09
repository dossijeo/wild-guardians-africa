import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialIntentBridge} from '../../src/world/wild-engine/spatial-intent-bridge.js';
import {createNativeIntentControlPublication} from '../../src/simulation/native-intent-control-publication.js';

const now=()=>performance.timeOrigin+performance.now();
async function runCase(module,text,kind){
 const state=deserialize(text),template=structuredClone(state.workers[0]);
 state.workers=[];state.tasks=[];state.plants=[];state.crates=[];state.spells=[];state.raid=null;state.elapsed=10;state.pauses=[];
 const loaded=new Map(),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:c=>loaded.set(`${c.cx},${c.cz}`,c)}),
  resources=new MessageChannel(),control=new MessageChannel(),transportSession='world-'+crypto.randomUUID(),
  preparer=new Worker(new URL('./native-gate-holds-preparation-worker.js',import.meta.url),{type:'module'}),
  draw=new Worker(new URL('../../src/rendering/webgpu-draw-worker.js',import.meta.url),{type:'module'}),
  canvas=document.createElement('canvas');canvas.width=canvas.height=96;document.body.append(canvas);
 let publication,timer,commandTimer;const messages=new Map(),waiters=new Map();
 const expect=key=>messages.has(key)?Promise.resolve(messages.get(key)):new Promise((resolve,reject)=>waiters.set(key,{resolve,reject}));
 preparer.onmessage=({data})=>{if(data.kind==='failure'){for(const w of waiters.values())w.reject(Error(data.message));waiters.clear();return;}
  const key=data.id===undefined?data.kind:`${data.kind}-${data.id}`;messages.set(key,data);waiters.get(key)?.resolve(data);waiters.delete(key);};
 preparer.onerror=event=>{for(const w of waiters.values())w.reject(Error(event.message));waiters.clear();};
 const run=async()=>{
  for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
  session.core.setSettlement(20,30,20,20);let mutation,expectRevocation=false;
  if(kind==='polygon'){mutation={type:'addPolygon',points:[{x:19.85,z:31.8},{x:20.25,z:31.8},{x:20.25,z:32.2},{x:19.85,z:32.2}]};expectRevocation=true;}
  else if(kind==='residency-add')mutation={type:'addChunk',cx:4,cz:4};
  else if(kind==='residency-remove')mutation={type:'removeChunks',chunks:[[1,1]]};
  else if(kind==='prop-remove'||kind==='prop-restore'){
   session.core.selectChunk(1,1);const p=session.core.props().find(p=>p.group<=5&&Math.hypot(p.x-20,p.z-30)>20);
   if(!p)throw Error('Native prop fixture unavailable');const original=session.core.snapshot().removedProps;
   if(kind==='prop-restore'){
    if(session.core.removeProp({group:p.group,gx:p.gx,gz:p.gz})!==1)throw Error('Native prop suppression fixture failed');
    mutation={type:'restoreRemovedProps',records:original};
   }else mutation={type:'removeProp',group:p.group,gx:p.gx,gz:p.gz};
  }else if(kind==='terrain')mutation={type:'settlements',sites:[{x:1000,z:1000,hx:1,hz:1}]};
  else throw Error('Unknown native world case');
  const origin={x:20.05,z:24},end={x:20.05,z:36};state.workers=[{...template,id:'worker-900011',...origin,path:[],radius:.28,status:'returning',taskId:null,recovering:false,incapacitated:false}];
  const bridge=createSpatialIntentBridge(session);bridge.resetFromState(state);const w=session.core.wasm;
  session.actorSectorRevision({worker:true});const ptr=w.nav_intent_attack_route_input_ptr(1);new Float32Array(w.memory.buffer,ptr,2).set([end.x,end.z]);
  if(w.nav_intent_restore_home(900011,origin.x,origin.z,end.x,end.z,1)!==1)throw Error('Native route fixture failed');
  const raw=bridge.intentChanges().at(-1).routeHandle,prepared=bridge.prepareNativeRouteMotion(raw,{radius:.28});
  if(prepared.status!=='prepared'||w.spatial_body_upsert(1,origin.x,origin.z,.28,0,1)!==1||bridge.reserveNativeRoute(prepared.routeHandle,1).status!=='reserved'||bridge.beginNativeRouteExecution().status!=='started')throw Error('Native execution fixture failed');
  const handle=prepared.routeHandle,plan=prepared.motionPlan,rows=Array.from(bridge.nativeRouteTimeKnots(handle)).flatMap(at=>{
   const p=bridge.sampleNativeRoute(handle,at);return [at,p.x,p.z,p.phase,p.runPhase,p.walkPhase,p.carryPhase,p.runRemaining];});
  if(bridge.commitNativeCausalClock().status!=='committed')throw Error('Native clock fixture failed');bridge.intentChanges();
  const offscreen=canvas.transferControlToOffscreen();draw.postMessage({type:'init',canvas:offscreen,port:resources.port2,intentControl:{port:control.port2,session:transportSession}},[offscreen,resources.port2,control.port2]);
  preparer.postMessage({kind:'initialize',port:resources.port1},[resources.port1]);
  publication=createNativeIntentControlPublication({port:control.port1,session:transportSession,observe:bridge.observeNativeIntentControl});
  await Promise.all([publication.ready,expect('device-ready')]);
  preparer.postMessage({kind:'start',startTime:plan.startTime,endTime:plan.endTime,rows,route:{actorId:plan.actorId,routeHandle:handle,assignmentSequence:plan.assignmentSequence}});await expect('drawing');
  preparer.postMessage({kind:'block',id:1});const start=await expect('block-start-1');
  const action=new Promise((resolve,reject)=>{commandTimer=setTimeout(async()=>{try{
   state.elapsed=10.25;if(bridge.advanceNativeRouteExecution(state.elapsed).status!=='advanced'||bridge.commitNativeCausalClock().status!=='committed')throw Error('Native clock advance failed');
   const snapshot=JSON.stringify(session.core.snapshot()),residency=JSON.stringify(session.core.captureResidentChunks()),sequence=w.nav_intent_transition_sequence(),stagedAt=now(),
    pending=bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>publication,mutation});
   if(w.nav_intent_barrier_proposal_ticket()!==1||JSON.stringify(session.core.snapshot())!==snapshot||
      JSON.stringify(session.core.captureResidentChunks())!==residency||w.nav_intent_transition_sequence()!==sequence||!bridge.nativeRouteTiming(handle))
    throw Error('Proposal changed the live world before the GPU receipt');
   const result=await pending,committedAt=now(),afterSnapshot=JSON.stringify(session.core.snapshot()),afterResidency=JSON.stringify(session.core.captureResidentChunks()),changes=bridge.intentChanges();
   if(result.status!=='committed'||afterSnapshot===snapshot&&afterResidency===residency||
      (bridge.nativeRouteTiming(handle)===null)!==expectRevocation||expectRevocation&&!changes.some(e=>e.type==='RouteInvalidated'))
    throw Error('Unexpected conditioned world commit '+JSON.stringify({kind,result,changes}));
   resolve({stagedAt,committedAt,sequence,result,changes,worldChanged:afterSnapshot!==snapshot,residencyChanged:afterResidency!==residency});
  }catch(error){reject(error);}},180);});
  const [endBlock,mutationResult]=await Promise.all([expect('block-end-1'),action]);preparer.postMessage({kind:'inspect',id:1});
  const report=await expect('inspection-1'),host=report.execution.consumer,
   beforeFrames=host.samples.filter(f=>f.at>=start.start&&f.at<host.nativeMutationQuiescedAt),
   afterFrames=host.samples.filter(f=>f.at>=host.nativeMutationReleasedAt&&f.at<=endBlock.end);
  if(mutationResult.committedAt>=endBlock.end||host.nativeMutationQuiescedAt<mutationResult.stagedAt||
     host.nativeMutationReleasedAt<host.nativeMutationQuiescedAt||host.nativeMutationEpoch!==1||host.nativeMutationFloor!==10.25||
     beforeFrames.length<2||afterFrames.length||host.failed||host.gpuErrors||host.packets!==1)throw Error('Draw boundary failed '+kind);
  return {kind,adapter:host.adapterInfo,block:{start:start.start,end:endBlock.end,blockedMs:endBlock.end-start.start,
    drawFramesBeforeQuiescence:beforeFrames.length,drawFramesAfterRelease:afterFrames.length},
   mutation:{...mutationResult,result:{status:mutationResult.result.status,ids:mutationResult.result.ids,receipt:mutationResult.result.receipt},
    changes:mutationResult.changes.map(e=>({type:e.type,sequence:e.sequence,effectiveTime:e.effectiveTime,actorId:e.actorId}))},
   drawStats:{quiescedAt:host.nativeMutationQuiescedAt,releasedAt:host.nativeMutationReleasedAt,mutationEpoch:host.nativeMutationEpoch,
    floor:host.nativeMutationFloor,packets:host.packets,nativeFrames:host.nativeFrames,gpuErrors:host.gpuErrors,failed:host.failed}};
 };
 try{return await Promise.race([run(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Native world mutation audit timed out: '+kind)),30000);})]);}
 finally{clearTimeout(timer);clearTimeout(commandTimer);publication?.dispose();preparer.terminate();draw.terminate();session.dispose();canvas.remove();}
}
export async function auditNativeWorldMutations(){
 const bytes=new Uint8Array(await(await fetch('/tests/fixtures/desierto983-d15-partial-state.json.gz')).arrayBuffer()),
  text=bytes[0]===31&&bytes[1]===139?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(bytes),
  module=await WebAssembly.compileStreaming(fetch('/src/world/wild-engine/spatial-savanna.wasm')),cases=[];
 for(const kind of ['polygon','residency-add','residency-remove','prop-remove','prop-restore','terrain'])cases.push(await runCase(module,text,kind));
 return {checklistId:'A6-04.f-R2',backend:'webgpu',scope:'Six opt-in native mutations and one causal draw consumer; old packets freeze after commit. Triangle only. Graphical replacement, all-consumer failover, and gameplay integration remain separate.',
  cases,authorizedAutonomy:false,authorizedPassage:false};
}
