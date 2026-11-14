import {deserialize} from '../../src/persistence/snapshots.js';
import {serializeConfirmedState} from '../../src/simulation/confirmed-live-state.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialIntentBridge} from '../../src/world/wild-engine/spatial-intent-bridge.js';
import {createNativeIntentControlPublication} from '../../src/simulation/native-intent-control-publication.js';
import {createTerrainPublication} from '../../src/simulation/terrain-publication.js';
import {createWebGpuWorldClient} from '../../src/rendering/webgpu-world-client.js';
const now=()=>performance.timeOrigin+performance.now();
export async function auditNativeWorkerWorldOwner({runningTransition=false,carrying=false}={}){
 const long=false,watermarks=[],errors=[];
 const bytes=new Uint8Array(await(await fetch('/tests/fixtures/desierto983-d15-partial-state.json.gz')).arrayBuffer()),text=bytes[0]===31&&bytes[1]===139?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text():new TextDecoder().decode(bytes),state=deserialize(text),template=structuredClone(state.workers[0]),module=await WebAssembly.compileStreaming(fetch('/src/world/wild-engine/spatial-savanna.wasm'));
 state.workers=[];state.tasks=[];state.plants=[];state.crates=[];state.spells=[];state.raid=null;state.elapsed=10;state.pauses=[];
 const loaded=new Map(),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:chunk=>loaded.set(`${chunk.cx},${chunk.cz}`,chunk)});
  for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
  const w=session.core.wasm;session.actorSectorRevision({worker:true});let origin,end;
  for(let z=-12;z<=12&&!origin;z+=2)for(let x=-12;x<=12&&!origin;x+=2)if(w.spatial_execution_segment_clear(x-6+.2,z+.2,x+6+.2,z+.2,.28)===1){origin={x:x-6+.2,z:z+.2};end={x:x+6+.2,z:z+.2};}
  if(!origin)throw Error('Native original-character corridor unavailable');
  state.workers=[{...template,id:'worker-900011',...origin,path:[],radius:.28,status:'returning',taskId:null,crateId:null,recovery:null,fallRemaining:0,recoveryExitRemaining:0,recovering:false,incapacitated:false,gateWaiting:false,running:false,walkPhase:0,runPhase:0,carryPhase:0}];
  if(carrying){state.workers[0].status='carrying';state.workers[0].crateId='crate-900020';state.crates=[{id:'crate-900020',species:'mijo',value:{n:'1',d:'1'},...origin,profile:template.profile,centerId:template.centerId,carrierId:state.workers[0].id,delivered:false}];}
  const bridge=createSpatialIntentBridge(session);bridge.resetFromState(state);session.actorSectorRevision({worker:true});const points=long?Array.from({length:130},(_,i)=>({x:i%2?end.x:origin.x+1,z:end.z})):[end],ptr=w.nav_intent_attack_route_input_ptr(points.length);new Float32Array(w.memory.buffer,ptr,points.length*2).set(points.flatMap(p=>[p.x,p.z]));if(w.nav_intent_restore_home(900011,origin.x,origin.z,end.x,end.z,points.length)!==1)throw Error('Native character route unavailable');
  const raw=bridge.intentChanges().at(-1).routeHandle,prepared=bridge.prepareNativeRouteMotion(raw,{radius:.28,...(carrying?{carrying:true}:runningTransition?{urgent:true,runRemaining:1}:{})});if(prepared.status!=='prepared'||w.spatial_body_upsert(1,origin.x,origin.z,.28,0,1)!==1||bridge.reserveNativeRoute(prepared.routeHandle,1).status!=='reserved'||bridge.beginNativeRouteExecution().status!=='started')throw Error('Native character execution unavailable');
  const handle=prepared.routeHandle,route=bridge.captureNativeRoutePresentation(handle);state.workers[0].heading=route.rows[5];
  function commit(paused,rate){const at=now(),result=bridge.commitNativeCausalClock({paused,rate});if(!['committed','unchanged'].includes(result.status))throw Error('Native character clock rejected');if(result.status==='committed')watermarks.push({authorizedAt:at,...result.clock});}
  state.nextId=Math.max(state.nextId,carrying?900021:900012);commit(true,4);bridge.intentChanges();
  const control=new MessageChannel(),diagnostic=new MessageChannel(),transportSession='native-world-'+crypto.randomUUID(),canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;canvas.id='native-worker-world';document.body.append(canvas);
  let preparer,blockStarted,blockEnded,publication,publisher,client,pump,finalReceipt;
  const started=new Promise(resolve=>{blockStarted=resolve;}),ended=new Promise(resolve=>{blockEnded=resolve;});diagnostic.port1.onmessage=({data})=>{if(data.kind==='block-start')blockStarted(data);else if(data.kind==='block-end')blockEnded(data);};diagnostic.port1.start();
  const ground=session.core.surface(origin.x,origin.z),camera={x:origin.x+6,y:ground+10,z:origin.z+20,targetX:origin.x+6,targetY:ground+1,targetZ:origin.z};
  try{
   client=createWebGpuWorldClient({canvas,session:transportSession,snapshot:serializeConfirmedState(state),width:640,height:360,camera,remoteDraw:true,intentControlPort:control.port2,experimentalAllActors:true,experimentalMinimalWorld:true,presentationCapabilities:{bakedWorkerWalking:true,picking:true},quality:'muy_baja',onError:error=>errors.push(String(error.stack??error)),onResourceError:error=>errors.push(JSON.stringify(error)),workerFactory:()=>{preparer=new Worker(new URL('./fixtures/native-worker-world-audit-worker.js',import.meta.url),{type:'module'});preparer.postMessage({kind:'configure-control-fault',port:diagnostic.port2},[diagnostic.port2]);return preparer;}});
   publication=createNativeIntentControlPublication({port:control.port1,session:transportSession,observe:bridge.observeNativeIntentControl,timeoutMs:5000});
   publisher=createTerrainPublication({port:client.terrainPort,session:transportSession,epoch:'native-world'});for(const chunk of loaded.values())publisher.stage(chunk,10);publisher.commit(0);
   await Promise.all([client.ready,publication.ready]);await client.waitForFirstFrame();
   const deadline=performance.now()+60000;let initial;
   do{initial=await client.inspect();if(initial.workers.ready===1&&initial.workers.assets?.profiles.every(p=>p.textured))break;await new Promise(resolve=>setTimeout(resolve,16));}while(performance.now()<deadline&&!errors.length);
   const terrainManifest={epoch:'native-world',chunks:[...loaded.values()].map(({cx,cz})=>({cx,cz,revision:1}))},prepared=await client.prepareNativeRoute(state.workers[0].id,route,{terrainManifest}),before=await client.inspect();
   if(Object.values(prepared.qaLastRenderFactories??{missing:1}).some(Boolean))throw Error('Native first product render created GPU resources '+JSON.stringify(prepared.qaLastRenderFactories));
   if(carrying&&before.qaNativeRig?.attachments.length!==9)throw Error('Native Carry lacks nine visible attachments');
   if(before.workers.native!==1||!before.drawExecution.consumer.clockBindings||before.drawExecution.consumer.failed)throw Error('Production native worker not active '+JSON.stringify(before));
   await window.nativeWorkerWorldCheckpoint?.('start');
   const reused=await client.prepareNativeRoute(state.workers[0].id,route,{terrainManifest}),afterReuse=await client.inspect();
   if(!reused.reused||afterReuse.drawExecution.resourcesCreated!==before.drawExecution.resourcesCreated)throw Error('Identical native route recreated graphics');
   preparer.postMessage({kind:'block-control-preparation'});const block=await started;commit(false,4);let last=now();
   const advance=()=>{const at=now(),dt=(at-last)/1000;last=at;state.elapsed+=dt*4;if(bridge.advanceNativeRouteExecution(state.elapsed).status!=='advanced')throw Error('Native execution advance failed');commit(false,4);};
   pump=setInterval(()=>{try{advance();}catch(error){errors.push(String(error));}},20);const endBlock=await ended;clearInterval(pump);pump=null;advance();commit(true,4);await publication.fenceGpu();
   const after=await client.inspect(),frames=after.drawExecution.consumer.samples.filter(f=>f.at>=block.start&&f.at<=endBlock.end);
   if(frames.length<2||Math.max(...frames.map(f=>f.clockElapsed))-Math.min(...frames.map(f=>f.clockElapsed))<.5||after.inspectionGeneration!==before.inspectionGeneration||after.drawExecution.consumer.gpuErrors||errors.length)throw Error('Production native worker stall failed '+JSON.stringify({errors,frames}));
   if(carrying&&(after.qaNativeRig?.poseHash!==before.qaNativeRig?.poseHash||JSON.stringify(after.qaNativeRig?.attachments)!==JSON.stringify(before.qaNativeRig?.attachments)))throw Error('Native Carry changed CPU pose or attachment identities while drawing');
   const cutIndex=runningTransition?Array.from({length:route.rows.length/16},(_,i)=>i*16).find(i=>i>0&&route.rows[i+14]===0&&route.rows[i-2]===1):null,cutAt=cutIndex===null?null:route.rows[cutIndex];
   if(runningTransition&&(!Number.isFinite(cutAt)||!frames.some(frame=>frame.clockElapsed<cutAt)||!frames.some(frame=>frame.clockElapsed>cutAt)))throw Error('Native GPU draws did not cross the Run/Walk boundary');
   const transition=runningTransition?{at:cutAt,before:bridge.sampleNativeRoute(handle,cutAt-.01),after:bridge.sampleNativeRoute(handle,cutAt+.01),drawsBefore:frames.filter(f=>f.clockElapsed<cutAt).length,drawsAfter:frames.filter(f=>f.clockElapsed>cutAt).length}:null;
   await window.nativeWorkerWorldCheckpoint?.('moved');
   const endpoint=bridge.sampleNativeRoute(handle,state.elapsed),ptr=w.nav_intent_attack_route_input_ptr(1);new Float32Array(w.memory.buffer,ptr,2).set([origin.x,origin.z]);
   if(w.nav_intent_restore_home(900011,endpoint.x,endpoint.z,origin.x,origin.z,1)!==1)throw Error('Native suffix unavailable');
   const rawNext=bridge.intentChanges().at(-1).routeHandle,next=bridge.prepareNativeRouteMotion(rawNext,{radius:.28,...(carrying?{carrying:true}:{})});
   if(next.status!=='prepared'||bridge.reserveNativeRoute(next.routeHandle,1).status!=='reserved')throw Error('Native suffix preparation failed');
   if(bridge.beginNativeRouteExecution().status!=='started')throw Error('Native suffix execution not started');
   const nextPacket=bridge.captureNativeRoutePresentation(next.routeHandle);commit(true,4);
   const replacement=await client.prepareNativeRoute(state.workers[0].id,nextPacket,{terrainManifest}),replaced=await client.inspect(),oldRelease=await client.releaseNativeRoute(state.workers[0].id,route.nativeRoute);
   if(Object.values(replacement.qaLastRenderFactories??{missing:1}).some(Boolean))throw Error('Native replacement first product render created GPU resources '+JSON.stringify(replacement.qaLastRenderFactories));
   if(carrying&&JSON.stringify(replaced.qaNativeRig?.attachments)!==JSON.stringify(before.qaNativeRig?.attachments))throw Error('Native Carry replacement recreated attachment geometry');
   if(oldRelease!==false||replaced.workers.native!==1||replaced.inspectionGeneration!==before.inspectionGeneration||replaced.drawExecution.consumer.failed||replaced.drawExecution.consumer.gpuErrors)throw Error('Production native suffix replacement failed');
   // Confirmed endpoint publication precedes fallback; resource release itself
   // neither advances authority nor invents the worker's final CPU position.
   const confirmedPose=bridge.sampleNativeRoute(next.routeHandle,state.elapsed);if(!confirmedPose)throw Error('Native fallback pose unavailable');Object.assign(state.workers[0],{x:confirmedPose.x,z:confirmedPose.z,heading:confirmedPose.yaw,runPhase:confirmedPose.runPhase,walkPhase:confirmedPose.walkPhase,carryPhase:confirmedPose.carryPhase,running:confirmedPose.running});publisher.commit(1);client.presentationPort.postMessage({kind:'publication',session:transportSession,publication:{session:transportSession,sequence:1,elapsed:state.elapsed,physicsPose:null,snapshot:serializeConfirmedState(state),events:[]}});
   const confirmedDeadline=performance.now()+10000;while((await client.inspect()).state.sequence<1){if(performance.now()>confirmedDeadline)throw Error('Native endpoint publication not adopted');await new Promise(resolve=>setTimeout(resolve,4));}
   const released=await client.releaseNativeRoute(state.workers[0].id,nextPacket.nativeRoute),final=await client.inspect();
   if(!released||final.workers.native!==0||final.phase!=='running'||errors.length)throw Error('Production native worker release failed '+JSON.stringify({released,errors}));
   const result={scope:'Production WorldClient -> WorldWorker -> WorldSurface -> existing worker roster, real original worker and real C++/draw control. Explicit native resource input, not ordinary gameplay producer or full all-intent acceptance.',adapter:after.drawExecution.consumer.adapterInfo,carrying,rig:carrying?{before:before.qaNativeRig,after:after.qaNativeRig,replaced:replaced.qaNativeRig}:null,runningTransition,transition,prepared,reused,replacement,oldRelease,released,before:{generation:before.inspectionGeneration,resourcesCreated:before.drawExecution.resourcesCreated,workers:before.workers},afterReuse:{resourcesCreated:afterReuse.drawExecution.resourcesCreated},after:{generation:after.inspectionGeneration,resourcesCreated:after.drawExecution.resourcesCreated,workers:after.workers},final:{generation:final.inspectionGeneration,workers:final.workers,gpuErrors:final.drawExecution.consumer.gpuErrors},block:{start:block.start,end:endBlock.end,blockedMs:endBlock.end-block.start,drawFrames:frames.length,minClock:Math.min(...frames.map(f=>f.clockElapsed)),maxClock:Math.max(...frames.map(f=>f.clockElapsed))},frames,errors};
   await window.nativeWorkerWorldCheckpoint?.();finalReceipt=result;return result;
  }finally{clearInterval(pump);publisher?.dispose();client?.dispose();try{if(publication&&finalReceipt){const drainDeadline=performance.now()+10000;while(!publication.status().drained&&performance.now()<drainDeadline)await new Promise(resolve=>setTimeout(resolve,4));finalReceipt.drained=publication.status().drained;if(!finalReceipt.drained)throw Error('Production native worker GPU did not drain before authority disposal');}}finally{publication?.dispose();diagnostic.port1.close();session.dispose();}}
}
