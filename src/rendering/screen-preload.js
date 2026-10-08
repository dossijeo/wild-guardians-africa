import {loadingYieldBudget} from './loading-yield-budget.js';
import {Vector4} from 'three';
import {withScreenTarget} from './screen-target.js';

// Keep the screen's output/color recipe while submitting buffers and textures.
// A zero viewport prevents color/depth writes; shadow passes retain their own
// viewport. Renderer state is restored before any asynchronous wait.
export function renderScreenPreload(renderer,scene,camera){
 const viewport=renderer.getViewport(new Vector4()),scissor=renderer.getScissor(new Vector4()),scissorTest=renderer.getScissorTest(),autoClear=renderer.autoClear;
 try{withScreenTarget(renderer,()=>{renderer.autoClear=false;renderer.setViewport(0,0,0,0);renderer.setScissor(0,0,0,0);renderer.setScissorTest(true);renderer.render(scene,camera);});}
 finally{renderer.autoClear=autoClear;renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);}
}

export async function waitForGpuPreload(renderer,{cancelled=()=>false,nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve)),timeout=30000,now=()=>performance.now()}={}){
 const gl=renderer.getContext(),begin=now();let sync;
 const check=()=>{if(cancelled()||gl.isContextLost())throw Error('GPU preload cancelled');if(now()-begin>timeout)throw Error('GPU preload timed out');};
 try{
  check();sync=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);if(!sync)throw Error('GPU preload fence unavailable');gl.flush();
  for(;;){check();const status=gl.clientWaitSync(sync,0,0);if(status===gl.ALREADY_SIGNALED||status===gl.CONDITION_SATISFIED)return;if(status===gl.WAIT_FAILED)throw Error('GPU preload fence failed');await nextFrame();}
 }finally{if(sync)gl.deleteSync(sync);}
}

// Submit the same native screen/shadow recipes in small groups, so first-use
// buffer/texture uploads and shadow variants are spread across real frames.
// Color batches reuse shadows; one complete native shadow pass precedes readiness.
export async function renderScreenPreloadBatched(renderer,scene,camera,{batchSize=4,frameBudget=0,now=()=>performance.now(),warmShadows=false,cancelled=()=>false,nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve)),onBatch=()=>{}}={}){
 const yieldWork=loadingYieldBudget({frameBudget,now,nextFrame});
 const meshes=[];scene.traverseVisible(object=>{if(object.isMesh||object.isLine||object.isPoints)meshes.push(object);});
 const visible=new Map(meshes.map(mesh=>[mesh,mesh.visible])),shadows=renderer.shadowMap;
 const lights=[];scene.traverseVisible(object=>{if(object.isLight&&object.shadow)lights.push([object.shadow,object.shadow.needsUpdate,object.shadow.autoUpdate]);});
 const shadowNeeds=shadows.needsUpdate,shadowAuto=shadows.autoUpdate;
 const check=()=>{if(cancelled()||renderer.getContext().isContextLost())throw Error('Loading scene upload cancelled');};
 const restore=()=>{for(const [mesh,value] of visible)mesh.visible=value;};
 const restoreShadows=()=>{shadows.needsUpdate=shadowNeeds;shadows.autoUpdate=shadowAuto;for(const [shadow,value,auto] of lights){shadow.needsUpdate=value;shadow.autoUpdate=auto;}};
 const suppressShadows=()=>{shadows.autoUpdate=false;shadows.needsUpdate=false;for(const [shadow] of lights){shadow.autoUpdate=false;shadow.needsUpdate=false;}};
 const invalidate=()=>{shadows.needsUpdate=true;for(const [shadow] of lights)shadow.needsUpdate=true;};
 try{
  for(let start=0;start<meshes.length;start+=batchSize){
   check();const batch=new Set(meshes.slice(start,start+batchSize));
   for(const mesh of batch)for(let parent=mesh.parent;parent;parent=parent.parent)if(visible.has(parent))batch.add(parent);
   try{for(const mesh of meshes)mesh.visible=batch.has(mesh);if(warmShadows)invalidate();else suppressShadows();renderScreenPreload(renderer,scene,camera);}finally{restore();restoreShadows();}
   onBatch(Math.min(meshes.length,start+batchSize),meshes.length);await yieldWork();
  }
  check();invalidate();renderScreenPreload(renderer,scene,camera);
 }finally{restore();restoreShadows();}
}
