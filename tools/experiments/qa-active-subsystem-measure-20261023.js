import {GpuTimer} from '/tests/browser/gpu-timer.js';
import {SubsystemPassTimer as RenderPassTimer} from '/tools/experiments/qa-subsystem-pass-timer-20261023.js';
import {RenderCpuCalls} from '/tests/browser/render-cpu-calls.js';
export async function measureActivePasses(w,{mode,samples=60,warmup=60}){
 const r=w.renderer,gl=r.getContext(),original=w.render,frames=[];
 const gpu=mode==='frame'?new GpuTimer(gl):null,passes=mode==='passes'?new RenderPassTimer(w):null,cpu=mode==='cpu'?new RenderCpuCalls(w):null;
 const snapshot=()=>({elapsed:w.state.elapsed,time:w.state.time,workers:w.state.workers.map(a=>({id:a.id,x:a.x,z:a.z,task:a.task})),pauses:[...w.state.pauses]});
 const before=snapshot();let index=0,last=null;
 try{
 await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Active pass timeout')),90000);
 w.render=function(...args){const now=performance.now(),interval=last===null?null:now-last;last=now;const recording=index>=warmup,auto=r.info.autoReset;r.info.autoReset=false;r.info.reset();
 if(recording){gpu?.begin(index-warmup);passes?.start(index-warmup);cpu?.begin();}const start=performance.now();
 try{return original.apply(this,args);}catch(e){clearTimeout(timeout);reject(e);throw e;}finally{
 const cpuMs=performance.now()-start;let calls=null;if(recording){gpu?.end();passes?.stop();calls=cpu?.end();frames.push({frame:index-warmup,cpuMs,intervalMs:interval,calls:r.info.render.calls,triangles:r.info.render.triangles,camera:w.camera.position.toArray(),coverage:{near:w.groundDetails.near,far:w.groundDetails.far},cpuCalls:calls,shadow:{...w.releaseNativeShadow.cache.stats}});}r.info.autoReset=auto;
 if(++index===warmup+samples){w.render=original;clearTimeout(timeout);resolve();}}
 };});
 for(let i=0;i<150&&(gpu?.pending.length||passes?.timer.pending.length);i++){await new Promise(resolve=>setTimeout(resolve,8));gpu?.poll();passes?.poll();}
 const ext=gl.getExtension('WEBGL_debug_renderer_info');return {mode,frames,before,after:snapshot(),gpu:gpu?.report()??null,passes:passes?.report()??null,glError:gl.getError(),memory:{...r.info.memory},coverage:w.groundDetails.audit(),device:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};
 }finally{w.render=original;cpu?.dispose();passes?.dispose();gpu?.dispose();}
}
