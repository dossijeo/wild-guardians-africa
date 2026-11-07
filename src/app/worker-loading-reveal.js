import {Vector3} from 'three';

const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
function nextBrowserFrame(signal){return new Promise((resolve,reject)=>{let id;const abort=()=>{cancelAnimationFrame(id);reject(new DOMException('Loading reveal cancelled','AbortError'));};if(signal?.aborted)return abort();signal?.addEventListener('abort',abort,{once:true});id=requestAnimationFrame(time=>{signal?.removeEventListener('abort',abort);resolve(time);});});}

export async function runPausedWorkerLoadingReveal({runtime,isCurrent,play}={}){
 if(typeof runtime?.submit!=='function'||typeof isCurrent!=='function'||typeof play!=='function')throw TypeError('Invalid Worker reveal pause');
 const paused=await runtime.submit({kind:'pause',reason:'loading-reveal'});if(paused?.rejection)throw Error(paused.rejection);
 let failure=null;try{if(!isCurrent())throw new DOMException('Loading reveal cancelled','AbortError');await play();}catch(error){failure=error;}
 if(isCurrent())try{const result=await runtime.submit({kind:'resume',reason:'loading-reveal'});if(result?.rejection)throw Error(result.rejection);}catch(error){failure??=error;}
 if(failure)throw failure;
}

// Presentation-only: the authority remains in its Worker. Do not expose the
// game until the Worker has drawn the requested sky camera, and restore the
// original controls and pose after the reveal or on cancellation.
export async function playWorkerLoadingReveal({world,onSky=()=>{},sceneReady=()=>true,signal,isCurrent=()=>true,nextFrame=nextBrowserFrame,hidden=()=>document.hidden,reducedMotion=false,timeoutMs=30000}={}){
 if(!world?.camera?.isCamera||!world.controls?.target?.isVector3||!world.webGpuWorld?.client||typeof onSky!=='function'||typeof sceneReady!=='function'||typeof isCurrent!=='function'||typeof nextFrame!=='function'||typeof hidden!=='function'||typeof reducedMotion!=='boolean'||!Number.isFinite(timeoutMs)||timeoutMs<=0)throw TypeError('Invalid Worker loading reveal');
 const {camera,controls,webGpuWorld:view}=world,client=view.client;if(typeof client.hasCurrentFrame!=='function')throw Error('Worker frame tracking unavailable');
 const eye=camera.position.clone(),target=controls.target.clone(),enabled=controls.enabled,originalCinematic=world.cinematic,heading=new Vector3().subVectors(target,eye);heading.y=0;if(heading.lengthSq()<1e-8)heading.set(0,0,-1);heading.normalize();const sky=eye.clone().add(heading.multiplyScalar(2)).add(new Vector3(0,24,0));let last=null,waiting=0;
 const check=()=>{if(signal?.aborted||!isCurrent()||world.disposed||world.webGpuWorld!==view)throw new DOMException('Loading reveal cancelled','AbortError');const status=client.status();if(status.phase!=='running'||status.backend!=='WebGPU')throw Error(status.failure??'WebGPU presentation unavailable');};
 const frame=async()=>{check();const now=await nextFrame(signal);check();if(!Number.isFinite(now))throw Error('Invalid frame clock');const elapsed=last===null?0:Math.max(0,Math.min(100,now-last));last=now;return hidden()?0:elapsed;};
 const sync=()=>{camera.lookAt(controls.target);camera.updateMatrixWorld();view.sync();};
 async function drawn(){waiting=0;while(!client.hasCurrentFrame()){waiting+=await frame();if(waiting>timeoutMs)throw Error('Timed out waiting for Worker camera frame');}await frame();await frame();}
 controls.enabled=false;world.cinematic=true;
 try{check();controls.target.copy(sky);sync();await drawn();check();onSky();await frame();await frame();waiting=0;while(!sceneReady()){waiting+=await frame();if(waiting>timeoutMs)throw Error('Timed out waiting for visible Worker terrain');}let elapsed=0;const duration=reducedMotion?120:1400;last=null;while(elapsed<duration){elapsed+=await frame();controls.target.lerpVectors(sky,target,smooth(elapsed/duration));sync();}controls.target.copy(target);camera.position.copy(eye);sync();await drawn();}
 finally{camera.position.copy(eye);controls.target.copy(target);camera.lookAt(target);camera.updateMatrixWorld();if(isCurrent()&&!world.disposed&&world.webGpuWorld===view)view.sync();controls.enabled=enabled;world.cinematic=originalCinematic;}
}
