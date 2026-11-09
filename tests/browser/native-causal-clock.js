import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialIntentBridge} from '../../src/world/wild-engine/spatial-intent-bridge.js';
import {createSpatialGateIntents} from '../../src/world/wild-engine/spatial-gate-intents.js';
import {createNativeIntentControlPublication} from '../../src/simulation/native-intent-control-publication.js';

const now=()=>performance.timeOrigin+performance.now();
export async function auditNativeCausalClock(){
 const bytes=new Uint8Array(await(await fetch('/tests/fixtures/desierto983-d15-partial-state.json.gz')).arrayBuffer()),
  text=bytes[0]===31&&bytes[1]===139?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(bytes),
  state=deserialize(text),template=structuredClone(state.workers[0]),module=await WebAssembly.compileStreaming(fetch('/src/world/wild-engine/spatial-savanna.wasm'));
 state.workers=[];state.tasks=[];state.plants=[];state.crates=[];state.spells=[];state.raid=null;state.elapsed=10;state.pauses=[];
 const loaded=new Map(),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:c=>loaded.set(`${c.cx},${c.cz}`,c)}),
  resources=new MessageChannel(),control=new MessageChannel(),transportSession='causal-'+crypto.randomUUID(),
  preparer=new Worker(new URL('./native-gate-holds-preparation-worker.js',import.meta.url),{type:'module'}),
  draw=new Worker(new URL('../../src/rendering/webgpu-draw-worker.js',import.meta.url),{type:'module'}),
  canvas=document.createElement('canvas');canvas.width=canvas.height=96;document.body.append(canvas);
 let publication,timeout,pumpTimer,commandTimer,lastPump,failure;const messages=new Map(),waiters=new Map(),watermarks=[];
 const expect=key=>messages.has(key)?Promise.resolve(messages.get(key)):new Promise((resolve,reject)=>waiters.set(key,{resolve,reject}));
 preparer.onmessage=({data})=>{
  if(data.kind==='failure'){failure=Error(data.message);for(const w of waiters.values())w.reject(failure);waiters.clear();return;}
  const key=data.id===undefined?data.kind:`${data.kind}-${data.id}`;messages.set(key,data);waiters.get(key)?.resolve(data);waiters.delete(key);
 };
 preparer.onerror=event=>{failure=Error(event.message);for(const w of waiters.values())w.reject(failure);waiters.clear();};
 const run=async()=>{
  for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
  session.core.setSettlement(20,30,20,20);
  const origin={x:20.05,z:24},end={x:20.05,z:36};state.workers=[{...template,id:'worker-900011',...origin,path:[],radius:.28,status:'returning',taskId:null,recovering:false,incapacitated:false}];
  const bridge=createSpatialIntentBridge(session);bridge.resetFromState(state);const w=session.core.wasm,gates=createSpatialGateIntents(session,state),
   gate={id:'structure-990001',gate:true,status:'intact',material:'zarzas',x:20,z:30,gateOpen:0};
  if(!gates.register(gate)||gates.installMechanism(gate.id,'zarzas').status!=='installed')throw Error('Native physical gate fixture failed');
  session.actorSectorRevision({worker:true});const ptr=w.nav_intent_attack_route_input_ptr(1);new Float32Array(w.memory.buffer,ptr,2).set([end.x,end.z]);
  if(w.nav_intent_restore_home(900011,origin.x,origin.z,end.x,end.z,1)!==1||w.spatial_body_upsert(1,origin.x,origin.z,.28,0,1)!==1||!gates.bindWorker('worker-900011',1))throw Error('Native worker fixture failed');
  const raw=bridge.intentChanges().at(-1).routeHandle,admitted=bridge.admitNativeGateRoute(raw,1,{radius:.28,urgent:true,runRemaining:3.25});
  if(admitted.status!=='admitted'||bridge.beginNativeRouteExecution().status!=='started')throw Error('Native execution admission failed');
  const plan=admitted.motionPlan,handle=admitted.routeHandle,rows=Array.from(bridge.nativeRouteTimeKnots(handle)).flatMap(at=>{
   const p=bridge.sampleNativeRoute(handle,at);return [at,p.x,p.z,p.phase,p.runPhase,p.walkPhase,p.carryPhase,p.runRemaining];});
  function commit(paused,rate){const authorizedAt=now(),result=bridge.commitNativeCausalClock({paused,rate});
   if(!['committed','unchanged'].includes(result.status))throw Error('Native clock commit rejected '+result.status);
   if(result.status==='committed')watermarks.push({authorizedAt,...result.clock});return result.clock;
  }
  commit(true,1);bridge.intentChanges();
  const offscreen=canvas.transferControlToOffscreen();draw.postMessage({type:'init',canvas:offscreen,port:resources.port2,intentControl:{port:control.port2,session:transportSession}},[offscreen,resources.port2,control.port2]);
  preparer.postMessage({kind:'initialize',port:resources.port1},[resources.port1]);
  publication=createNativeIntentControlPublication({port:control.port1,session:transportSession,observe:bridge.observeNativeIntentControl});
  await Promise.all([publication.ready,expect('device-ready')]);
  preparer.postMessage({kind:'start',startTime:plan.startTime,endTime:plan.endTime,rows,
   route:{actorId:plan.actorId,routeHandle:handle,assignmentSequence:plan.assignmentSequence}});await expect('drawing');
  const counters=()=>Object.fromEntries(['nav_gate_wait_segments','nav_gate_prefix_segments','nav_gate_worker_checks','nav_gate_sweep_evaluations',
   'nav_gate_static_evaluations','spatial_execution_clearance_checks','nav_intent_route_queries'].map(name=>[name,w[name]()])),before=counters(),blocks=[],readbacks=[];
  async function inspect(id,expected=null){
   preparer.postMessage({kind:'inspect',id});const report=await expect(`inspection-${id}`),gpu=report.values,
    pose=expected??bridge.sampleNativeRoute(handle,gpu[0]),cpu=[pose.x,pose.z,pose.phase,pose.runPhase,pose.walkPhase,pose.carryPhase,pose.runRemaining],
    maxError=Math.max(...cpu.map((value,i)=>Math.abs(value-gpu[i+1])));
   if(!gpu.every(Number.isFinite)||!Number.isFinite(maxError)||maxError>3e-5)throw Error('Causal GPU/native sample diverged '+JSON.stringify({gpu,cpu,maxError}));
   readbacks.push({gpu,cpu,maxError});return report.execution.consumer;
  }
  preparer.postMessage({kind:'block',id:1});const start1=await expect('block-start-1');commit(true,2);
  const end1=await expect('block-end-1'),first=await inspect(1);if(readbacks[0].gpu[0]!==10)throw Error('Prepared future clock bypassed native pause');
  blocks.push({kind:'paused-speed-change',start:start1.start,end:end1.end,blockedMs:end1.end-start1.start});
  preparer.postMessage({kind:'block',id:2});const start2=await expect('block-start-2');commit(false,2);lastPump=now();
  const pump=()=>{const at=now(),dt=Math.max(0,(at-lastPump)/1000);lastPump=at;if(!dt)return;
   state.elapsed+=dt*2;const result=bridge.advanceNativeRouteExecution(state.elapsed);if(result.status!=='advanced')throw Error('Native advance rejected '+result.status);commit(false,2);};
  pumpTimer=setInterval(()=>{try{pump();}catch(error){failure=error;clearInterval(pumpTimer);for(const w of waiters.values())w.reject(error);waiters.clear();}},20);
  const end2=await expect('block-end-2');clearInterval(pumpTimer);pumpTimer=null;pump();const second=await inspect(2);
  blocks.push({kind:'native-speed-two',start:start2.start,end:end2.end,blockedMs:end2.end-start2.start});
  preparer.postMessage({kind:'block',id:3});const start3=await expect('block-start-3'),executed=bridge.nativeRouteExecution(handle),through=state.elapsed;
  const revocation=new Promise((resolve,reject)=>{commandTimer=setTimeout(async()=>{try{
   const appliedAt=now();if(w.nav_intent_cancel_home(900011)!==1)throw Error('Native cancellation failed');
   const clock=commit(true,2),receipt=await publication.fenceGpu();resolve({appliedAt,clock,receipt,receivedAt:now()});
  }catch(error){reject(error);}},180);});
  const [end3,revoked]=await Promise.all([expect('block-end-3'),revocation]),final=await inspect(3,executed);
  blocks.push({kind:'clock-silence-then-revocation',start:start3.start,end:end3.end,blockedMs:end3.end-start3.start});
  if(revoked.receivedAt>=end3.end)throw Error('Causal control/GPU receipt waited for preparation');
  if(readbacks[2].gpu[0]>through||Math.abs(readbacks[2].gpu[0]-through)>2e-5)throw Error('GPU did not stop at the finite native frontier');
  const frames=final.samples;let previous=-Infinity;
  for(const frame of frames){const permit=watermarks.findLast(p=>p.authorizedAt<=frame.at);
   if(!permit||frame.clockElapsed>permit.committedThrough+1e-9||frame.clockElapsed<previous)throw Error('Unexecuted/rewinding presentation time');previous=frame.clockElapsed;
  }
  for(const block of blocks){const framesInBlock=frames.filter(f=>f.at>=block.start&&f.at<=block.end);block.drawFrames=framesInBlock.length;
   block.minClock=Math.min(...framesInBlock.map(f=>f.clockElapsed));block.maxClock=Math.max(...framesInBlock.map(f=>f.clockElapsed));
   if(framesInBlock.length<2)throw Error('Draw did not remain independent of preparation');
  }
  if(blocks[1].maxClock-blocks[1].minClock<.4||JSON.stringify(before)!==JSON.stringify(counters())||failure||final.failed||final.gpuErrors||final.packets!==1)
   throw Error('Causal clock audit failed '+JSON.stringify({blocks,before,after:counters(),failure,final}));
  return {checklistId:'A6-04.f-R1',backend:'webgpu',adapter:final.adapterInfo,scope:'Real native execution and direct finite clock permits, one prepared native timetable replayed in WebGPU. Diagnostic triangle, not character/product acceptance or all-consumer recovery.',
   blocks,readbacks,revoked,watermarks,drawStats:{packets:final.packets,computePackets:final.computePackets,replayFrames:final.replayFrames,nativeFrames:final.nativeFrames,
    gpuErrors:final.gpuErrors,failed:final.failed},clock:final.nativeCausalClock,countersBefore:before,countersAfter:counters(),
   safeClockSamples:frames.map(f=>({at:f.at,elapsed:f.clockElapsed,safeUntil:f.safeUntil})),authorizedAutonomy:false,authorizedPassage:false};
 };
 try{return await Promise.race([run(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Native causal clock audit timed out')),30000);})]);}
 finally{clearTimeout(timeout);clearTimeout(commandTimer);clearInterval(pumpTimer);publication?.dispose();preparer.terminate();draw.terminate();session.dispose();canvas.remove();}
}
