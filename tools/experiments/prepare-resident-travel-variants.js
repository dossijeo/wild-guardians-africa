import {renderScreenPreload,waitForGpuPreload} from '../../src/rendering/screen-preload.js';
import {initializeProgramBindings} from '../../src/rendering/program-bindings.js';

// QA hypothesis only: warm every currently resident variant, not future chunks.
// Borrow the native objects/materials without new geometry or GPU ownership.
function withResidentVisibility(scene,operation){
 const saved=[];
 try{
  scene.traverse(object=>{saved.push([object,object.visible,object.frustumCulled,object.layers.mask]);object.visible=true;if(object.isMesh){object.frustumCulled=false;object.layers.set(0);}});
  return operation();
 }finally{for(const [object,visible,culled,mask] of saved){object.visible=visible;object.frustumCulled=culled;object.layers.mask=mask;}}
}

export async function prepareResidentTravelVariants(world,{draw=renderScreenPreload,fence=waitForGpuPreload,bindings=initializeProgramBindings,now=()=>performance.now()}={}){
 const started=now(),cancelled=()=>world.disposed||world.loading.signal.aborted;
 const check=()=>{if(cancelled())throw Error('Resident travel preparation cancelled');};
 check();
 // Saved workers may still be resolving their model requests after world.load.
 await Promise.all([...world.objects.values()].map(root=>root.userData.actorReady).filter(Boolean));check();
 world.scene.updateMatrixWorld(true);
 // compileAsync performs its traversal synchronously. Restore visibility before
 // yielding, so concurrent loading renders cannot inherit diagnostic flags.
 const pending=withResidentVisibility(world.scene,()=>world.renderer.compileAsync(world.scene,world.camera,world.scene));
 await pending;check();
 const bindingStats=bindings(world.renderer);check();
 world.releaseNativeShadow?.cache.invalidate();
 try{withResidentVisibility(world.scene,()=>draw(world.renderer,world.scene,world.camera));}
 finally{world.releaseNativeShadow?.cache.invalidate();}
 check();await fence(world.renderer,{cancelled});check();
 return {elapsedMs:now()-started,bindings:bindingStats,programs:world.renderer.info.programs.length,scope:'QA only: currently resident native variants; future chunk variants remain unproven'};
}
