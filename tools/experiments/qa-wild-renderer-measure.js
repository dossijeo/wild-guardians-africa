import {placeCamera} from './qa-savanna-camera-sweep.js';
import {GpuTimer} from '/tests/browser/gpu-timer.js';
export async function measureCampaign(world,{gpuEnabled=false,samples=180,warmup=30}={}){
 const renderer=world.renderer,gl=renderer.getContext(),gpu=gpuEnabled?new GpuTimer(gl):null,original=world.render,frames=[];
 const state=()=>JSON.stringify({day:world.state.day,time:world.state.time,elapsed:world.state.elapsed,structures:world.state.structures,workers:world.state.workers,plants:world.state.plants});
 const residentBefore=world.qaFixedResidency?JSON.stringify([...world.chunks.keys()].sort()):null,createdBefore=world.chunkStream.stats.created;
 const before=state();let index=0,last=null,groupCpuMs=0;const originalGroups=world.assetGroups.update;world.assetGroups.update=function(...args){this.qaPackMs=0;if(this.qaWildRenderer)this.qaWildRenderer.metrics={};const start=performance.now();try{return originalGroups.apply(this,args);}finally{groupCpuMs=performance.now()-start;}};
 try{
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{world.render=original;reject(Error('Campaign measurement timeout at frame '+index));},180000);
   world.render=function(...args){
    const now=performance.now(),interval=last===null?null:now-last;last=now;
    placeCamera(world,.5-.5*Math.cos(2*Math.PI*index/180));if(world.qaContinuousGrass)world.qaContinuousGrass.timeOverride=index/30;
    if(world.qaDrawTrace){world.qaDrawTrace.rows=[];world.qaDrawTrace.enabled=index>=warmup&&index-warmup>=100&&index-warmup<=110;}
    const recording=index>=warmup,auto=renderer.info.autoReset;renderer.info.autoReset=false;renderer.info.reset();
    if(recording)gpu?.begin(index-warmup);
    const start=performance.now();
    try{return original.apply(this,world.qaDenseFixture?[1/30]:args);}catch(error){clearTimeout(timeout);reject(error);throw error;}finally{
     const cpuMs=performance.now()-start;if(recording)gpu?.end();
     if(recording)frames.push({drawTrace:world.qaDrawTrace?.enabled?world.qaDrawTrace.rows:undefined,packMs:world.assetGroups.qaPackMs,wasm:world.assetGroups.qaWildRenderer?{...world.assetGroups.qaWildRenderer.metrics,liveBytes:world.assetGroups.qaWildRenderer.liveBytes}:null,groupCpuMs,uploads:world.assetGroups.stats.uploads,groupBytes:world.assetGroups.stats.bytes,frame:index-warmup,cpuMs,intervalMs:interval,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,camera:world.camera.position.toArray()});
     renderer.info.autoReset=auto;
     if(++index===warmup+samples){world.render=original;clearTimeout(timeout);resolve();}
    }
   };
  });
  if(gpu)for(let i=0;i<120&&gpu.pending.length;i++){await new Promise(resolve=>setTimeout(resolve,8));gpu.poll();}
  const ext=gl.getExtension('WEBGL_debug_renderer_info');gpu?.dispose();
  if(residentBefore!==null&&(residentBefore!==JSON.stringify([...world.chunks.keys()].sort())||createdBefore!==world.chunkStream.stats.created))throw Error('Fixed residency changed during measurement');
  return {streamCreated:world.chunkStream.stats.created-createdBefore,frames,gpu:gpu?.report()??null,stateUnchanged:before===state(),glError:gl.getError(),coverage:world.qaContinuousGrass?.audit()??null,mud:world.qaMudBlend?.audit()??null,memory:{...renderer.info.memory},device:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),resolution:[renderer.domElement.width,renderer.domElement.height]};
 }finally{if(world.qaDrawTrace)world.qaDrawTrace.enabled=false;world.render=original;world.assetGroups.update=originalGroups;gpu?.dispose();}
}
