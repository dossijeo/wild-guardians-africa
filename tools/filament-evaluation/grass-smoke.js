import {loadGrassSnapshot,loadGrassTexture,createFilamentGrass,createThreeGrass} from './grass.js';
const report=window.grassSmoke={done:false,errors:[],frames:0};
addEventListener('error',e=>report.errors.push(String(e.error??e.message)));addEventListener('unhandledrejection',e=>report.errors.push(String(e.reason)));
if(new URLSearchParams(location.search).has('three')){
  try{
    const THREE=await import('three'),snapshot=await loadGrassSnapshot(),nativeInstancing=new URLSearchParams(location.search).has('native');
    const {threeTexture:texture}=await loadGrassTexture({url:snapshot.terrain.base,THREE}),canvas=document.querySelector('canvas');
    const renderer=new THREE.WebGLRenderer({canvas,antialias:false,preserveDrawingBuffer:true});renderer.setSize(1280,720);renderer.setClearColor(new THREE.Color().setRGB(.725,.773,.812,THREE.LinearSRGBColorSpace));
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(snapshot.camera.fov,1280/720,snapshot.camera.near,snapshot.camera.far);camera.position.fromArray(snapshot.renderSpace.cameraPosition);camera.lookAt(...snapshot.camera.target);
    const handle=createThreeGrass({THREE,snapshot,texture,nativeInstancing});scene.add(...handle.entities);report.metadata=handle.metadata;
    for(let frame=0;frame<10;frame++){await new Promise(requestAnimationFrame);handle.update(frame/60);if(frame===3)report.partialBytes=handle.updatePartial(.01,0);renderer.render(scene,camera);report.frames++;}
  }catch(e){report.errors.push(String(e.stack??e));}
  report.done=true;document.querySelector('#status').textContent=JSON.stringify(report,null,2);
}else{
try {
  const adapter=await navigator.gpu.requestAdapter({forceFallbackAdapter:false,powerPreference:'low-power'});
  report.adapter={...adapter.info,description:adapter.info.description,vendor:adapter.info.vendor,isFallbackAdapter:adapter.info.isFallbackAdapter};
  if(adapter.info.isFallbackAdapter||/swiftshader|software/i.test(adapter.info.description))throw Error('Software adapter rejected');
  const requiredFeatures=['immediates','chromium-experimental-immediate-data','rg11b10ufloat-renderable','float32-filterable','float32-blendable','depth-clip-control','depth32float-stencil8','texture-compression-bc','texture-compression-etc2','texture-compression-astc'].filter(f=>adapter.features.has(f));
  const requiredLimits={};for(const k in adapter.limits)requiredLimits[k]=adapter.limits[k];
  const device=await adapter.requestDevice({requiredFeatures,requiredLimits});device.addEventListener('uncapturederror',e=>report.errors.push(e.error.message));
  Filament.preinitializedWebGPUDevice=device;await new Promise(resolve=>Filament.init([],resolve));const F=Filament;
  const canvas=document.querySelector('canvas'),engine=F.Engine.create(canvas,{backend:F.Backend.WEBGPU}),scene=engine.createScene(),view=engine.createView(),renderer=engine.createRenderer(),swap=engine.createSwapChain();
  report.backend=engine.getBackend().value;
  const snapshot=await loadGrassSnapshot(),nativeInstancing=new URLSearchParams(location.search).has('native');
  const {filamentTexture:texture}=await loadGrassTexture({url:snapshot.terrain.base,engine,Filament:F});
  report.stage='material-fetch';const materialBytes=new Uint8Array(await(await fetch(nativeInstancing?'vendor/grass-instanced.filamat':'vendor/grass.filamat')).arrayBuffer());
  report.stage='grass-create';
  const handle=createFilamentGrass({engine,Filament:F,snapshot,texture,materialBytes,nativeInstancing});scene.addEntities(handle.entities);report.metadata=handle.metadata;
  report.stage='camera';const camera=engine.createCamera(F.EntityManager.get().create());camera.setProjectionFov(snapshot.camera.fov,1280/720,snapshot.camera.near,snapshot.camera.far,F.Camera$Fov.VERTICAL);
  camera.lookAt(snapshot.renderSpace.cameraPosition,snapshot.camera.target,[0,1,0]);
  view.setScene(scene);view.setCamera(camera);view.setViewport([0,0,1280,720]);view.setPostProcessingEnabled(false);
  renderer.setClearOptions({clearColor:[.725,.773,.812,1],clear:true,discard:true});
  for(let frame=0;frame<10;frame++){await new Promise(requestAnimationFrame);handle.update(frame/60);if(frame===3)report.partialBytes=handle.updatePartial(.01,0);renderer.render(swap,view);report.frames++;}
  await device.queue.onSubmittedWorkDone();window.grassSmokeContext={engine,view,handle};
}catch(e){report.errors.push(String(e.stack??e));if(typeof e==='number'&&Filament.getExceptionMessage)report.errors.push(Filament.getExceptionMessage(e));}
report.done=true;document.querySelector('#status').textContent=JSON.stringify(report,null,2);
}
