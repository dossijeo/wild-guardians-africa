import {Vector4} from 'three';

// Prepare only the currently packed native color root. Keep it detached from
// normal rendering until this completes; unloaded levels need their own pass.
export async function prepareNativeFarGpu(renderer,root,scene,camera,textures,{cancelled=()=>false,nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve)),timeout=30000}={}){
 const gl=renderer.getContext(),begin=performance.now();let sync;
 const check=()=>{if(cancelled()||gl.isContextLost())throw Error('Native GPU preparation cancelled');if(performance.now()-begin>timeout)throw Error('Native GPU preparation timed out');};
 try{
  check();for(const texture of new Set(textures))renderer.initTexture(texture);
  await renderer.compileAsync(root,camera,scene);check();
  // Keep the normal target/output recipe: another render target creates shader
  // variants. A zero viewport/scissor uploads vertex buffers without touching
  // visible pixels or clearing the player's framebuffer.
  const viewport=renderer.getViewport(new Vector4()),scissor=renderer.getScissor(new Vector4()),scissorTest=renderer.getScissorTest(),autoClear=renderer.autoClear,parent=root.parent;
  try{scene.add(root);renderer.autoClear=false;renderer.setViewport(0,0,0,0);renderer.setScissor(0,0,0,0);renderer.setScissorTest(true);renderer.render(scene,camera);}
  finally{renderer.autoClear=autoClear;renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(scissorTest);root.removeFromParent();if(parent)parent.add(root);}
  sync=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);if(!sync)throw Error('Native GPU fence unavailable');gl.flush();
  for(;;){check();const status=gl.clientWaitSync(sync,0,0);if(status===gl.ALREADY_SIGNALED||status===gl.CONDITION_SATISFIED)break;if(status===gl.WAIT_FAILED)throw Error('Native GPU fence failed');await nextFrame();}
  if(gl.getError()!==gl.NO_ERROR)throw Error('Native GPU preparation error');
  return {elapsedMs:performance.now()-begin,textures:new Set(textures).size};
 }finally{if(sync)gl.deleteSync(sync);}
}
