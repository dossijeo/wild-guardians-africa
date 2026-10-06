import {Vector4} from 'three';

// Keep the screen's output/color recipe while submitting buffers and textures.
// A zero viewport prevents color/depth writes; shadow passes retain their own
// viewport. Renderer state is restored before any asynchronous wait.
export function renderScreenPreload(renderer,scene,camera){
 const viewport=renderer.getViewport(new Vector4()),scissor=renderer.getScissor(new Vector4()),scissorTest=renderer.getScissorTest(),autoClear=renderer.autoClear;
 try{renderer.autoClear=false;renderer.setViewport(0,0,0,0);renderer.setScissor(0,0,0,0);renderer.setScissorTest(true);renderer.render(scene,camera);}
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
