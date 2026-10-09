import * as THREE from 'three';
import {compileGpuPreparation} from './compile-gpu-preparation.js';
import {waitLoadingGpuFence} from './wait-loading-gpu-fence.js';
import {initializeProgramBindings} from '../../src/rendering/program-bindings.js';

// QA only. Compile the directional shadow recipe for original crop objects,
// including empty batches, without making them drawable or uploading geometry.
const keys=new Set(['bioma-growth-depth-v3-opaque','bioma-local-bridge-depth-v3']);
const fields=['visible','wireframe','side','alphaMap','alphaTest','map','clipShadows','clippingPlanes','clipIntersection','displacementMap','displacementScale','displacementBias','wireframeLinewidth','linewidth'];
export async function prepareCropShadowPrograms(world,{compile=compileGpuPreparation,bindings=initializeProgramBindings,fence=waitLoadingGpuFence,timeout=30000,now=()=>performance.now()}={}) {
 const renderer=world.renderer,gl=renderer.getContext(),epoch=world.glResourceEpoch?.stats.epoch??0,started=now(),abort=new AbortController();
 const lose=()=>abort.abort(Error('Crop shadow context lost')),cancel=()=>abort.abort(Error('Crop shadow preparation cancelled'));
 const check=()=>{if(abort.signal.aborted||world.disposed||world.loading.signal.aborted||renderer.getContext()!==gl||gl.isContextLost()||(world.glResourceEpoch?.stats.epoch??0)!==epoch)throw Error('Crop shadow preparation cancelled');if(now()-started>timeout)throw Error('Crop shadow preparation timed out');};
 check();if(!world.sun.shadow.map||!renderer.shadowMap.enabled)throw Error('Native shadow target unavailable');
 const meshes=[];world.scene.traverse(object=>{if(object.isInstancedMesh&&object.customDepthMaterial&&keys.has(object.customDepthMaterial.customProgramCacheKey())){if(Array.isArray(object.material))throw Error('Unsupported crop shadow material array');meshes.push(object);}});
 if(!meshes.length)throw Error('Native crop shadow sources unavailable');
 const target=new THREE.Scene();world.scene.traverseVisible(object=>{if(object.isLight)target.add(object.clone(false));});
 const view={traverse:callback=>meshes.forEach(callback),traverseVisible:()=>{}};
 const originals=new Map(),depths=new Map();
 const submit=(root,camera,scene)=>{
  const previous=renderer.getRenderTarget(),face=renderer.getActiveCubeFace(),level=renderer.getActiveMipmapLevel(),viewport=renderer.getViewport(new THREE.Vector4()),scissor=renderer.getScissor(new THREE.Vector4()),test=renderer.getScissorTest();
  try{
   for(const mesh of meshes){const source=mesh.material,depth=mesh.customDepthMaterial;originals.set(mesh,source);if(!depths.has(depth))depths.set(depth,Object.fromEntries(fields.map(key=>[key,depth[key]])));
    Object.assign(depth,{visible:source.visible,wireframe:source.wireframe,side:source.shadowSide??(renderer.shadowMap.type===THREE.VSMShadowMap?source.side:({[THREE.FrontSide]:THREE.BackSide,[THREE.BackSide]:THREE.FrontSide,[THREE.DoubleSide]:THREE.DoubleSide})[source.side]),alphaMap:source.alphaMap,alphaTest:source.alphaToCoverage ? .5 : source.alphaTest,map:source.map,clipShadows:source.clipShadows,clippingPlanes:source.clippingPlanes,clipIntersection:source.clipIntersection,displacementMap:source.displacementMap,displacementScale:source.displacementScale,displacementBias:source.displacementBias,wireframeLinewidth:source.wireframeLinewidth,linewidth:source.linewidth});mesh.material=depth;
   }
   renderer.setRenderTarget(world.sun.shadow.map);return renderer.compile(root,camera,scene);
  }finally{
   for(const [mesh,source] of originals)mesh.material=source;for(const [depth,saved] of depths)Object.assign(depth,saved);originals.clear();depths.clear();
   renderer.setRenderTarget(previous,face,level);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(test);
  }
 };
 const facade={compile:submit,properties:renderer.properties};
 gl.canvas?.addEventListener('webglcontextlost',lose);world.loading.signal.addEventListener('abort',cancel,{once:true});
 try{
  await compile(facade,view,world.sun.shadow.camera,target,{check,signal:abort.signal});check();
  const bindingStats=await bindings(renderer);check();await fence(renderer,{signal:abort.signal,cancelled:()=>world.disposed||world.loading.signal.aborted,getEpoch:()=>world.glResourceEpoch?.stats.epoch??0});check();
  return {elapsedMs:now()-started,sources:meshes.length,bindings:bindingStats,programs:meshes.map(mesh=>({object:mesh.name,key:renderer.properties.get(mesh.customDepthMaterial).currentProgram?.cacheKey})),scope:'QA program-only shadow recipe. No draw, count changes, texture initialization or geometry upload; native cache-key/resource/performance validation still required.'};
 }finally{gl.canvas?.removeEventListener('webglcontextlost',lose);world.loading.signal.removeEventListener('abort',cancel);target.clear();}
}
