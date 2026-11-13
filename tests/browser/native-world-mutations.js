import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialIntentBridge} from '../../src/world/wild-engine/spatial-intent-bridge.js';
import {createNativeIntentControlPublication} from '../../src/simulation/native-intent-control-publication.js';
import {createNativeIntentControlCohort} from '../../src/simulation/native-intent-control-cohort.js';

const now=()=>performance.timeOrigin+performance.now();
async function runCase(module,text,kind,{lifecycle=false,resourceIdentity=false}={}){
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
  let attached;
  if(lifecycle){publication=createNativeIntentControlCohort({observe:bridge.observeNativeIntentControl,publicationOptions:{timeoutMs:2000}});
   attached=publication.attach(control.port1,transportSession);}
  else {publication=createNativeIntentControlPublication({port:control.port1,session:transportSession,observe:bridge.observeNativeIntentControl});attached=publication.ready;}
  await Promise.all([attached,expect('device-ready')]);
  const startPacket={kind:'start',startTime:plan.startTime,endTime:plan.endTime,rows,route:{actorId:plan.actorId,routeHandle:handle,assignmentSequence:plan.assignmentSequence}};
  preparer.postMessage(startPacket);await expect('drawing');
  if(lifecycle)return await exerciseControlLifecycle({state,session,bridge,publication,preparer,expect,transportSession,startPacket,mutation});
  if(resourceIdentity){preparer.postMessage({kind:'prepare-frame',id:2});await expect('frame-prepared-2');}
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
  const [endBlock,mutationResult]=await Promise.all([expect('block-end-1'),action]);
  if(resourceIdentity){preparer.postMessage({kind:'publish-frame',id:2});if((await expect('frame-published-2')).outcome!=='obsolete')throw Error('Late pre-commit resources borrowed the new native world');}
  preparer.postMessage({kind:'inspect',id:1});
  const report=await expect('inspection-1'),host=report.execution.consumer,
   beforeFrames=host.samples.filter(f=>f.at>=start.start&&f.at<host.nativeMutationQuiescedAt),
   afterFrames=host.samples.filter(f=>f.at>=host.nativeMutationReleasedAt&&f.at<=endBlock.end);
  if(mutationResult.committedAt>=endBlock.end||host.nativeMutationQuiescedAt<mutationResult.stagedAt||
     host.nativeMutationReleasedAt<host.nativeMutationQuiescedAt||host.nativeMutationEpoch!==1||host.nativeMutationFloor!==10.25||
     beforeFrames.length<2||afterFrames.length||host.failed||host.gpuErrors||host.packets!==1)throw Error('Draw boundary failed '+kind);
  const summary={kind,adapter:host.adapterInfo,block:{start:start.start,end:endBlock.end,blockedMs:endBlock.end-start.start,
    drawFramesBeforeQuiescence:beforeFrames.length,drawFramesAfterRelease:afterFrames.length},
   mutation:{...mutationResult,result:{status:mutationResult.result.status,ids:mutationResult.result.ids,receipt:mutationResult.result.receipt},
    changes:mutationResult.changes.map(e=>({type:e.type,sequence:e.sequence,effectiveTime:e.effectiveTime,actorId:e.actorId}))},
   drawStats:{quiescedAt:host.nativeMutationQuiescedAt,releasedAt:host.nativeMutationReleasedAt,mutationEpoch:host.nativeMutationEpoch,
    floor:host.nativeMutationFloor,packets:host.packets,nativeFrames:host.nativeFrames,gpuErrors:host.gpuErrors,failed:host.failed}};
  if(resourceIdentity){
   preparer.postMessage({kind:'prepare-frame',id:3,worldBoundary:mutationResult.result.worldBoundary});await expect('frame-prepared-3');
   preparer.postMessage({kind:'publish-frame',id:3});if((await expect('frame-published-3')).outcome!=='presented')throw Error('Fresh native resource identity did not admit replacement');
   preparer.postMessage({kind:'inspect',id:3});const fresh=await expect('inspection-3'),after=fresh.execution.consumer;
   if(after.packets!==2||after.activeSequence!==3||after.failed||after.gpuErrors||fresh.values[0]!==10.25)throw Error('Replacement world did not draw at the native boundary');
   summary.resourceIdentity={latePacket:'obsolete',freshPacket:'presented',worldBoundary:mutationResult.result.worldBoundary,
    activeSequence:after.activeSequence,packets:after.packets,presentedTime:fresh.values[0],scope:'Native resource identity and packet replacement; unchanged diagnostic route, no characters or visible mutation projection.'};
  }
  return summary;
 };
 try{return await Promise.race([run(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Native world mutation audit timed out: '+kind)),30000);})]);}
 finally{clearTimeout(timer);clearTimeout(commandTimer);publication?.dispose();preparer.terminate();draw.terminate();session.dispose();canvas.remove();}
}
async function exerciseControlLifecycle({state,session,bridge,publication,preparer,expect,transportSession,startPacket,mutation}){
 const peers=[],same=()=>JSON.stringify(session.core.snapshot())+'|'+JSON.stringify(session.core.captureResidentChunks());
 function peer({relay=false}={}){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=96;document.body.append(canvas);
  const control=new MessageChannel(),resources=new MessageChannel(),draw=new Worker(new URL('../../src/rendering/webgpu-draw-worker.js',import.meta.url),{type:'module'}),
   preparation=new Worker(new URL('./native-gate-holds-preparation-worker.js',import.meta.url),{type:'module'}),messages=new Map(),waiters=new Map();
  let drop=false,relayChannel=null,withheld=null;
  if(relay){relayChannel=new MessageChannel();control.port2.onmessage=({data})=>{
   if(drop&&data.type==='IntentMutationQuiesce'){withheld=data;return;}relayChannel.port1.postMessage(data);};
   relayChannel.port1.onmessage=({data})=>control.port2.postMessage(data);}
  preparation.onmessage=({data})=>{
   if(data.kind==='failure'){for(const w of waiters.values())w.reject(Error(data.message));waiters.clear();return;}
   const key=data.id===undefined?data.kind:`${data.kind}-${data.id}`;messages.set(key,data);waiters.get(key)?.resolve(data);waiters.delete(key);
  };
  const port=relayChannel?.port2??control.port2,offscreen=canvas.transferControlToOffscreen();
  draw.postMessage({type:'init',canvas:offscreen,port:resources.port2,intentControl:{port,session:transportSession}},[offscreen,resources.port2,port]);
  preparation.postMessage({kind:'initialize',port:resources.port1},[resources.port1]);
  const p={preparation,attach:()=>publication.attach(control.port1,transportSession),
   expect:key=>messages.has(key)?Promise.resolve(messages.get(key)):new Promise((resolve,reject)=>waiters.set(key,{resolve,reject})),
   silence(){drop=true;},get withheld(){return withheld;},
   dispose(){draw.terminate();preparation.terminate();control.port1.close();control.port2.close();relayChannel?.port1.close();relayChannel?.port2.close();canvas.remove();}};
  peers.push(p);return p;
 }
 const mutate=mutation=>bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>publication,mutation});
 try{
  preparer.postMessage({kind:'block',id:1});const blockStart=await expect('block-start-1');
  const before=same(),replacement=peer(),attached=replacement.attach(),during=await mutate(mutation);
  if(during.status!=='control-failed'||same()!==before||publication.status().consumers!==2)throw Error('Temporary consumer escaped the physical boundary');
  await attached;const handoffAt=now();if(publication.status().consumers!==1)throw Error('Undrained predecessor was retained or omitted');
  const blockEnd=await expect('block-end-1');preparer.postMessage({kind:'status',id:1});const old=(await expect('status-1')).execution.consumer;
  if(!old.nativeRetiredAt||old.nativeRetiredAt>blockEnd.end||old.samples.some(f=>f.at>old.nativeRetiredAt)||handoffAt>blockEnd.end)throw Error('Retirement waited for preparation or submitted after drain');
  await replacement.expect('device-ready');replacement.preparation.postMessage(startPacket);await replacement.expect('drawing');
  state.elapsed=10.25;bridge.advanceNativeRouteExecution(state.elapsed);bridge.commitNativeCausalClock();
  const committed=await mutate(mutation);if(committed.status!=='committed')throw Error('Fresh replacement could not commit '+committed.status);
  // A real device loss, unlike a port close, can prove the old device is unable
  // to submit. Recovery must retain the same authority and get a fresh baseline.
  replacement.preparation.postMessage({kind:'lose-device'});
  const deadline=performance.now()+5000;while(!publication.connections().current?.drained&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,5));
  if(!publication.connections().current?.drained)throw Error('Lost device did not retire safely');
  const recovery=peer({relay:true});await Promise.all([recovery.attach(),recovery.expect('device-ready')]);
  recovery.preparation.postMessage({...startPacket,worldBoundary:publication.connections().current.worldBoundary});await recovery.expect('drawing');
  const afterLoss=publication.connections(),safeState=same();recovery.silence();
  const pendingFailure=mutate({type:'addChunk',cx:5,cz:5});
  await new Promise(resolve=>setTimeout(resolve,150));
  recovery.preparation.postMessage({kind:'status',id:2});const recovered=(await recovery.expect('status-2')).execution.consumer;
  const failed=await pendingFailure;
  if(failed.status!=='control-failed'||same()!==safeState||!recovery.withheld||!publication.status().closed)throw Error('Silent channel authorized a mutation');
  if(recovered.frameTime.elapsed>10.25||recovered.gpuErrors)throw Error('Silent consumer exceeded native time or failed GPU validation');
  return {checklistId:'A6-04.f-R3',backend:'webgpu',scope:'Cohort handoff, device loss and silent-channel safety using native execution and diagnostic triangles; product/entity acceptance remains open.',
   block:{start:blockStart.start,end:blockEnd.end,blockedMs:blockEnd.end-blockStart.start,handoffAt,retiredAt:old.nativeRetiredAt,oldFrames:old.nativeFrames,afterRetirementFrames:old.samples.filter(f=>f.at>old.nativeRetiredAt).length},
   temporaryConsumer:{mutation:during.status,worldUnchanged:true},replacement:{mutation:committed.status,consumers:afterLoss.cohort.consumers},
   deviceLoss:{drained:true,authorityEpoch:afterLoss.current.authorityEpoch},silentChannel:{mutation:failed.status,worldUnchanged:true,closed:publication.status().closed,presentedThrough:recovered.frameTime.elapsed,committedThrough:10.25},
   adapter:old.adapterInfo,authorizedAutonomy:false,authorizedPassage:false};
 }finally{for(const p of peers)p.dispose();}
}
export async function auditNativeWorldMutations(){
 const bytes=new Uint8Array(await(await fetch('/tests/fixtures/desierto983-d15-partial-state.json.gz')).arrayBuffer()),
  text=bytes[0]===31&&bytes[1]===139?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(bytes),
  module=await WebAssembly.compileStreaming(fetch('/src/world/wild-engine/spatial-savanna.wasm')),cases=[];
 for(const kind of ['polygon','residency-add','residency-remove','prop-remove','prop-restore','terrain'])cases.push(await runCase(module,text,kind));
 return {checklistId:'A6-04.f-R2',backend:'webgpu',scope:'Six opt-in native mutations and one causal draw consumer; old packets freeze after commit. Triangle only. Graphical replacement, all-consumer failover, and gameplay integration remain separate.',
  cases,authorizedAutonomy:false,authorizedPassage:false};
}
export async function auditNativeControlLifecycle(){
 const bytes=new Uint8Array(await(await fetch('/tests/fixtures/desierto983-d15-partial-state.json.gz')).arrayBuffer()),
  text=bytes[0]===31&&bytes[1]===139?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(bytes),
  module=await WebAssembly.compileStreaming(fetch('/src/world/wild-engine/spatial-savanna.wasm'));
 return runCase(module,text,'residency-add',{lifecycle:true});
}
export async function auditNativeWorldResources(){
 const bytes=new Uint8Array(await(await fetch('/tests/fixtures/desierto983-d15-partial-state.json.gz')).arrayBuffer()),
  text=bytes[0]===31&&bytes[1]===139?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(bytes),
  module=await WebAssembly.compileStreaming(fetch('/src/world/wild-engine/spatial-savanna.wasm'));
 return {checklistId:'A6-04.f-R4',backend:'webgpu',...await runCase(module,text,'residency-add',{resourceIdentity:true}),
  scope:'Native commit identity and graphical replacement only. Visible mutation resources and real characters remain pending.',authorizedAutonomy:false,authorizedPassage:false};
}
