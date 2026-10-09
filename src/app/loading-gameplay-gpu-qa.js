import {LoadingGpuQa} from './loading-gpu-qa.js';
// Optional post-loading comparison in the existing application RAF. Never pauses
// simulation, moves the camera, or keeps resources after the world owner ends.
export function installLoadingGameplayGpuQa(doc=document,{limit=120,gpuFactory=renderer=>new LoadingGpuQa(renderer)}={}){
 const element=doc.createElement('script');element.type='application/json';element.id='loading-gameplay-gpu-qa';doc.head.append(element);
 let owner=null,renderer=null,count=0,frames=[],closed=false;
 const close=(reason='world-ended')=>{if(!owner)return;const gpu=owner.close();owner=null;closed=true;element.textContent=JSON.stringify({gpu,frames,count,reason,closed:true,scope:'Ordinary gameplay World.render calls after loading closes, using existing RAF. Simulation/camera are unchanged; elapsed queries include synchronous subdraws, not asynchronous preparation outside the call. Profiled RAF intervals are not an uninstrumented benchmark.'});};
 return {
  frame(at,current,run){if(closed)return run();if(!owner){renderer=current;owner=gpuFactory(current);}if(current!==renderer){close('renderer-changed');return run();}frames.push({at,interval:frames.length?at-frames.at(-1).at:null});let failed=false;try{return owner.measure('gameplay-world-render',run);}catch(error){failed=true;throw error;}finally{count++;if(failed)close('render-error');else if(count>=limit)close('sample-limit');}},
  close,
  reset(){close('replaced');owner=null;renderer=null;count=0;frames=[];closed=false;}
 };
}
