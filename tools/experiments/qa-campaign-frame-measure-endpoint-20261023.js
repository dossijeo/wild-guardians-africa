import {GpuTimer} from '/tests/browser/gpu-timer.js';
export async function measureCampaign(world,{gpuEnabled=false,samples=180,warmup=30,diagnostics=false}={}){
 const renderer=world.renderer,gl=renderer.getContext(),gpu=gpuEnabled?new GpuTimer(gl):null,original=world.render,frames=[];
 const state=()=>JSON.stringify({day:world.state.day,time:world.state.time,elapsed:world.state.elapsed,structures:world.state.structures,workers:world.state.workers,plants:world.state.plants});
 const before=state();let index=0,last=null,endpoint=null;
 try{
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{world.render=original;reject(Error('Campaign measurement timeout'));},90000);
   world.render=function(...args){
    const now=performance.now(),interval=last===null?null:now-last;last=now;
    if(world.qaContinuousGrass)world.qaContinuousGrass.timeOverride=index/30;
    const recording=index>=warmup,auto=renderer.info.autoReset;renderer.info.autoReset=false;renderer.info.reset();
    if(recording)gpu?.begin(index-warmup);
    const start=performance.now();
    try{return original.apply(this,args);}catch(error){clearTimeout(timeout);reject(error);throw error;}finally{
     const cpuMs=performance.now()-start;if(recording)gpu?.end();
     if(recording)frames.push({frame:index-warmup,cpuMs,intervalMs:interval,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,coverageInstances:world.qaContinuousGrass?{near:world.qaContinuousGrass.near,far:world.qaContinuousGrass.far}:null,camera:world.camera.position.toArray(),...(diagnostics?{renderDt:args[0],obstruction:{...world.obstructionStats},lod:{...world.lodStats},shadowCache:{...world.releaseNativeShadow?.cache.stats},groups:{...world.assetGroups.stats}}:{})});
     renderer.info.autoReset=auto;
     if(++index===warmup+samples){endpoint={coverage:world.qaContinuousGrass?.audit()??null,memory:{...renderer.info.memory}};world.render=original;clearTimeout(timeout);resolve();}
    }
   };
  });
  if(gpu)for(let i=0;i<120&&gpu.pending.length;i++){await new Promise(resolve=>setTimeout(resolve,8));gpu.poll();}
  const ext=gl.getExtension('WEBGL_debug_renderer_info');gpu?.dispose();
  return {frames,gpu:gpu?.report()??null,stateUnchanged:before===state(),glError:gl.getError(),coverage:endpoint?.coverage??null,mud:world.qaMudBlend?.audit()??null,memory:endpoint?.memory??{...renderer.info.memory},device:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),resolution:[renderer.domElement.width,renderer.domElement.height]};
 }finally{world.render=original;gpu?.dispose();}
}
