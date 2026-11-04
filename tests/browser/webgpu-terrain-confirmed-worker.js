import * as THREE from 'three';
import {createWebGpuWorldSurface} from '../../src/rendering/webgpu-world-surface.js';
import {observePresentationGameEvents} from '../../src/simulation/game.js';

let surface,stopEvents;const eventIds=[];
self.onmessage=async({data})=>{try{
 if(data.kind==='init'){
  const original=OffscreenCanvas.prototype.getContext;OffscreenCanvas.prototype.getContext=function(kind,...args){if(/^webgl/i.test(kind))throw Error('WebGL forbidden');return original.call(this,kind,...args);};
  surface=await createWebGpuWorldSurface({canvas:data.canvas,session:data.session,terrainPort:data.port,presentationPort:data.presentationPort??null,snapshot:data.snapshot??null,onError:error=>self.postMessage({kind:'error',message:error.message})});
  if(surface.state)stopEvents=observePresentationGameEvents(surface.state,event=>eventIds.push(event.id));
  surface.setCamera({x:data.cx*48+45,y:55,z:data.cz*48+55,targetX:data.cx*48,targetY:0,targetZ:data.cz*48});self.postMessage({kind:'ready',backend:'WebGPU'});
 }else if(data.kind==='confirm')surface.terrain.confirm(data.sequence);
 else if(data.kind==='status')self.postMessage({kind:'status',id:data.id,resident:surface.residency.size,waterResident:surface.residency.waterSize,receiver:surface.terrain.status(),stateStream:surface.stream?.status()??null,eventIds:[...eventIds],keys:data.keys.map(key=>{const [x,z]=key.split(',').map(Number),mesh=surface.residency.get(x,z);return {key,present:!!mesh,water:!!surface.residency.getWater(x,z),revision:mesh?.userData.spatialTerrainRevision??null};})});
 else if(data.kind==='capture'){
  const {scene,camera,renderer}=surface;scene.updateMatrixWorld(true);const target=new THREE.RenderTarget(512,512,{depthBuffer:true});renderer.setRenderTarget(target);await renderer.compileAsync(scene,camera);surface.render();const draws=renderer.info.render.drawCalls,pixels=await renderer.readRenderTargetPixelsAsync(target,0,0,512,512);let nonBackground=0;for(let i=0;i<pixels.length;i+=4)if(Math.abs(pixels[i]-pixels[0])+Math.abs(pixels[i+1]-pixels[1])+Math.abs(pixels[i+2]-pixels[2])>6)nonBackground++;renderer.setRenderTarget(null);target.dispose();self.postMessage({kind:'capture',id:data.id,draws,nonBackground});
 }else if(data.kind==='dispose'){stopEvents?.();surface.dispose();close();}
 }catch(error){self.postMessage({kind:'error',message:String(error?.stack??error)});}};
