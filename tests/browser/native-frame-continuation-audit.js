import {createTerrainPublication} from '../../src/simulation/terrain-publication.js';
import {serializeConfirmedState} from '../../src/simulation/confirmed-live-state.js';

// Extension of the existing native product audit: the presentation and draw
// Workers are the real production modules. The relay delays a recording in
// transit without delaying the independent native control channel.
function transferables(value,result=new Set(),seen=new WeakSet()){
 if(!value||typeof value!=='object')return [...result];
 if(value instanceof ImageBitmap||value instanceof MessagePort||value instanceof ArrayBuffer){result.add(value);return [...result];}
 if(ArrayBuffer.isView(value)){if(value.buffer instanceof ArrayBuffer)result.add(value.buffer);return [...result];}
 if(seen.has(value))return [...result];seen.add(value);for(const item of Object.values(value))transferables(item,result,seen);return [...result];
}
function references(value,result=new Set()){
 if(!value||typeof value!=='object'||ArrayBuffer.isView(value)||value instanceof ArrayBuffer)return result;
 if(typeof value.__remoteGpuId==='string')result.add(value.__remoteGpuId);else for(const item of Object.values(value))references(item,result);return result;
}
function recording(packet,resources){
 const vertex=new Set(),writes=new Set();let passes=0;
 const visit=value=>{if(!value||typeof value!=='object'||ArrayBuffer.isView(value)||value instanceof ArrayBuffer)return;if(value.method==='setVertexBuffer')vertex.add(value.args[1]?.__remoteGpuId);if(value.method==='writeBuffer')writes.add(value.args[0]?.__remoteGpuId);if(value.method==='beginRenderPass')passes++;for(const item of Object.values(value))visit(item);};visit(packet.operations);
 const used=references(packet.operations),pending=[...used];while(pending.length){const id=pending.pop();for(const dependency of resources.get(id)?.dependencies??[])if(!used.has(dependency)){used.add(dependency);pending.push(dependency);}}
 return {readBuffers:[...used].filter(id=>resources.get(id)?.method==='createBuffer'),sequence:packet.sequence,world:packet.metadata.nativeWorldBoundary??null,cameraVersion:packet.metadata.cameraVersion,vertex:[...vertex].filter(Boolean),writes:[...writes].filter(Boolean),passes};
}

export async function auditNativeFrameContinuation({data,spatial,bridge,cohort,state,origin,loaded,errors}){
 const world=data.world,actual=data.resource,proxy=new MessageChannel(),terrain=new MessageChannel(),presentation=new MessageChannel(),events=[],created=[],rejections=[],packets=[];
 let publisher,serial=0,holdCamera=null,held=null;const queued=[],resources=new Map();
 const post=(port,message)=>port.postMessage(message,transferables(message));
 const failed=()=>events.find(e=>e.kind==='failure');
 const wait=async predicate=>{const deadline=performance.now()+90000;while(!predicate()&&!failed()&&!errors.length&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,4));if(failed()||errors.length||!predicate())throw Error('Native frame continuation failed '+JSON.stringify({failure:failed(),errors,last:events.slice(-3),held:held?.sequence}));};
 const flush=()=>{holdCamera=null;held=null;for(const message of queued.splice(0))post(actual,message);};
 const counts=()=>Object.fromEntries([...new Set(created.map(c=>c.method))].sort().map(method=>[method,created.filter(c=>c.method===method).length]));
 world.onmessage=({data:message})=>{if(events.length>=2000){errors.push('Unbounded audit events');return;}events.push(message);};world.start();
 proxy.port1.onmessage=({data:message})=>{
  if(message.type==='create'){created.push({id:message.id,method:message.method,label:message.descriptor?.label});resources.set(message.id,{method:message.method,dependencies:references(message.descriptor)});}else if(message.type==='view')resources.set(message.id,{dependencies:references(message.texture)});
  if(message.type==='frame'){const record=recording(message.packet,resources);packets.push(record);if(holdCamera!==null&&record.cameraVersion>=holdCamera&&!held)held=record;}
  if(held)queued.push(message);else post(actual,message);
 };proxy.port1.start();
 actual.onmessage=({data:message})=>{if(message.type==='frame-obsolete')rejections.push(message);post(proxy.port1,message);};actual.start();
 const inspect=async()=>{const id=++serial;world.postMessage({kind:'inspect',id});await wait(()=>events.some(e=>e.kind==='inspection'&&e.id===id));return events.find(e=>e.kind==='inspection'&&e.id===id);};
 const publish=sequence=>presentation.port2.postMessage({kind:'publication',session:'ground-native',publication:{session:'ground-native',sequence,elapsed:10,physicsPose:null,snapshot:serializeConfirmedState(state),events:[]}});
 const presented=sequence=>events.some(e=>e.kind==='rendered-frame'&&e.sequence===sequence);
 const ground=spatial.core.surface(origin.x,origin.z),camera={x:origin.x,y:ground+10,z:origin.z+.1,targetX:origin.x,targetY:ground+1,targetZ:origin.z};
 try{
  const attaching=cohort.attach(data.control,'ground-native');
  publisher=createTerrainPublication({port:terrain.port2,session:'ground-native',epoch:'e',retainRevisions:true});for(const p of loaded.values())publisher.stage(p,10);publisher.commit(0);
  world.postMessage({kind:'initialize',session:'ground-native',remoteGpuPort:proxy.port2,terrainPort:terrain.port1,presentationPort:presentation.port1,snapshot:serializeConfirmedState(state),initialSequence:0,width:512,height:512,quality:'muy_baja',experimentalAllActors:true,presentationInputs:true,presentationRecovery:true,presentationWorkRecovery:true,experimentalInspectWorkerState:true,presentationCapabilities:{causalInputs:true,coordinatedChunks:true,cameraTerrain:true},experimentalTemporalPresentation:{product:true,checkpoints:true,maxPublications:16,maxBytes:50000000,maxHistory:128,maxHistoryBytes:50000000},camera},[proxy.port2,terrain.port1,presentation.port1]);
  presentation.port2.postMessage({kind:'presentationTimelineReady',session:'ground-native',version:1});await attaching;await wait(()=>events.some(e=>e.kind==='firstFrame'));
  publisher.commit(1);publish(1);await wait(()=>presented(1));await wait(()=>publisher.status().window.batches===0);
  const before=await inspect();if(before.workers.ready!==1||before.resident!==9)throw Error('Native continuation requires the real resident world and worker mesh');const typesBefore=counts(),mutations=[];
  for(const [sequence,mutation] of [[2,{type:'removeChunks',chunks:[[-1,-1]],releaseOnly:true}],[3,{type:'addChunk',cx:-1,cz:-1}]]){
   const rejectionCount=rejections.length;let stale;
   const result=await bridge.mutateNativeWorldAfterGpuQuiescence({getPublication:()=>cohort,mutation,prepareResources:async request=>{
    const handle=await publisher.prepareNativeWorldResources(request);holdCamera=sequence;
    world.postMessage({kind:'camera',cameraVersion:sequence,camera:{...camera,x:camera.x+.1*sequence}});await wait(()=>held);stale=held;
    return {valid:handle.valid,abort:handle.abort,commit(value){for(const p of value.resources.chunks)publisher.stage(p,value.worldBoundary.effectiveTime);for(const p of value.resources.removed)publisher.stage({authority:'spatial-wasm',...p,removed:true},value.worldBoundary.effectiveTime);return handle.commit(value);}};
   }});
   if(result.status!=='committed')throw Error('Native continuation physical commit failed '+JSON.stringify(result));publisher.commit(sequence);
   presentation.port2.postMessage({kind:'publication',session:'ground-native',publication:{session:'ground-native',sequence,elapsed:10,physicsPose:null,snapshot:serializeConfirmedState(state),events:[],terrainChanged:true,nativeWorldResources:[{version:1,kind:result.resources.kind,worldBoundary:result.worldBoundary,chunks:result.resources.chunks.map(({cx,cz})=>({cx,cz})),removed:result.resources.removed}]}});
   flush();await wait(()=>presented(sequence));await wait(()=>publisher.status().window.batches===0);
   const after=await inspect(),fresh=packets.find(p=>p.sequence>stale.sequence&&p.world?.ticket===result.worldBoundary.ticket),rejected=rejections.slice(rejectionCount);
   if(after.phase!=='running'||after.inspectionGeneration!==before.inspectionGeneration||after.nativeWorldBoundary?.ticket!==result.worldBoundary.ticket||!fresh||rejected.length!==1||rejected[0].resourcePreparationsRetained!==true||after.drawExecution.consumer.gpuErrors)throw Error('Native continuation did not retain its production owner '+JSON.stringify({phase:after.phase,fresh,rejected,errors}));
   const preserved=stale.vertex.filter(id=>fresh.vertex.includes(id)),retainedOnly=stale.writes.filter(id=>!fresh.writes.includes(id)&&fresh.readBuffers.includes(id));if(!retainedOnly.length||!preserved.length||!stale.passes||fresh.passes<stale.passes)throw Error('Fresh product passes or original vertex buffers missing');
   mutations.push({sequence,mutation,world:result.worldBoundary,stale,fresh,retainedOnlyReadBuffers:retainedOnly,preservedVertexBuffers:preserved.length,rejected:{reason:rejected[0].reason,resourcePreparationsRetained:true},resourcesCreated:after.drawExecution.resourcesCreated,resourceTypes:counts()});
  }
  const after=await inspect();await new Promise(resolve=>setTimeout(resolve,64));
  const captured=new Promise(resolve=>{const timer=setTimeout(resolve,10000);self.onmessage=({data})=>{if(data.nativeReplayCaptured){clearTimeout(timer);resolve();}};});
  self.postMessage({ok:true,mode:'production-native-frame-continuation',backend:'WebGPU',adapter:after.drawExecution.consumer.adapterInfo,before:{inspectionGeneration:before.inspectionGeneration,resourcesCreated:before.drawExecution.resourcesCreated,resourceTypes:typesBefore},after:{inspectionGeneration:after.inspectionGeneration,resourcesCreated:after.drawExecution.resourcesCreated,resourceTypes:counts(),phase:after.phase,resident:after.resident,workers:after.workers,nativeWorldBoundary:after.nativeWorldBoundary,gpuErrors:after.drawExecution.consumer.gpuErrors},mutations,rejectedFrames:rejections.length,deviceReplacements:0,errors,scope:'Real production presentation and draw Workers with native authority fixture and prepared terrain channel. Two old frames delayed in transit until native physical commit, then fresh recording on the same owner. One stationary worker at native time 10; no ordinary gameplay activation or autonomous locomotion acceptance.'});await captured;
 }finally{
  publisher?.dispose();world.postMessage({kind:'dispose'});
  const deadline=performance.now()+10000;while((!events.some(e=>e.kind==='disposed')||cohort.connections().current?.drained!==true)&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,4));
  const disposed=events.some(e=>e.kind==='disposed')&&cohort.connections().current?.drained===true;proxy.port1.close();actual.close();presentation.port2.close();world.close();self.postMessage({nativeContinuationDisposed:disposed});
 }
}
