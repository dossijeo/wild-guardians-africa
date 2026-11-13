import {createWebGpuWorldSurface} from '../../src/rendering/webgpu-world-surface.js';
import {createSpatialWorld} from '../../src/world/wild-engine/spatial-world.js';
import {deserialize} from '../../src/persistence/snapshots.js';
import {serializeConfirmedState} from '../../src/simulation/confirmed-live-state.js';
import {estimateRetainedBytes} from '../../src/simulation/retained-size.js';
import wasmUrl from '../../src/world/wild-engine/spatial-savanna.wasm?url';
import {createConfirmedCameraTerrain,CameraTerrainUnavailable} from '../../src/app/confirmed-camera-terrain.js';

self.onmessage=async({data})=>{
 if(data.nativeReplay){await auditNativeWorldReplay(data);return;}
 let surface,world,terrain=new MessageChannel(),presentation=new MessageChannel();const errors=[],cameraPayloads=[],cameraTerrain=data.retirement?createConfirmedCameraTerrain():null;
 try{
  const original=OffscreenCanvas.prototype.getContext;OffscreenCanvas.prototype.getContext=function(kind,...args){if(/^webgl/i.test(kind))throw Error('WebGL forbidden');return original.call(this,kind,...args);};
  const response=await fetch('/tests/fixtures/manglares-123-d10-raid-state.json.gz'),body=response.headers.get('content-encoding')?.includes('gzip')?response.body:response.body.pipeThrough(new DecompressionStream('gzip')),state=deserialize(await new Response(body).text());
  // This surface test keeps occupancy but no active work/physics outside its one chunk.
  for(const worker of state.workers)worker.status='idle';state.tasks=[];state.raid=null;
  state.biome=data.biome;if(data.biome==='manglares'){state.mangroveNetwork=true;state.mangroveSettlementVersion=2;}else{delete state.mangroveNetwork;delete state.mangroveSettlementVersion;}if(data.daylight)state.time=100;
  const module=await WebAssembly.compile(await (await fetch(wasmUrl)).arrayBuffer());world=createSpatialWorld(module);world.generate(712,0,0,data.biome==='sabana'?'savanna':data.biome,data.biome==='manglares'?{mangroveNetwork:true}:{});const payload=world.chunkPayload();payload.instances=Array.from({length:20},()=>[]);const cameraView={x:15,y:data.biome==='gran-canon'?Math.max(...payload.terrain.positions.filter((_,i)=>i%3===1))+30:12,z:20,targetX:0,targetY:payload.terrain.positions[(24*49+24)*3+1],targetZ:0};
  surface=await createWebGpuWorldSurface({canvas:data.canvas,session:'ground',terrainPort:terrain.port1,presentationPort:presentation.port1,snapshot:serializeConfirmedState(state),width:512,height:512,experimentalMangroveGround:true,presentationCapabilities:{causalInputs:true,coordinatedChunks:true,...(data.retirement?{cameraTerrain:true}:{})},...(cameraTerrain?{onCameraTerrain:p=>{cameraPayloads.push(p);cameraTerrain.ingest(p);}}:{}),experimentalTemporalPresentation:{product:true,maxPublications:8,maxBytes:50000000,maxHistory:64,maxHistoryBytes:50000000},camera:cameraView,onError:error=>errors.push(String(error.stack??error)),onResourceError:(kind,error)=>errors.push(kind+': '+String(error.stack??error))});
  if(!surface.renderer.backend?.isWebGPUBackend)throw Error('WebGPU required');surface.renderer.backend.device.addEventListener('uncapturederror',event=>errors.push(event.error.message));
  presentation.port2.postMessage({kind:'presentationTimelineReady',session:'ground',version:1});
  terrain.port2.postMessage({kind:'terrainHello',session:'ground',epoch:'e',version:1});
  terrain.port2.postMessage({kind:'terrainBatchBegin',session:'ground',epoch:'e',sequence:0,id:1,count:1,bytes:estimateRetainedBytes(payload)});
  terrain.port2.postMessage({kind:'terrain',session:'ground',epoch:'e',sequence:0,id:2,revision:1,payload});
  terrain.port2.postMessage({kind:'terrainBatchEnd',session:'ground',epoch:'e',sequence:0,id:3});
  const requiresCover=['sabana','gran-rio','manglares'].includes(data.biome),ready=()=>surface.groundStatus.chunks>0&&(!requiresCover||surface.grassStatus?.visible>0),deadline=performance.now()+90000;let frames=0;
  while(performance.now()<deadline&&!errors.length){surface.timelinePump?.advance();surface.render();frames++;if(ready())break;await new Promise(resolve=>setTimeout(resolve,16));}
  if(errors.length)throw Error(errors.join('\n'));if(!ready()||!surface.groundStatus.experimental)throw Error('No textured ground/coverage '+JSON.stringify({grass:surface.grassStatus,terrain:surface.terrain.status(),ground:surface.groundStatus}));
  for(let i=0;i<10;i++){surface.timelinePump?.advance();surface.render();await new Promise(resolve=>setTimeout(resolve,16));}await surface.renderer.backend.device.queue.onSubmittedWorkDone();if(errors.length)throw Error(errors.join('\n'));
  const coverIds=()=>{const ids=[];surface.scene.traverse(object=>{if(object.geometry?.getAttribute('coverageAnchor'))ids.push(object.geometry.uuid);});return ids.sort().join(',');},before=coverIds();
  for(let sequence=1;sequence<=3;sequence++){
   terrain.port2.postMessage({kind:'terrainBatchBegin',session:'ground',epoch:'e',sequence,id:sequence*2+2,count:0,bytes:0});terrain.port2.postMessage({kind:'terrainBatchEnd',session:'ground',epoch:'e',sequence,id:sequence*2+3});
   presentation.port2.postMessage({kind:'publication',session:'ground',publication:{session:'ground',sequence,elapsed:state.elapsed,snapshot:serializeConfirmedState(state),events:[]}});
   const until=performance.now()+10000;while(surface.stream.status().sequence<sequence&&performance.now()<until&&!errors.length){surface.timelinePump?.advance();surface.render();await new Promise(resolve=>setTimeout(resolve,16));}
   if(surface.stream.status().sequence!==sequence||errors.length)throw Error('Publication failed '+errors.join('\n'));if(coverIds()!==before)throw Error('Unchanged publication rebuilt ground cover');
  }
  let retirement=null,retiredImage=null;
  if(data.retirement){
   cameraTerrain.confirm(3);if(!Number.isFinite(cameraTerrain.surface(0,0)))throw Error('Camera height unavailable before retirement');
   const before={terrain:surface.residency.size,biome:surface.biomeProps.status().chunks,grass:surface.grassStatus,camera:cameraTerrain.status()};
   // This is a resource/admission test. Native proposal and causal-clock
   // acceptance remain in their existing harness; no character plan is implied.
   if(world.removeChunk(0,0)!==1)throw Error('Could not retire the native fixture chunk');
   const send=async(sequence,revision,value,id)=>{
    terrain.port2.postMessage({kind:'terrainBatchBegin',session:'ground',epoch:'e',sequence,id,count:1,bytes:estimateRetainedBytes(value)});
    terrain.port2.postMessage({kind:'terrain',session:'ground',epoch:'e',sequence,id:id+1,revision,payload:value});
    terrain.port2.postMessage({kind:'terrainBatchEnd',session:'ground',epoch:'e',sequence,id:id+2});
    presentation.port2.postMessage({kind:'publication',session:'ground',publication:{session:'ground',sequence,elapsed:state.elapsed,snapshot:serializeConfirmedState(state),events:[]}});
    const until=performance.now()+30000;while(surface.stream.status().sequence<sequence&&performance.now()<until&&!errors.length){surface.timelinePump.advance();surface.render();await new Promise(resolve=>setTimeout(resolve,16));}
    if(surface.stream.status().sequence!==sequence||errors.length)throw Error('Resource boundary failed '+errors.join('\n'));cameraTerrain.confirm(sequence);
   };
   await send(4,2,{authority:'spatial-wasm',cx:0,cz:0,removed:true,capturedAt:state.elapsed},10);
   for(let i=0;i<3;i++){surface.render();await new Promise(resolve=>setTimeout(resolve,16));}await surface.renderer.backend.device.queue.onSubmittedWorkDone();
   let cameraUnavailable=false;try{cameraTerrain.surface(0,0);}catch(error){cameraUnavailable=error instanceof CameraTerrainUnavailable;}
   const removed={terrain:surface.residency.size,biome:surface.biomeProps.status().chunks,grass:surface.grassStatus,camera:cameraTerrain.status(),cameraUnavailable};
   if(removed.terrain||removed.biome||removed.grass.chunks||removed.grass.visible||removed.grass.suspended||!cameraUnavailable||removed.camera.chunks)throw Error('Retired resources remain visible '+JSON.stringify(removed));
   retiredImage=await data.canvas.convertToBlob({type:'image/png'});
   if(world.addChunk(0,0)<0)throw Error('Could not readmit native fixture chunk');const again=world.chunkPayload();again.instances=Array.from({length:20},()=>[]);await send(5,3,again,13);
   const until=performance.now()+30000;while(performance.now()<until&&!surface.grassStatus.visible&&!errors.length){surface.render();await new Promise(resolve=>setTimeout(resolve,16));}
   surface.render();await surface.renderer.backend.device.queue.onSubmittedWorkDone();if(errors.length||!surface.grassStatus.visible||surface.grassStatus.suspended||!Number.isFinite(cameraTerrain.surface(0,0)))throw Error('Readmission failed '+errors.join('\n'));
   retirement={before,removed,readmitted:{terrain:surface.residency.size,biome:surface.biomeProps.status().chunks,grass:surface.grassStatus,camera:cameraTerrain.status()},cameraPayloads:cameraPayloads.map(p=>({sequence:p.sequence,revision:p.revision,removed:p.removed===true,hasHeights:!!p.heights})),scope:'Real product surface and WebGPU admission for native terrain resources, grass and camera. Manually sequenced resource mutations; no causal native proposal, blocked preparer or character/autonomous-plan acceptance.'};
  }
  const image=await data.canvas.convertToBlob({type:'image/png'}),result={ok:true,backend:'WebGPU',adapter:Object.fromEntries(["vendor","architecture","device","description"].map(key=>[key,surface.renderer.backend.device.adapterInfo?.[key]])),biome:data.biome,grass:surface.grassStatus,ground:surface.groundStatus,frames,unchangedPublications:3,...(retirement?{retirement}:{})};
  if(data.biome==='manglares'&&data.daylight){
   const checkpoint={session:'ground',sequence:3,elapsed:state.elapsed,snapshot:serializeConfirmedState(state),terrainCheckpoint:{sequence:3,chunks:[payload],terrainManifest:{epoch:'e',chunks:[{cx:0,cz:0,revision:1}]}},presentationCheckpoint:surface.captureTemporalPresentationCheckpoint(3),workCheckpoint:{version:1,sequence:3,elapsed:state.elapsed,effects:[]}};
   await surface.dispose();terrain.port2.close();presentation.port2.close();terrain=new MessageChannel();presentation=new MessageChannel();
   surface=await createWebGpuWorldSurface({canvas:new OffscreenCanvas(512,512),session:'ground',initialSequence:3,terrainPort:terrain.port1,presentationPort:presentation.port1,snapshot:checkpoint.snapshot,width:512,height:512,experimentalTimelineRecovery:true,presentationRecovery:true,presentationWorkRecovery:true,experimentalMangroveGround:true,presentationCapabilities:{causalInputs:true,coordinatedChunks:true},experimentalTemporalPresentation:{product:true,checkpoints:true,maxPublications:8,maxBytes:50000000,maxHistory:64,maxHistoryBytes:50000000},camera:cameraView,onError:error=>errors.push(String(error.stack??error)),onResourceError:(kind,error)=>errors.push(kind+': '+String(error.stack??error))});
   await surface.restoreTimelineCheckpoint(checkpoint);if(!surface.grassStatus.suspended||surface.grassStatus.visible!==0)throw Error('Recovery exposed premature cover');
   await surface.applyTimelineRecoveryBoundary({sequence:4,terrain:[],publication:{session:'ground',sequence:4,elapsed:state.elapsed,snapshot:checkpoint.snapshot,events:[]}});surface.finishTimelineRecovery();
   const until=performance.now()+30000;while(performance.now()<until&&!errors.length&&!surface.grassStatus.visible){surface.render();await new Promise(resolve=>setTimeout(resolve,16));}surface.render();await surface.renderer.backend.device.queue.onSubmittedWorkDone();if(errors.length||!surface.grassStatus.visible||surface.grassStatus.suspended)throw Error('Recovery failed '+errors.join('\n'));result.recovery={sequence:surface.stream.status().sequence,grass:surface.grassStatus};
  }
  self.postMessage({image,...(retiredImage?{retiredImage}:{}),...result});
 }catch(error){self.postMessage({ok:false,error:String(error.stack??error)});}finally{await surface?.dispose();world?.dispose();terrain.port2.close();presentation.port2.close();}
};

// Replay a real native physical boundary into a replacement product surface.
// The worker remains at one native instant: locomotion/blocked-preparer
// acceptance is deliberately separate from this resource-recovery check.
async function auditNativeWorldReplay(data){
 const {createSpatialGameSession}=await import('../../src/world/wild-engine/spatial-game-session.js'),
  {createSpatialIntentBridge}=await import('../../src/world/wild-engine/spatial-intent-bridge.js'),
  {createNativeIntentControlCohort}=await import('../../src/simulation/native-intent-control-cohort.js'),
  {createRemoteWebGpu}=await import('../../src/rendering/remote-webgpu-client.js');
 let terrainPublisher,spatial,cohort,surface,remote,oldSurface,oldRemote,autoRecovery;const errors=[],createdResources=[],ports=[],now=()=>performance.timeOrigin+performance.now();
 try{
  const response=await fetch('/tests/fixtures/desierto983-d15-partial-state.json.gz'),body=response.headers.get('content-encoding')?.includes('gzip')?response.body:response.body.pipeThrough(new DecompressionStream('gzip')),state=deserialize(await new Response(body).text()),template=structuredClone(state.workers[0]);
  state.workers=[];state.tasks=[];state.plants=[];state.crates=[];state.spells=[];state.raid=null;state.structures=[];state.elapsed=10;state.pauses=['qa-native-replay'];
  state.villages=state.villages.slice(0,1);
  const module=await WebAssembly.compile(await (await fetch(wasmUrl)).arrayBuffer()),loaded=new Map();
  spatial=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:p=>loaded.set(`${p.cx},${p.cz}`,p)});
  for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){if(spatial.core.selectChunk(x,z)<0)spatial.core.addChunk(x,z);loaded.set(`${x},${z}`,spatial.core.chunkPayload());}
  spatial.core.setSettlement(20,30,20,20);for(const key of loaded.keys()){const [x,z]=key.split(',').map(Number);spatial.core.selectChunk(x,z);loaded.set(key,spatial.core.chunkPayload());}
  const actorId=Number(template.id.split('-').at(-1)),origin={x:20.05,z:24},end={x:20.05,z:36};state.workers=[{...template,...origin,path:[],radius:.28,status:'returning',taskId:null,recovering:false,incapacitated:false}];
  const bridge=createSpatialIntentBridge(spatial);bridge.resetFromState(state);const w=spatial.core.wasm;spatial.actorSectorRevision({worker:true});
  const ptr=w.nav_intent_attack_route_input_ptr(1);new Float32Array(w.memory.buffer,ptr,2).set([end.x,end.z]);if(w.nav_intent_restore_home(actorId,origin.x,origin.z,end.x,end.z,1)!==1)throw Error('Native replay route unavailable');
  const prepared=bridge.prepareNativeRouteMotion(bridge.intentChanges().at(-1).routeHandle,{radius:.28});
  if(prepared.status!=='prepared'||w.spatial_body_upsert(1,origin.x,origin.z,.28,0,1)!==1||bridge.reserveNativeRoute(prepared.routeHandle,1).status!=='reserved'||bridge.beginNativeRouteExecution().status!=='started'||bridge.commitNativeCausalClock().status!=='committed')throw Error('Native replay execution unavailable');
  cohort=createNativeIntentControlCohort({observe:bridge.observeNativeIntentControl});
  const gpu=async index=>{const port=index?data.resourceNext:data.resource,control=index?data.controlNext:data.control;ports.push(control);const observed=data.nativeDelta?{postMessage(message,transfer){if(message.type==='create')createdResources.push({id:message.id,method:message.method,label:message.descriptor?.label??null});port.postMessage(message,transfer);},set onmessage(fn){port.onmessage=fn;},get onmessage(){return port.onmessage;},set onmessageerror(fn){port.onmessageerror=fn;},start(){port.start();},close(){port.close();}}:port;const creating=createRemoteWebGpu({port:observed,onError:e=>errors.push(String(e.stack??e))}),attached=cohort.attach(control,'ground-native');const value=await creating;await attached;return value;};
  const makeSurface=async(gpu,sequence=0,checkpoint=null)=>{
   const terrain=new MessageChannel(),presentation=new MessageChannel();ports.push(terrain.port2,presentation.port2);
   const view=await createWebGpuWorldSurface({canvas:gpu.canvas,remoteGpu:gpu,session:'ground-native',terrainPort:terrain.port1,presentationPort:presentation.port1,
    snapshot:checkpoint?.snapshot??serializeConfirmedState(state),initialSequence:sequence,width:512,height:512,quality:'muy_baja',experimentalAllActors:true,
    presentationRecovery:true,presentationWorkRecovery:true,experimentalTimelineRecovery:!!checkpoint,
    presentationCapabilities:{causalInputs:true,coordinatedChunks:true,cameraTerrain:true},experimentalTemporalPresentation:{product:true,checkpoints:true,maxPublications:16,maxBytes:50000000,maxHistory:128,maxHistoryBytes:50000000},
    camera:{x:origin.x,y:spatial.core.surface(origin.x,origin.z)+10,z:origin.z+.1,targetX:origin.x,targetY:spatial.core.surface(origin.x,origin.z)+1,targetZ:origin.z},onError:e=>errors.push(String(e.stack??e)),onResourceError:(kind,e)=>errors.push(kind+': '+String(e.stack??e))});
   return {view,terrain:terrain.port2,presentation:presentation.port2};
  };
  const render=async()=>{remote.beginFrame({nativeWorldBoundary:surface.nativeWorldBoundary});if(!surface.render()){remote.cancelFrame();return false;}await remote.endFrame(surface.remoteFrameMetadata());return true;},
   chunks=()=>[...loaded.values()].map(p=>({...p,capturedAt:10}));
  remote=await gpu(0);let channels=await makeSurface(remote);surface=channels.view;let id=0;
  const send=async(sequence,values,metadata)=>{
   channels.terrain.postMessage({kind:'terrainHello',session:'ground-native',epoch:'e',version:1});
   channels.terrain.postMessage({kind:'terrainBatchBegin',session:'ground-native',epoch:'e',sequence,id:++id,count:values.length,bytes:values.reduce((n,p)=>n+estimateRetainedBytes(p),0)});
   for(const p of values)channels.terrain.postMessage({kind:'terrain',session:'ground-native',epoch:'e',sequence,id:++id,revision:sequence===0?1:2,payload:p});
   channels.terrain.postMessage({kind:'terrainBatchEnd',session:'ground-native',epoch:'e',sequence,id:++id});
   if(sequence)channels.presentation.postMessage({kind:'publication',session:'ground-native',publication:{session:'ground-native',sequence,elapsed:10,physicsPose:null,snapshot:serializeConfirmedState(state),events:[],...(metadata?{nativeWorldResources:[metadata]}:{})}});
  };
  channels.presentation.postMessage({kind:'presentationTimelineReady',session:'ground-native',version:1});
  if(data.nativeDelta){const {createTerrainPublication}=await import('../../src/simulation/terrain-publication.js');terrainPublisher=createTerrainPublication({port:channels.terrain,session:'ground-native',epoch:'e',retainRevisions:true});for(const p of chunks())terrainPublisher.stage(p,10);terrainPublisher.commit(0);}else await send(0,chunks());
  const until=performance.now()+90000;while(performance.now()<until&&!errors.length){surface.timelinePump.advance();await render();if(surface.residency.size===loaded.size&&surface.workerRoster.status().ready===1)break;await new Promise(resolve=>setTimeout(resolve,16));}
  if(errors.length||surface.workerRoster.status().ready!==1||surface.residency.size!==loaded.size)throw Error('Native replay bootstrap failed '+errors.join('\n'));
  // Advance only the presentation sequence; native time and worker pose stay 10.
  if(data.nativeDelta)terrainPublisher.commit(1);else{ channels.terrain.postMessage({kind:'terrainBatchBegin',session:'ground-native',epoch:'e',sequence:1,id:++id,count:0,bytes:0});channels.terrain.postMessage({kind:'terrainBatchEnd',session:'ground-native',epoch:'e',sequence:1,id:++id});}
  channels.presentation.postMessage({kind:'publication',session:'ground-native',publication:{session:'ground-native',sequence:1,elapsed:10,physicsPose:null,snapshot:serializeConfirmedState(state),events:[]}});
  const sequenceDeadline=performance.now()+30000;while(surface.stream.status().sequence<1&&!errors.length&&performance.now()<sequenceDeadline){surface.timelinePump.advance();await new Promise(resolve=>setTimeout(resolve,16));}
  if(surface.stream.status().sequence!==1||errors.length)throw Error('Native replay initial publication did not become ready');
  if(data.nativeDelta){
   const wait=async predicate=>{const deadline=performance.now()+30000;while(!predicate()&&!errors.length&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,4));if(!predicate()||errors.length)throw Error('Native prepared delta wait failed '+errors.join('\n'));};
   await wait(()=>terrainPublisher.status().window?.batches===0);
   for(let n=0;n<3;n++){await render();await new Promise(resolve=>setTimeout(resolve,16));}
   const renderer=surface.renderer,device=renderer.backend.device,scene=surface.scene,actor=surface.workerRoster.get(template.id),root=actor.root,
    unchanged=surface.residency.get(0,1),unchangedGeometry=unchanged.geometry,unchangedBiome=surface.biomeProps.status().chunks,
    before=remote.inspect(),beforeGpu=await remote.inspectAsync(),mutations=[],resourceTypes=()=>Object.fromEntries([...new Set(createdResources.map(r=>r.method))].sort().map(method=>[method,createdResources.filter(r=>r.method===method).length])),gpuBuffers=()=>Object.fromEntries([...Object.entries(unchangedGeometry.attributes),['index',unchangedGeometry.index]].map(([name,value])=>[name,renderer.backend.get(value).buffer?.__remoteGpuId??null])),beforeTypes=resourceTypes(),beforeBuffers=gpuBuffers();
   for(const [sequence,mutation] of [[2,{type:'removeChunks',chunks:[[-1,-1]],releaseOnly:true}],[3,{type:'addChunk',cx:-1,cz:-1}]]){
    let proposed,preparedAt,resourceReadyAt,committedAt,typesReady,quiesceRequestedAt,drainedAt,blockedPreparation=null;
    const quiesce=cohort.quiesceGpuForMutation;cohort.quiesceGpuForMutation=async()=>{quiesceRequestedAt=now();const receipt=await quiesce();drainedAt=now();return receipt;};
    const result=await bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>cohort,mutation,prepareResources:async request=>{
     proposed=request.proposedWorldBoundary;preparedAt=now();
     const handle=await terrainPublisher.prepareNativeWorldResources(request);resourceReadyAt=now();typesReady=resourceTypes();
     if(sequence===3){const before=await remote.inspectAsync(),worldBefore=bridge.nativeWorldResourceBoundary(),started=performance.now();while(performance.now()-started<500){}const after=await remote.inspectAsync();blockedPreparation={durationMs:performance.now()-started,nativeFrames:after.consumer.nativeFrames-before.consumer.nativeFrames,worldBefore,worldAfter:bridge.nativeWorldResourceBoundary(),holdBefore:before.consumer.nativeMutationHold,holdAfter:after.consumer.nativeMutationHold};if(blockedPreparation.nativeFrames<3||blockedPreparation.holdBefore!==null||blockedPreparation.holdAfter!==null||worldBefore.ticket!==blockedPreparation.worldAfter.ticket)throw Error('Blocked proposal stopped old-world GPU draws or became physically effective');}

     return {valid:handle.valid,abort:handle.abort,commit(value){
      committedAt=now();for(const p of value.resources.chunks)terrainPublisher.stage(p,value.worldBoundary.effectiveTime);for(const p of value.resources.removed)terrainPublisher.stage({authority:'spatial-wasm',...p,removed:true},value.worldBoundary.effectiveTime);
      return handle.commit(value);
     }};
    }});
    cohort.quiesceGpuForMutation=quiesce;
    if(result.status!=='committed')throw Error('Native prepared delta mutation failed '+JSON.stringify(result));
    terrainPublisher.commit(sequence);
    channels.presentation.postMessage({kind:'publication',session:'ground-native',publication:{session:'ground-native',sequence,elapsed:10,physicsPose:null,snapshot:serializeConfirmedState(state),events:[],terrainChanged:true,nativeWorldResources:[{version:1,kind:result.resources.kind,worldBoundary:result.worldBoundary,chunks:result.resources.chunks.map(({cx,cz})=>({cx,cz})),removed:result.resources.removed}]}});
    await wait(()=>surface.terrain.ready(sequence));surface.timelinePump.advance();
    if(surface.stream.status().sequence!==sequence||surface.nativeWorldBoundary?.ticket!==result.worldBoundary.ticket||surface.residency.get(0,1)!==unchanged||unchanged.geometry!==unchangedGeometry||surface.renderer!==renderer||renderer.backend.device!==device||surface.scene!==scene||surface.workerRoster.get(template.id).root!==root)throw Error('Native delta replaced an unchanged product owner');
    for(let n=0;n<3;n++){await render();await new Promise(resolve=>setTimeout(resolve,16));}await wait(()=>terrainPublisher.status().window.batches===0);
    mutations.push({sequence,mutation,proposed,world:result.worldBoundary,preparationMs:resourceReadyAt-preparedAt,readyBeforePhysicalCommitMs:committedAt-resourceReadyAt,drainMs:drainedAt-quiesceRequestedAt,physicalCommitAndProjectionMs:committedAt-drainedAt,...(blockedPreparation?{blockedPreparation}:{}),resident:surface.residency.size,resourcesCreated:remote.inspect().resourcesCreated,resourceTypesReady:typesReady,resourceTypesAfter:resourceTypes()});
   }
   await remote.device.queue.onSubmittedWorkDone();const inspection=await remote.inspectAsync();if(JSON.stringify(gpuBuffers())!==JSON.stringify(beforeBuffers)||inspection.consumer.gpuErrors||errors.length)throw Error('Native delta GPU errors or changed unchanged buffers '+errors.join('\n'));
   const captured=new Promise(resolve=>{const timer=setTimeout(resolve,10000);self.onmessage=({data})=>{if(data.nativeReplayCaptured){clearTimeout(timer);resolve();}};});
   self.postMessage({ok:true,backend:'WebGPU',adapter:inspection.consumer.adapterInfo,mode:'prepared-native-delta',before:{resourcesCreated:before.resourcesCreated,resourceTypes:beforeTypes,unchangedGpuBuffers:beforeBuffers,frames:beforeGpu.consumer.nativeFrames,biomeChunks:unchangedBiome},after:{resourcesCreated:remote.inspect().resourcesCreated,resourceTypes:resourceTypes(),unchangedGpuBuffers:gpuBuffers(),bufferForks:inspection.consumer.bufferForks??0,bindingForks:inspection.consumer.bindingForks,frames:inspection.consumer.nativeFrames,resident:surface.residency.size},mutations,sameRenderer:true,sameDevice:true,sameScene:true,sameWorkerRoot:true,unchangedTerrainMesh:true,unchangedTerrainGeometry:true,preparedWorld:surface.nativeWorldBoundary,requiredWorld:remote.requiredNativeWorldBoundary(),gpuErrors:inspection.consumer.gpuErrors,errors,scope:'Real native precommit resource proposal through the existing terrain channel and real product surface owners, one GPU device/draw Worker. Removal/readmission of one chunk; one stationary worker. No ordinary gameplay activation, blocked-preparer locomotion or no-stutter acceptance.'});await captured;return;
  }
  const first=await bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>cohort,mutation:{type:'addChunk',cx:4,cz:4}});if(first.status!=='committed')throw Error('Native checkpoint commit failed '+JSON.stringify(first));
  const checkpoint={session:'ground-native',sequence:1,elapsed:10,physicsPose:null,snapshot:serializeConfirmedState(state),terrainCheckpoint:{sequence:1,chunks:chunks(),nativeWorldBoundary:bridge.nativeWorldResourceBoundary(),terrainManifest:{epoch:'e',chunks:[...loaded.values()].map(({cx,cz})=>({cx,cz,revision:1}))}},presentationCheckpoint:(()=>{try{return surface.captureTemporalPresentationCheckpoint(1);}catch(error){throw Error(error.message+' '+JSON.stringify({stream:surface.stream.status(),source:state.elapsed,presentation:surface.presentationClock,surface:surface.state.elapsed,errors}));}})(),workCheckpoint:{version:1,sequence:1,elapsed:10,effects:[]}};
  const second=await bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>cohort,mutation:{type:'removeChunks',chunks:[[4,4]],releaseOnly:true}});if(second.status!=='committed')throw Error('Native replay mutation failed '+JSON.stringify(second));
  const replay={sequence:2,terrain:[{chunks:[{authority:'spatial-wasm',cx:4,cz:4,removed:true,capturedAt:10}],terrainManifest:{epoch:'e',chunks:[{cx:4,cz:4,revision:2,removed:true}]}}],publication:{session:'ground-native',sequence:2,elapsed:10,physicsPose:null,snapshot:serializeConfirmedState(state),events:[],nativeWorldResources:[{version:1,kind:7,worldBoundary:second.worldBoundary,chunks:[],removed:second.resources.removed}]}};
  let obsolete=null;
  const recoveryCalls=[];
  if(data.nativeObsolete){
   const probe=remote.device.createBuffer({size:4,usage:9});remote.beginFrame({nativeWorldBoundary:surface.nativeWorldBoundary});
   remote.device.queue.writeBuffer(probe,0,new Uint32Array([123]));surface.render();
   try{await remote.endFrame(surface.remoteFrameMetadata());throw Error('Obsolete frame was accepted');}catch(error){if(error.code!=='remote-frame-native-mutation-obsolete')throw error;obsolete={code:error.code,resourcePreparationsRetained:error.resourcePreparationsRetained===true};}
   await probe.mapAsync(1);obsolete.discardedUpload=new Uint32Array(probe.getMappedRange())[0];probe.unmap();
   if(!obsolete.resourcePreparationsRetained){remote.device.queue.writeBuffer(probe,0,new Uint32Array([123]));await probe.mapAsync(1);obsolete.controlUpload=new Uint32Array(probe.getMappedRange())[0];probe.unmap();}else obsolete.controlUpload=null;probe.destroy();
   if(obsolete.discardedUpload!==0||!obsolete.resourcePreparationsRetained&&obsolete.controlUpload!==123)throw Error('Obsolete frame upload isolation failed');
  }
  const recoverSurface=async()=>{
   oldSurface=surface;oldRemote=remote;surface=null;remote=await gpu(1);await oldSurface.dispose();oldSurface=null;oldRemote=null;
   channels=await makeSurface(remote,1,checkpoint);surface=channels.view;await surface.restoreTimelineCheckpoint(checkpoint);
   const intermediate=surface.nativeWorldBoundary;if(intermediate.ticket!==first.worldBoundary.ticket)throw Error('Prepared checkpoint identity lost');
   if((await remote.inspectAsync()).consumer.nativeFrames!==0)throw Error('Hidden checkpoint was presented before replay');
   await surface.applyTimelineRecoveryBoundary(replay);if(surface.nativeWorldBoundary.ticket!==second.worldBoundary.ticket||surface.residency.get(4,4))throw Error('Native replay identity/resources mismatch');
   if(!surface.finishTimelineRecovery())throw Error('Native replay not ready');for(let frame=0;frame<3;frame++){await render();await new Promise(resolve=>setTimeout(resolve,32));}await remote.device.queue.onSubmittedWorkDone();return await remote.inspectAsync();
  };
  let inspection;
  if(obsolete){
   const {createWebGpuAutoRecovery}=await import('../../src/app/webgpu-auto-recovery.js');let resolveRecovery,rejectRecovery;
   const recovered=new Promise((resolve,reject)=>{resolveRecovery=resolve;rejectRecovery=reject;});
   autoRecovery=createWebGpuAutoRecovery({historicalRecovery:true,isCurrent:()=>true,markLost:async()=>{recoveryCalls.push('mark-lost');},recover:async()=>{recoveryCalls.push('fresh-surface');inspection=await recoverSurface();resolveRecovery();},onError:rejectRecovery});
   const error=Object.assign(Error('obsolete native frame'),{code:obsolete.code});
   if(!autoRecovery.trigger(error)||!autoRecovery.trigger(error))throw Error('Native frame recovery did not coalesce');await recovered;
   if(recoveryCalls.join(',')!=='mark-lost,fresh-surface')throw Error('Native frame recovery replayed the old renderer');
  }else inspection=await recoverSurface();
  const actor=surface.workerRoster.get(template.id),transferred=cohort.connections();
  if(inspection.consumer.gpuErrors||inspection.consumer.nativeFrames<1||!actor||errors.length)throw Error('Native replay presentation failed '+errors.join('\n'));
  const captured=new Promise(resolve=>{const timer=setTimeout(resolve,10000);self.onmessage=({data})=>{if(data.nativeReplayCaptured){clearTimeout(timer);resolve();}};});
  self.postMessage({ok:true,backend:'WebGPU',adapter:inspection.consumer.adapterInfo,checkpointWorld:first.worldBoundary,replayWorld:second.worldBoundary,preparedWorld:surface.nativeWorldBoundary,requiredWorld:remote.requiredNativeWorldBoundary(),
   ...(obsolete?{obsolete,recoveryCalls,recoveryScope:'Production auto coordinator with an injected markLost callback; no main UI or authority journal handoff in this harness',replacementResources:remote.inspect().resourcesCreated}:{}),sequence:surface.stream.status().sequence,resident:surface.residency.size,workers:surface.workerRoster.status(),workerPosition:actor.root.position.toArray(),workerVisible:actor.root.visible,terrainHeight:surface.residency.surface(origin.x,origin.z),workerBounds:await(async()=>{const {Box3,Vector3,Raycaster}=await import('three');actor.root.updateWorldMatrix(true,true);const box=new Box3().setFromObject(actor.root),center=box.getCenter(new Vector3());const ray=new Raycaster(surface.camera.position,center.clone().sub(surface.camera.position).normalize());const hits=ray.intersectObject(surface.scene,true).slice(0,4).map(h=>({name:h.object.name,distance:h.distance,point:h.point.toArray()}));return {min:box.min.toArray(),max:box.max.toArray(),hits,ndc:center.project(surface.camera).toArray()};})(),workerMeshes:(()=>{let meshes=0;actor.root.traverse(o=>{if(o.isMesh)meshes++;});return meshes;})(),renderInfo:{...surface.renderer.info.render},camera:{position:surface.camera.position.toArray(),rotation:surface.camera.quaternion.toArray()},nativePose:bridge.sampleNativeRoute(prepared.routeHandle,10),draw:{frames:inspection.consumer.nativeFrames,packets:inspection.consumer.packets,gpuErrors:inspection.consumer.gpuErrors},handoff:transferred,errors,
   scope:'Real native commits, canonical checkpoints, prepared terrain/biome replay and product surface with one real stationary worker mesh through the production draw Worker. Time stays at 10; no native GPU locomotion or 500 ms stall acceptance.'});await captured;
 }catch(error){self.postMessage({ok:false,error:String(error.stack??error),errors});}
 finally{terrainPublisher?.dispose();autoRecovery?.dispose();await surface?.dispose().catch(()=>{});await oldSurface?.dispose().catch(()=>{});remote?.dispose();oldRemote?.dispose();cohort?.dispose();spatial?.dispose();for(const port of ports)port.close();}
}
