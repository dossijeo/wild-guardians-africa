import {createWebGpuWorldSurface} from './webgpu-world-surface.js';

// Experimental presentation worker; it cannot advance the simulation.
let phase='new',surface=null,frame=null,latestCamera=null,latestSize=null,firstFrame=false,actorTextured=false,actorTextureError=null;
function fail(error){if(phase==='closed'||phase==='failed')return;phase='failed';if(frame!==null)cancelAnimationFrame(frame);frame=null;surface?.dispose();surface=null;postMessage({kind:'failure',message:String(error?.stack??error)});}
function draw(){if(phase!=='running')return;try{surface.render();if(!firstFrame){firstFrame=true;postMessage({kind:'firstFrame'});}frame=requestAnimationFrame(draw);}catch(error){fail(error);}}
self.onmessage=async({data})=>{try{
 if(data?.kind==='initialize'){
  if(phase!=='new')throw Error('World worker already initialized');phase='initializing';
  const created=await createWebGpuWorldSurface({...data,onError:fail,onActorReady:actorId=>postMessage({kind:'actorReady',actorId}),onActorTextured:()=>{actorTextured=true;postMessage({kind:'actorTextured'});},onActorTextureError:error=>{actorTextureError=String(error?.message??error);postMessage({kind:'actorTextureError',message:actorTextureError});},onSettlementTextureError:error=>postMessage({kind:'settlementTextureError',message:String(error?.message??error)})});if(phase!=='initializing'){created.dispose();return;}surface=created;
  if(latestSize)surface.resize(latestSize.width,latestSize.height);if(latestCamera)surface.setCamera(latestCamera);else if(data.camera)surface.setCamera(data.camera);
  phase='running';frame=requestAnimationFrame(draw);postMessage({kind:'ready',backend:'WebGPU'});return;
 }
 if(data?.kind==='dispose'){if(frame!==null)cancelAnimationFrame(frame);frame=null;phase='closed';surface?.dispose();surface=null;close();return;}
 if(phase!=='initializing'&&phase!=='running')throw Error('World worker not running');
 if(data.kind==='inspect'){postMessage({kind:'inspection',id:data.id,phase,backend:surface?.renderer.backend?.isWebGPUBackend?'WebGPU':null,state:surface?.stream?.status()??null,terrain:surface?.terrain.status()??null,resident:surface?.residency.size??0,actor:!!surface?.animal,actors:surface?.animalRoster?.status()??null,workers:surface?.workerRoster?.status()??null,settlements:surface?.settlements?.status()??null,props:surface?.biomeProps?.status()??null,motion:surface?.motionFeed?.status()??null,actorTextured,actorTextureError});return;}
 if(import.meta.env.DEV&&data.kind==='qa-lose-device'){if(!surface?.renderer.backend?.device)throw Error('WebGPU device unavailable');surface.renderer.backend.device.destroy();return;}
 if(data.kind==='camera'){latestCamera=data.camera;if(surface)surface.setCamera(data.camera);postMessage({kind:'cameraAck'});return;}
 if(data.kind==='resize'){latestSize={width:data.width,height:data.height};if(surface)surface.resize(data.width,data.height);return;}
 throw Error('Unknown world worker message');
 }catch(error){fail(error);}};
