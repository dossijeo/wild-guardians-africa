import * as THREE from 'three/webgpu';
import {createGrassMaterial} from '../../src/labs/uber-grass/grass-original.js';
import {createSharedGrassMaterial} from '../../src/labs/uber-grass/grass-shared.js';

const result={errors:[],frames:[],scenes:[]};window.uberGrassResult=result;
try{
 const query=new URLSearchParams(location.search),shared=query.get('shared')==='1',swap=query.get('swap')==='1',bench=query.get('bench')==='1';
 const renderer=new THREE.WebGPURenderer({canvas:document.querySelector('#view'),antialias:false,trackTimestamp:bench});await renderer.init();if(!renderer.backend?.isWebGPUBackend)throw Error('Expected WebGPU');
 renderer._animation.stop();renderer.info.autoReset=false;
 if(bench){const init=renderer.backend.initTimestampQuery;renderer.backend.initTimestampQuery=function(type,uid,descriptor){if(!this.trackTimestamp){delete descriptor.timestampWrites;return;}return init.call(this,type,uid,descriptor);};}
 const device=renderer.backend.device;device.addEventListener('uncapturederror',event=>result.errors.push(event.error.message));device.pushErrorScope('validation');
 renderer.setSize(640,360,false);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
 const target=new THREE.RenderTarget(640,360,{depthBuffer:true,stencilBuffer:false});renderer.setRenderTarget(target);
 async function loadSnapshot(name){const response=await fetch(`/qa/uber-grass/${name}.json.gz`);if(!response.ok)throw Error(`Missing snapshot: ${response.status}`);let bytes=new Uint8Array(await response.arrayBuffer());if(bytes[0]===0x1f&&bytes[1]===0x8b)bytes=new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());return JSON.parse(new TextDecoder().decode(bytes));}
 const snapshots=await Promise.all(['grass-snapshot','grass-snapshot-river'].map(loadSnapshot)),modules=await (await fetch(snapshots[0].modulesUrl)).json();
 const textures=await Promise.all(snapshots.map(async snapshot=>{const tex=await new THREE.TextureLoader().loadAsync('/'+snapshot.terrain.base);tex.colorSpace=THREE.NoColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;tex.generateMipmaps=true;tex.anisotropy=8;tex.needsUpdate=true;return tex;}));
 const bank=shared?createSharedGrassMaterial(textures[0]):null,scenes=[];
 for(const [biome,snapshot] of snapshots.entries()){
  const scene=new THREE.Scene();scene.background=new THREE.Color('#b9c5cf');const c=snapshot.camera,camera=new THREE.PerspectiveCamera(c.fov,640/360,c.near,c.far);camera.coordinateSystem=renderer.coordinateSystem??THREE.WebGLCoordinateSystem;
  const matrix=new THREE.Matrix4().fromArray(snapshot.renderSpace.viewMatrix).invert();matrix.decompose(camera.position,camera.quaternion,camera.scale);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  const items=[],u=snapshot.uniforms;let instances=0,triangles=0;
  for(const [i,entry] of snapshot.geometries.entries()){
   const geometry=new THREE.InstancedBufferGeometry();for(const [name,a] of Object.entries(entry.attributes)){const Attribute=a.instanced?THREE.InstancedBufferAttribute:THREE.BufferAttribute;geometry.setAttribute(name,new Attribute(new Float32Array(a.array),a.itemSize,a.normalized));}geometry.setIndex(entry.index);geometry.instanceCount=entry.count;if(geometry.index.count!==modules[entry.module].index.length)throw Error('Topology mismatch');
   const options={texture:textures[swap?1-biome:biome],refined:entry.refined,spacing:u.uCoverageSpacing*.4,far:u.uCoverageFar,time:u.uCoverageTime,night:u.uNight,seed:u.uCoverageSeed,scale:u.uCoverageScale,windStrength:u.uCoverageWindStrength,nightLight:u.uNightLight,exposure:u.uExposure,lightDirection:u.uLightDir,pigmentTint:snapshot.biome==='gran-rio'?[.93,1.08,.84]:[1.14,1.09,.97]};
   const handle=shared?bank:await createGrassMaterial({backend:'webgpu',...options}),mesh=new THREE.Mesh(geometry,handle.material);if(shared)bank.bind(mesh,options);
   mesh.name=entry.name;mesh.matrixAutoUpdate=false;mesh.matrix.fromArray(snapshot.renderSpace.modelMatrices[i]);mesh.frustumCulled=false;mesh.visible=entry.count>0;scene.add(mesh);items.push({mesh,geometry,handle});instances+=entry.count;triangles+=entry.count*geometry.index.count/3;
  }
  scene.updateMatrixWorld(true);scenes.push({scene,camera,items,snapshot});result.scenes.push({biome:snapshot.biome,instances,triangles,materials:shared?1:items.length});
 }
 for(const [frame,step] of [{time:0,night:0},{time:1.25,night:0},{time:1.25,night:1},{time:2.5,night:1}].entries())for(const item of scenes){
  for(const {mesh,handle} of item.items)if(shared)handle.update(mesh,step.time,step.night);else{handle.setTime(step.time);handle.setNight(step.night);}
  renderer.info.reset();renderer._nodes.nodeFrame.update();renderer.info.frame=renderer._nodes.nodeFrame.frameId;renderer.render(item.scene,item.camera);const drawCalls=renderer.info.render.drawCalls,triangles=renderer.info.render.triangles;const pixels=Uint8Array.from(await renderer.readRenderTargetPixelsAsync(target,0,0,640,360));const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',pixels))).map(v=>v.toString(16).padStart(2,'0')).join('');let nonBackground=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]!==pixels[0]||pixels[i+1]!==pixels[1]||pixels[i+2]!==pixels[2])nonBackground++;
  result.frames.push({biome:item.snapshot.biome,frame,time:step.time,night:step.night,sha256:hash,nonBackground,pipelines:window.__pipelineCount??0,shaders:window.__shaderCount??0,drawCalls,triangles});
  const display=document.createElement('canvas');display.width=640;display.height=360;display.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(pixels),640,360),0,0);document.querySelector('#frames').append(`${item.snapshot.biome}: ${step.time} / ${step.night}`,display,document.createElement('br'));
 }
 if(bench){
  result.benchmarkReady=true;
  await new Promise(resolve=>{window.runUberGrassBenchmark=async()=>{try{
   const raf=()=>new Promise(done=>requestAnimationFrame(done)),interactive=[],gpu=[],supported=!!renderer.backend.trackTimestamp;
   const draw=(frame)=>{const start=performance.now(),item=scenes[frame%2],time=frame/60,night=(Math.floor(frame/60)%2);for(const {mesh,handle} of item.items)if(shared)handle.update(mesh,time,night);else{handle.setTime(time);handle.setNight(night);}renderer.info.reset();renderer._nodes.nodeFrame.update();renderer.info.frame=renderer._nodes.nodeFrame.frameId;const renderStart=performance.now();renderer.render(item.scene,item.camera);const end=performance.now();return {cpuRenderMs:end-renderStart,cpuTotalMs:end-start};};
   if(supported){await renderer.resolveTimestampsAsync('render');for(let i=0;i<55;i++){draw(i);const pool=renderer.backend.timestampQueryPool.render,pairs=(pool?.currentQueryIndex??0)/2,unique=pool?.queryOffsets?.size??0,ended=pool?.queryStates?[...pool.queryStates.values()].filter(value=>value==='ended').length:pairs,valid=!!pool?.trackTimestamp&&pairs>0&&pairs===unique&&ended===pairs&&!pool.pendingResolve;if(valid){const ms=await renderer.resolveTimestampsAsync('render');if(i>=15)gpu.push(Number.isFinite(ms)&&ms>=0?ms:null);}else if(i>=15)gpu.push(null);}}
   renderer.backend.trackTimestamp=false;let previous=await raf();for(let i=0;i<210;i++){const now=await raf(),cpu=draw(i);if(i>=30)interactive.push({intervalMs:now-previous,...cpu});previous=now;}
   result.benchmark={interactive,gpu,supported,scope:'GPU samples are serialized render-pass sums; RAF run excludes GPU readback.',pipelines:window.__pipelineCount??0,shaders:window.__shaderCount??0};resolve();return result.benchmark;
  }catch(error){result.errors.push(String(error?.stack??error));resolve();throw error;}};});
 }
 await device.queue.onSubmittedWorkDone();const error=await device.popErrorScope();if(error)result.errors.push(error.message);result.backend='WebGPU real';result.shared=shared;result.swapped=swap;
 for(const scene of scenes)for(const item of scene.items){item.geometry.dispose();if(!shared)item.handle.dispose();}bank?.dispose();textures.forEach(texture=>texture.dispose());renderer.setRenderTarget(null);target.dispose();renderer.dispose();result.done=true;
}catch(error){result.errors.push(String(error?.stack??error));result.done=true;}
