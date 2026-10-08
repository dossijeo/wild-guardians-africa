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

export async function prepareResidentTravelVariants(world,{mode='full',draw=renderScreenPreload,fence=waitForGpuPreload,bindings=initializeProgramBindings,now=()=>performance.now()}={}){
 if(mode!=='full'&&mode!=='programs')throw Error('Invalid resident preparation mode');
 const started=now(),cancelled=()=>world.disposed||world.loading.signal.aborted;
 const check=()=>{if(cancelled())throw Error('Resident travel preparation cancelled');};
 check();
 // Saved workers may still be resolving their model requests after world.load.
 await Promise.all([...world.objects.values()].map(root=>root.userData.actorReady).filter(Boolean));check();
 world.scene.updateMatrixWorld(true);
 // compileAsync performs its traversal synchronously. Restore visibility before
 // yielding, so concurrent loading renders cannot inherit diagnostic flags.
 // Three r180 compile traverses all materials regardless of object visibility.
 // Program-only mode leaves lights/layers untouched and submits no upload draw.
 // It does not prepare hidden shadow variants, geometry or textures for drawing.
 const compile=()=>world.renderer.compileAsync(world.scene,world.camera,world.scene);
 const pending=mode==='programs'?compile():withResidentVisibility(world.scene,compile);
 await pending;check();
 const bindingStats=bindings(world.renderer);check();
 if(mode==='full'){
  world.releaseNativeShadow?.cache.invalidate();
  try{withResidentVisibility(world.scene,()=>draw(world.renderer,world.scene,world.camera));}
  finally{world.releaseNativeShadow?.cache.invalidate();}
 }
 check();await fence(world.renderer,{cancelled});check();
 return {mode,elapsedMs:now()-started,bindings:bindingStats,programs:world.renderer.info.programs.length,scope:mode==='programs'?'QA only: resident color-program compilation and lazy bindings; no geometry/texture uploads or hidden-shadow readiness proof. Future chunk variants remain unproven.':'QA only: currently resident native variants; future chunk variants remain unproven'};
}
