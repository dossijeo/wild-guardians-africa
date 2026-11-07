import {createWebGpuWorldSurface} from '../../src/rendering/webgpu-world-surface.js';
import {createSpatialWorld} from '../../src/world/wild-engine/spatial-world.js';
import {deserialize} from '../../src/persistence/snapshots.js';
import {serializeConfirmedState} from '../../src/simulation/confirmed-live-state.js';
import {estimateRetainedBytes} from '../../src/simulation/retained-size.js';
import wasmUrl from '../../src/world/wild-engine/spatial-savanna.wasm?url';

self.onmessage=async({data})=>{
 let surface,world,terrain=new MessageChannel(),presentation=new MessageChannel();const errors=[];
 try{
  const original=OffscreenCanvas.prototype.getContext;OffscreenCanvas.prototype.getContext=function(kind,...args){if(/^webgl/i.test(kind))throw Error('WebGL forbidden');return original.call(this,kind,...args);};
  const response=await fetch('/tests/fixtures/manglares-123-d10-raid-state.json.gz'),body=response.headers.get('content-encoding')?.includes('gzip')?response.body:response.body.pipeThrough(new DecompressionStream('gzip')),state=deserialize(await new Response(body).text());
  // This surface test keeps occupancy but no active work/physics outside its one chunk.
  for(const worker of state.workers)worker.status='idle';state.tasks=[];state.raid=null;
  state.biome=data.biome;if(data.biome==='manglares'){state.mangroveNetwork=true;state.mangroveSettlementVersion=2;}else{delete state.mangroveNetwork;delete state.mangroveSettlementVersion;}if(data.daylight)state.time=100;
  const module=await WebAssembly.compile(await (await fetch(wasmUrl)).arrayBuffer());world=createSpatialWorld(module);world.generate(712,0,0,data.biome==='sabana'?'savanna':data.biome,data.biome==='manglares'?{mangroveNetwork:true}:{});const payload=world.chunkPayload();payload.instances=Array.from({length:20},()=>[]);const cameraView={x:15,y:data.biome==='gran-canon'?Math.max(...payload.terrain.positions.filter((_,i)=>i%3===1))+30:12,z:20,targetX:0,targetY:payload.terrain.positions[(24*49+24)*3+1],targetZ:0};
  surface=await createWebGpuWorldSurface({canvas:data.canvas,session:'ground',terrainPort:terrain.port1,presentationPort:presentation.port1,snapshot:serializeConfirmedState(state),width:512,height:512,experimentalMangroveGround:true,presentationCapabilities:{causalInputs:true,coordinatedChunks:true},experimentalTemporalPresentation:{product:true,maxPublications:8,maxBytes:50000000,maxHistory:64,maxHistoryBytes:50000000},camera:cameraView,onError:error=>errors.push(String(error.stack??error)),onResourceError:(kind,error)=>errors.push(kind+': '+String(error.stack??error))});
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
  const image=await data.canvas.convertToBlob({type:'image/png'}),result={ok:true,backend:'WebGPU',adapter:Object.fromEntries(["vendor","architecture","device","description"].map(key=>[key,surface.renderer.backend.device.adapterInfo?.[key]])),biome:data.biome,grass:surface.grassStatus,ground:surface.groundStatus,frames,unchangedPublications:3};
  if(data.biome==='manglares'&&data.daylight){
   const checkpoint={session:'ground',sequence:3,elapsed:state.elapsed,snapshot:serializeConfirmedState(state),terrainCheckpoint:{sequence:3,chunks:[payload],terrainManifest:{epoch:'e',chunks:[{cx:0,cz:0,revision:1}]}},presentationCheckpoint:surface.captureTemporalPresentationCheckpoint(3),workCheckpoint:{version:1,sequence:3,elapsed:state.elapsed,effects:[]}};
   await surface.dispose();terrain.port2.close();presentation.port2.close();terrain=new MessageChannel();presentation=new MessageChannel();
   surface=await createWebGpuWorldSurface({canvas:new OffscreenCanvas(512,512),session:'ground',initialSequence:3,terrainPort:terrain.port1,presentationPort:presentation.port1,snapshot:checkpoint.snapshot,width:512,height:512,experimentalTimelineRecovery:true,presentationRecovery:true,presentationWorkRecovery:true,experimentalMangroveGround:true,presentationCapabilities:{causalInputs:true,coordinatedChunks:true},experimentalTemporalPresentation:{product:true,checkpoints:true,maxPublications:8,maxBytes:50000000,maxHistory:64,maxHistoryBytes:50000000},camera:cameraView,onError:error=>errors.push(String(error.stack??error)),onResourceError:(kind,error)=>errors.push(kind+': '+String(error.stack??error))});
   await surface.restoreTimelineCheckpoint(checkpoint);if(!surface.grassStatus.suspended||surface.grassStatus.visible!==0)throw Error('Recovery exposed premature cover');
   await surface.applyTimelineRecoveryBoundary({sequence:4,terrain:[],publication:{session:'ground',sequence:4,elapsed:state.elapsed,snapshot:checkpoint.snapshot,events:[]}});surface.finishTimelineRecovery();
   const until=performance.now()+30000;while(performance.now()<until&&!errors.length&&!surface.grassStatus.visible){surface.render();await new Promise(resolve=>setTimeout(resolve,16));}surface.render();await surface.renderer.backend.device.queue.onSubmittedWorkDone();if(errors.length||!surface.grassStatus.visible||surface.grassStatus.suspended)throw Error('Recovery failed '+errors.join('\n'));result.recovery={sequence:surface.stream.status().sequence,grass:surface.grassStatus};
  }
  self.postMessage({image,...result});
 }catch(error){self.postMessage({ok:false,error:String(error.stack??error)});}finally{await surface?.dispose();world?.dispose();terrain.port2.close();presentation.port2.close();}
};
