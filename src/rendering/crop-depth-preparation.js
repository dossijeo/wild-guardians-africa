import {waitGpuFrame} from '../../tools/experiments/wait-gpu-frame.js';
import {compileLoadingPrograms} from './loading-programs.js';
import {initializeProgramBindingsAsync} from './program-bindings.js';
import {createProgramRetentionScope} from './retain-warmed-programs.js';

// WebGLShadowMap uses a fogless scene and copies the source alpha textures.
// Submission MUST be synchronous: no scheduler admission inside this scope.
export function withCropShadowRecipe(renderer, world, view, sources, submit) {
 const saved=new Map(),enabled=renderer.shadowMap.enabled,fog=world.fog;
 try {
  renderer.shadowMap.enabled=true;world.fog=null;
  view.traverse(object=>{
   const source=sources.get(object),material=object.material;
   if(!source||material!==object.customDepthMaterial)return;
   if(!saved.has(material))saved.set(material,{map:material.map,alphaMap:material.alphaMap});
   material.map=source.map;material.alphaMap=source.alphaMap;
  });
  return submit();
 } finally {
  renderer.shadowMap.enabled=enabled;world.fog=fog;
  for(const [material,values] of saved){Object.assign(material,values);material.needsUpdate=true;}
 }
}

// Loading-only preparation of dormant stages, not a live-scene mutation API.
// Uses the existing depth executor and loading RAF, retaining programs until
// readiness and first-use reflection complete. Never draws or changes geometry.
export async function prepareCropDepthPrograms(renderer,world,camera,depthPass,{
 scheduler=null,signal:externalSignal,cancelled=()=>false,getEpoch=()=>0,onSubmit,nextFrame,now=()=>performance.now()
}={}) {
 const start=now(),epoch=getEpoch(),gl=renderer.getContext();let lost=false,pinFailed=false;
 const owner=new AbortController(),signal=owner.signal;
 const resources=new Set(),objects=[];
 const invalidate=()=>{lost=true;owner.abort();};
 if(externalSignal?.aborted)owner.abort();
 const invalid=()=>signal?.aborted||cancelled()||lost||pinFailed||getEpoch()!==epoch||renderer.getContext()!==gl||gl.isContextLost();
 const check=()=>{if(invalid())throw Error('Crop depth preparation cancelled');if(now()-start>30000)throw Error('Crop depth preparation timed out');};
 check();
 world.traverse(object=>{
  if(object.customDepthMaterial?.customProgramCacheKey().includes('bioma-local-bridge-depth-v3'))objects.push(object);
 });
 const sources=new WeakMap(objects.map(object=>[object,{map:object.material.map,alphaMap:object.material.alphaMap}]));
 const view={overrideMaterial:world.overrideMaterial,onBeforeRender:world.onBeforeRender,onAfterRender:world.onAfterRender,traverse:fn=>objects.forEach(fn),traverseVisible:fn=>objects.forEach(fn)};
 const scope=createProgramRetentionScope(renderer);
 externalSignal?.addEventListener('abort',invalidate,{once:true});
 gl.canvas?.addEventListener('webglcontextlost',invalidate);
 for(const object of objects)for(const resource of [object.geometry,object.material,object.customDepthMaterial])if(resource)resources.add(resource);
 for(const resource of resources)resource.addEventListener?.('dispose',invalidate);
 try {
  const compile=(scene,cam)=>compileLoadingPrograms(renderer,scene,cam,world,{signal,cancelled:invalid,getEpoch,onSubmit:span=>{
   if(span.label==='loading-compile-submit'&&!scope.acquire())pinFailed=true;
   onSubmit?.(span);
  }});
  const options={scheduler,batchSize:8,signal,cancelled:invalid,nextFrame};
  await depthPass.prepareDepth(camera,view,{...options,compile});check();
  await depthPass.prepareDepth(camera,view,{...options,compile:(scene,cam)=>withCropShadowRecipe(renderer,world,scene,sources,()=>compile(scene,cam))});check();
  const bindings=await initializeProgramBindingsAsync(renderer,{cancelled:invalid,nextFrame:()=>waitGpuFrame({signal,nextFrame,check})});check();
  return {objects:objects.length,ms:now()-start,bindings,retention:scope.stats};
 } finally {
  externalSignal?.removeEventListener('abort',invalidate);
  gl.canvas?.removeEventListener('webglcontextlost',invalidate);
  for(const resource of resources)resource.removeEventListener?.('dispose',invalidate);
  scope.dispose();
 }
}
