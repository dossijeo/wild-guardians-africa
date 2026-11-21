import * as THREE from 'three';

// QA-only caller: prepare the existing debris recipe without reparenting or
// changing the live mesh. The borrowed material remains owned by the building.
export async function prepareDebrisProgram(renderer,world,camera,debris,{compile,cancelled=()=>false}={}){
 if(!debris?.isMesh||typeof compile!=='function')throw TypeError('Expected a debris mesh and compiler');
 if(cancelled())throw Error('Debris preparation cancelled');
 const clone=debris.clone(),scene=new THREE.Scene(),target=new THREE.WebGLRenderTarget(1,1);
 clone.geometry=debris.geometry.clone();clone.geometry.instanceCount=1;clone.visible=true;clone.frustumCulled=false;scene.add(clone);
 try{
  await compile(scene,camera,world);if(cancelled())throw Error('Debris preparation cancelled');
  const previous=renderer.getRenderTarget();try{renderer.setRenderTarget(target);renderer.render(scene,camera);}finally{renderer.setRenderTarget(previous);}
 }finally{scene.remove(clone);clone.geometry.dispose();target.dispose();}
}
