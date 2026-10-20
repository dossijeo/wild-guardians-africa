import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {instrumentWebGPU} from './instrument.js';
import {groundGLB} from './plane.js';
import {optimizeWorld} from './optimize-world.js';
import {loadGrassSnapshot,loadGrassTexture,createThreeGrass,createFilamentGrass} from './grass.js';
const params=new URLSearchParams(location.search),backend=params.get('backend')??'filament',scenario=params.get('scenario')??'A';
const density=Number(params.get('density')??1),nativeInstancing=params.get('native')==='1';
const optimized=params.get('optimized')==='1';
const canvas=document.querySelector('canvas'),errors=[],started=performance.now();
window.benchErrors=errors;
addEventListener('error',event=>errors.push(String(event.error??event.message)));
addEventListener('unhandledrejection',event=>errors.push(String(event.reason)));
const json=async path=>{const r=await fetch(path);if(!r.ok)throw Error(`${path}: ${r.status}`);return r.json()};
const bytes=async path=>{const r=await fetch(path);if(!r.ok)throw Error(`${path}: ${r.status}`);return new Uint8Array(await r.arrayBuffer())};
const raf=()=>new Promise(requestAnimationFrame);
function stats(values){const v=[...values].sort((a,b)=>a-b),n=v.length;return {n,mean:v.reduce((a,b)=>a+b,0)/n,p50:v[Math.floor((n-1)*.5)],p95:v[Math.floor((n-1)*.95)],p99:v[Math.floor((n-1)*.99)]}}
function pose(actor,t){const angle=t*.2+actor.index,c=Math.cos(angle)*actor.normalization[0],s=Math.sin(angle)*actor.normalization[0];return [c,0,-s,0,0,actor.normalization[0],0,0,s,0,c,0,actor.base[0]+Math.sin(t*.6+actor.index)*2,actor.normalization[1],actor.base[2],1]}
function cameraPose(t,snapshot){return snapshot?{eye:[snapshot.camera.position[0]+Math.sin(t*.6)*2,snapshot.camera.position[1],snapshot.camera.position[2]+Math.cos(t*.6)*2-2],target:snapshot.camera.target,fov:snapshot.camera.fov,near:snapshot.camera.near,far:snapshot.camera.far}:{eye:[58+Math.sin(t*.6)*12,48+Math.sin(t*.3)*4,68+Math.cos(t*.6)*8],target:[Math.sin(t*.25)*12,0,0],fov:48,near:.2,far:260}}
function chunkPose(name,t){const [,x,z]=name.split('-').map(Number),index=z*3+x,active=Math.floor(t/1.5)%9;return [1,0,0,0,0,1,0,0,0,0,1,0,(x-1)*32,index===active?.05*Math.sin(t):0,(z-1)*32,1]}
async function pngTexture(path){const blob=await(await fetch(path)).blob(),bitmap=await createImageBitmap(blob),c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;c.getContext('2d').drawImage(bitmap,0,0);bitmap.close();return new Uint8Array(await(await new Promise(resolve=>c.toBlob(resolve,'image/png'))).arrayBuffer())}
try{
 const snapshot=scenario==='C'?await loadGrassSnapshot():null;
 const fixture=snapshot?null:await json(`vendor/fixture-${scenario}.json`);
 let scene,camera,renderer,view,engine,swapChain,device,meter,world,grass,sun,loader;
 const assets=[],actors=[],mixers=[],chunks=[],owned=[];
 let metadata=fixture?.metadata,rendererIdentity;
 if(backend==='filament'){
  const adapter=await navigator.gpu?.requestAdapter({powerPreference:'low-power',forceFallbackAdapter:false});
  if(!adapter)throw Error('Hardware WebGPU unavailable');
  const info=adapter.info;if(info.isFallbackAdapter||/swiftshader|software|llvmpipe/i.test(info.description))throw Error('Software adapter rejected');
  const features=['timestamp-query','rg11b10ufloat-renderable','float32-filterable','float32-blendable','depth-clip-control','depth32float-stencil8','texture-compression-bc','texture-compression-etc2','texture-compression-astc'].filter(f=>adapter.features.has(f));
  const limits={};for(const key in adapter.limits)limits[key]=adapter.limits[key];
  device=await adapter.requestDevice({requiredFeatures:features,requiredLimits:limits});
  device.addEventListener('uncapturederror',e=>errors.push(e.error.message));
  meter=instrumentWebGPU(device);Filament.preinitializedWebGPUDevice=device;
  await new Promise(resolve=>Filament.init([],resolve));
  engine=Filament.Engine.create(canvas,{backend:Filament.Backend.WEBGPU});
  if(optimized)engine.setAutomaticInstancingEnabled(true);
  if(engine.getBackend().value!==Filament.Backend.WEBGPU.value)throw Error('Filament backend mismatch');
  scene=engine.createScene();camera=engine.createCamera(Filament.EntityManager.get().create());view=engine.createView();renderer=engine.createRenderer();swapChain=engine.createSwapChain();
  view.setScene(scene);view.setCamera(camera);view.setViewport([0,0,1280,720]);
  view.setMultiSampleAntiAliasingOptions({enabled:false,sampleCount:1,customResolve:false});
  view.setAntiAliasing(Filament.View$AntiAliasing.NONE);view.setDithering(Filament.View$Dithering.NONE);
  view.setAmbientOcclusion(Filament.View$AmbientOcclusion.NONE);view.setBloomOptions({enabled:false});
  view.setShadowType(Filament.View$ShadowType.PCF);view.setShadowingEnabled(!snapshot);
  camera.setExposure(16,1/125,100);
  rendererIdentity={vendor:info.vendor,architecture:info.architecture,isFallbackAdapter:info.isFallbackAdapter,features:[...device.features],automaticInstancing:engine.isAutomaticInstancingEnabled()};
  const tm=engine.getTransformManager();
  const load=async (data,count=0)=>{const instances=Array(count).fill(null),asset=count?loader.createInstancedAsset(data,instances):loader.createAsset(data);if(!asset)throw Error('Filament glTF import failed');await new Promise(resolve=>asset.loadResources(resolve,null,null,1));scene.addEntities(asset.getEntities());assets.push(asset);return {asset,instances}};
  if(snapshot){
   view.setPostProcessingEnabled(false);
   const textureHandle=await loadGrassTexture({url:snapshot.terrain.base,engine,Filament});owned.push(()=>textureHandle.dispose());
   grass=createFilamentGrass({engine,Filament,snapshot,density,texture:textureHandle.filamentTexture,materialBytes:await bytes(nativeInstancing?'vendor/grass-instanced.filamat':'vendor/grass.filamat'),nativeInstancing});scene.addEntities(grass.entities);metadata=grass.metadata;
  }else{
   loader=engine.createAssetLoader();world=(await load(await bytes(`vendor/world-${scenario}.glb`))).asset;
   for(let z=0;z<3;z++)for(let x=0;x<3;x++){const name=`chunk-${x}-${z}`;chunks.push({name,instance:tm.getInstance(world.getFirstEntityByName(name))})}
   for(const url of new Set(fixture.actorDescriptors.map(a=>a.url))){const descriptors=fixture.actorDescriptors.filter(a=>a.url===url),loaded=await load(await bytes(url),descriptors.length);loaded.instances.forEach((instance,i)=>actors.push({descriptor:descriptors[i],animator:instance.getAnimator(),transform:tm.getInstance(instance.getRoot())}));}
   sun=Filament.EntityManager.get().create();Filament.LightManager.Builder(Filament.LightManager$Type.DIRECTIONAL).color([1,1,1]).intensity(100000).direction([35,-60,-25]).castShadows(true).shadowOptions(Filament.shadowOptions({mapSize:1024,shadowCascades:1,shadowFar:160,stable:true})).build(engine,sun);scene.addEntity(sun);
  }
  window.applyFrame=(t,night,frame)=>{
   const cp=cameraPose(t,snapshot);camera.setProjectionFov(cp.fov,1280/720,cp.near,cp.far,Filament.Camera$Fov.VERTICAL);camera.lookAt(cp.eye,cp.target,[0,1,0]);
   renderer.setClearOptions({clearColor:night?[.008,.015,.038,1]:[.597,.658,.521,1],clear:true,discard:true});
   if(grass){grass.update(t,night,cp.eye);if(frame%30===0)grass.updatePartial(.01,Math.floor(frame/30));}
   else{const lm=engine.getLightManager(),li=lm.getInstance(sun),color=new THREE.Color(night?'#8095d6':'#fff0c7');lm.setColor(li,color.toArray());lm.setIntensity(li,100000*(night?.18/2.6:1));for(const a of actors){tm.setTransform(a.transform,pose(a.descriptor,t));a.animator.applyAnimation(a.descriptor.animation,t);a.animator.updateBoneMatrices()}if(scenario==='B')for(const c of chunks)tm.setTransform(c.instance,chunkPose(c.name,t));}
  };
 }else{
  renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'low-power'});renderer.setPixelRatio(1);renderer.setSize(1280,720,false);renderer.shadowMap.enabled=!snapshot;renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera();
  loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gl=renderer.getContext();rendererIdentity=gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL);
  if(/swiftshader|software|llvmpipe/i.test(rendererIdentity))throw Error('Software WebGL rejected');
  if(snapshot){const textureHandle=await loadGrassTexture({url:snapshot.terrain.base,THREE});owned.push(()=>textureHandle.dispose());renderer.outputColorSpace=THREE.LinearSRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;grass=createThreeGrass({THREE,snapshot,density,texture:textureHandle.threeTexture,nativeInstancing});scene.add(...grass.entities);metadata=grass.metadata;}
  else{
   world=(await loader.loadAsync(`vendor/world-${scenario}.glb`)).scene;scene.add(world);world.traverse(m=>{if(m.isMesh)m.castShadow=m.receiveShadow=true});
   if(optimized){const batch=optimizeWorld(world);owned.push(()=>batch.dispose());}
   for(let z=0;z<3;z++)for(let x=0;x<3;x++){const name=`chunk-${x}-${z}`;chunks.push({name,object:world.getObjectByName(name)})}
   for(const url of new Set(fixture.actorDescriptors.map(a=>a.url))){const source=await loader.loadAsync(url);for(const descriptor of fixture.actorDescriptors.filter(a=>a.url===url)){const root=cloneSkeleton(source.scene);root.matrixAutoUpdate=false;root.traverse(m=>{if(m.isMesh)m.castShadow=m.receiveShadow=true});scene.add(root);const mixer=new THREE.AnimationMixer(root);mixer.clipAction(source.animations[descriptor.animation]).play();actors.push({descriptor,root,mixer});}}
   sun=new THREE.DirectionalLight('#fff0c7',2.6);sun.position.set(-35,60,25);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-65,right:65,top:65,bottom:-65,near:1,far:160});sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=-.0002;scene.add(sun);
  }
  meter=instrumentGL(gl);
  window.applyFrame=(t,night,frame)=>{const cp=cameraPose(t,snapshot);camera.fov=cp.fov;camera.aspect=1280/720;camera.near=cp.near;camera.far=cp.far;camera.updateProjectionMatrix();camera.position.fromArray(cp.eye);camera.lookAt(...cp.target);scene.background=new THREE.Color(night?'#182137':'#cbd4bf');if(grass){grass.update(t,night,cp.eye);if(frame%30===0)grass.updatePartial(.01,Math.floor(frame/30));}else{sun.color.set(night?'#8095d6':'#fff0c7');sun.intensity=night?.18:2.6;for(const a of actors){a.root.matrix.fromArray(pose(a.descriptor,t));a.root.matrixWorldNeedsUpdate=true;a.mixer.setTime(t)}if(scenario==='B')for(const c of chunks){c.object.matrix.fromArray(chunkPose(c.name,t));c.object.matrix.decompose(c.object.position,c.object.quaternion,c.object.scale)}}scene.updateMatrixWorld(true);};
 }
 const initializedMs=performance.now()-started;
 function draw(){if(engine)renderer.render(swapChain,view);else renderer.render(scene,camera)}
 window.bench={backend,scenario,density,nativeInstancing,optimized,metadata,rendererIdentity,initializedMs,errors,
  async run({night=0,warmup=90,frames=240,samples=40}={}){
   const interactive=[],timed=[],presented=[];
   for(let i=0;i<warmup;i++){await raf();window.applyFrame(i/60,night,i);draw()}
   let last=await raf(),lastPresented=last;
   for(let i=0;i<frames;i++){const now=await raf(),interval=now-last;last=now;meter.beginFrame({timed:false});let t=performance.now();window.applyFrame(i/60,night,i);const updateMs=performance.now()-t;t=performance.now();draw();const submitMs=performance.now()-t;const command=await meter.endFrame();const accepted=backend==='three'||command.submits>0;const record={interval,updateMs,submitMs,...command,drawCalls:command.drawCalls??command.draws,accepted};interactive.push(record);if(accepted){presented.push({...record,interval:now-lastPresented});lastPresented=now;}if(errors.length)throw Error(errors.slice(0,3).join('\n'));}
   let attempts=0,valid=0;while(valid<20+samples&&attempts<(20+samples)*30){await raf();meter.beginFrame({timed:true});window.applyFrame(attempts/60,night,attempts);draw();const sample=await meter.endFrame();attempts++;if(Number.isFinite(sample.gpuMs)){if(valid>=20)timed.push(sample);valid++;}if(errors.length)throw Error(errors.slice(0,3).join('\n'));}
   if(timed.length!==samples)throw Error(`Only ${timed.length}/${samples} valid GPU frames`);
   const result={backend,scenario,density,nativeInstancing,optimized,night,metadata,rendererIdentity,initializedMs,interactive,timed,errors:[...errors],
    summary:{frametime:stats(presented.map(x=>x.interval)),rafInterval:stats(interactive.map(x=>x.interval)),cpuUpdate:stats(interactive.map(x=>x.updateMs)),cpuSubmit:stats(presented.map(x=>x.submitMs)),gpu:stats(timed.map(x=>x.gpuMs).filter(Number.isFinite)),fps:1000*presented.length/interactive.reduce((n,s)=>n+s.interval,0),rafFps:1000*frames/interactive.reduce((n,s)=>n+s.interval,0),acceptedFrames:presented.length,skippedFrames:frames-presented.length,drawCalls:stats(presented.map(x=>x.drawCalls)),triangles:stats(presented.map(x=>x.triangles))},
    memory:{js:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize}:null,wasm:engine?Filament.HEAPU8.byteLength:0,gpu:meter.stats(),three:engine?null:renderer.info.memory},resources:performance.getEntriesByType('resource').map(r=>({url:r.name,bytes:r.decodedBodySize,transfer:r.transferSize,ms:r.duration}))};
   return result;
  },
  async capture(t=1,night=0){for(let attempt=0;attempt<60;attempt++){await raf();meter.beginFrame({timed:false});window.applyFrame(t,night,60);draw();const frame=await meter.endFrame();if(backend==='three'||frame.submits>0){await raf();return {errors:[...errors]};}}throw Error('Capture failed to submit a frame');},
  async rawCadence({frames=300,warmup=120,night=0}={}){
   // Separate validation after instrumented runs. This method ends instrumentation.
   meter.dispose();const rows=[];let last=0,lastAccepted=0;
   for(let i=-warmup;i<frames;i++){const now=await raf();if(i===0)lastAccepted=now;const interval=last?now-last:0;last=now;window.applyFrame(Math.max(0,i)/60,night,Math.max(0,i));let accepted=true;const start=performance.now();if(engine){accepted=renderer.beginFrame(swapChain);if(accepted){renderer.renderView(view);renderer.endFrame()}engine.execute()}else draw();const submitMs=performance.now()-start;if(i>=0){rows.push({interval,accepted,submitMs,presentedInterval:accepted?now-lastAccepted:null});if(accepted)lastAccepted=now;}}
   const accepted=rows.filter(r=>r.accepted);return {backend,scenario,night,frames,accepted:accepted.length,fps:1000*accepted.length/rows.reduce((s,r)=>s+r.interval,0),frametime:stats(accepted.map(r=>r.presentedInterval)),cpuSubmit:stats(accepted.map(r=>r.submitMs)),errors:[...errors],rows};
  },
  async resourceProbe(){
   const partial=[],creation=[],destruction=[];
   if(grass)for(let i=0;i<40;i++){const start=performance.now(),bytes=grass.updatePartial(.01,i);partial.push({ms:performance.now()-start,bytes});}
   const buffer=groundGLB();const probeLoader=engine?engine.createAssetLoader():loader;
   for(let i=0;i<12;i++){let start=performance.now(),asset;if(engine){asset=probeLoader.createAsset(buffer);await new Promise(resolve=>asset.loadResources(resolve,null,null,1));scene.addEntities(asset.getEntities());}else{asset=await loader.parseAsync(buffer.buffer,'');scene.add(asset.scene)}creation.push(performance.now()-start);if(engine)engine.execute();else draw();start=performance.now();if(engine){scene.removeEntities(asset.getEntities());probeLoader.destroyAsset(asset);engine.execute()}else{scene.remove(asset.scene);asset.scene.traverse(m=>{m.geometry?.dispose();m.material?.dispose()})}destruction.push(performance.now()-start);}
   if(engine){probeLoader.delete();await device.queue.onSubmittedWorkDone()}
   return {backend,scenario,density,nativeInstancing,partial,creation,destruction,summary:{partialMs:partial.length?stats(partial.map(x=>x.ms)):null,partialBytes:partial[0]?.bytes??null,creationMs:stats(creation.slice(2)),destructionMs:stats(destruction.slice(2))},scope:'Ground glTF resource cycle (4 vertices,2 triangles); first two cycles discarded. Grass 1% persistent updates. API CPU time; allocation reclamation may be deferred.',errors:[...errors]};
  },
  async dispose(){const start=performance.now();grass?.dispose();for(const dispose of owned)dispose();if(engine){if(loader)for(const asset of assets)loader.destroyAsset(asset);engine.destroySwapChain(swapChain);engine.destroyRenderer(renderer);engine.destroyView(view);engine.destroyScene(scene);Filament.Engine.destroy(engine);await device.queue.onSubmittedWorkDone();}else{const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.dispose();if(m.geometry)geometries.add(m.geometry);for(const material of Array.isArray(m.material)?m.material:m.material?[m.material]:[]){materials.add(material);for(const v of Object.values(material))if(v?.isTexture)textures.add(v)}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());sun?.shadow.dispose();renderer.dispose();}const report={ms:performance.now()-start,resources:meter.stats(),errors:[...errors]};meter.dispose();return report;}
 };
 await window.bench.capture();await raf();document.querySelector('#status').textContent=JSON.stringify({ready:true,backend,scenario,density,metadata},null,2);window.benchReady=true;
}catch(error){errors.push(String(error.stack??error));document.querySelector('#status').textContent=errors.join('\n');window.benchFailed=true;}

function instrumentGL(gl){
 const extension=gl.getExtension('EXT_disjoint_timer_query_webgl2'),originals=[],total={submits:0};let frame,query;
 const triangleCount=(mode,count,instances=1)=>mode===gl.TRIANGLES?count/3*instances:mode===gl.TRIANGLE_STRIP||mode===gl.TRIANGLE_FAN?Math.max(0,count-2)*instances:0;
 for(const name of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){const original=gl[name].bind(gl);originals.push(()=>gl[name]=original);gl[name]=(...a)=>{if(frame){frame.draws++;frame.triangles+=triangleCount(a[0],name.startsWith('drawElements')?a[1]:a[2],name.endsWith('Instanced')?a[name.startsWith('drawElements')?4:3]:1)}return original(...a)}}
 return {beginFrame({timed=false}={}){frame={draws:0,triangles:0,gpuMs:null};if(timed&&extension){query=gl.createQuery();gl.beginQuery(extension.TIME_ELAPSED_EXT,query)}},async endFrame(){const result=frame;frame=null;if(query){gl.endQuery(extension.TIME_ELAPSED_EXT);const pending=query;query=null;while(!gl.getQueryParameter(pending,gl.QUERY_RESULT_AVAILABLE))await new Promise(r=>setTimeout(r,1));if(!gl.getParameter(extension.GPU_DISJOINT_EXT))result.gpuMs=gl.getQueryParameter(pending,gl.QUERY_RESULT)/1e6;gl.deleteQuery(pending);result.gpuScope='Elapsed WebGL commands around complete renderer.render incl shadows; no CPU updates';}return result},stats(){return {gpuMemoryBytes:null,reason:'WebGL resource byte allocations not exposed; Three counters reported separately'}},dispose(){originals.forEach(r=>r())}};
}
