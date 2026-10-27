import {Scene} from 'three';
import {compileLoadingPrograms} from '../../src/rendering/loading-programs.js';
// Prepare the actual depth target/shadow-disabled variant before publication.
// The pass restores renderer/material state synchronously; never hold borrowed
// scene ownership across its asynchronous compilation readiness wait.
export async function prepareNativeFarDepth(world,root,cancelled=()=>false){
 if(!world.destructionPass)return;
 const check=()=>{if(cancelled()||world.disposed){const e=new Error('Far depth preparation cancelled');e.name='AbortError';throw e;}};
 check();const scene=new Scene();scene.fog=world.scene.fog;
 const parent=root.parent;let ready;
 try{
  scene.add(root);
  ready=world.destructionPass.prepareDepth(world.camera,scene,{cancelled,
   compile:(borrowed,camera)=>compileLoadingPrograms(world.renderer,borrowed,camera,world.scene,{cancelled})});
 }finally{root.removeFromParent();if(parent)parent.add(root);}
 await ready;check();
}
