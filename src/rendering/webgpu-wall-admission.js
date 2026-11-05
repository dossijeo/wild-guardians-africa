import {Group} from 'three';
import {NativeWall} from './walls.js';

// Keep the current confirmed visual until the actual next topology is ready.
// This owns presentation only; the simulation never waits for admission.
export function createWebGpuAdmittedWall({prototypes,entity,elapsed,pipelineAdmission,onReady=()=>{},onError=()=>{},createWall=(assets,value,time,options)=>new NativeWall(assets,value,time,options)}={}){
 if(!prototypes||!entity||typeof pipelineAdmission?.prepare!=='function'||typeof onReady!=='function'||typeof onError!=='function'||typeof createWall!=='function')throw TypeError('Invalid admitted wall');
 const group=new Group();let active=null,pending=null,closed=false;
 function dropPending(){if(!pending)return;const old=pending;pending=null;old.controller.abort();group.remove(old.wall);old.wall.dispose();}
 function update(value,time){
  if(closed)return;
  const base=active??pending?.wall;
  const key=base?.nextConfirmedStageKey(value,time)??null;
  if(active&&active.stageKey===key){dropPending();active.update(value,undefined,time);return;}
  if(pending&&pending.wall.stageKey===key){pending.wall.update(value,undefined,time);return;}
  dropPending();const wall=createWall(prototypes,value,time,{previous:active}),controller=new AbortController(),item={wall,controller};pending=item;wall.visible=false;group.add(wall);
  Promise.resolve().then(()=>pipelineAdmission.prepare(wall,{signal:controller.signal})).then(()=>{
   if(closed||pending!==item||controller.signal.aborted)return;
   if(active){group.remove(active);active.dispose();}active=wall;pending=null;wall.visible=true;onReady();
  }).catch(error=>{if(closed||pending!==item||controller.signal.aborted)return;pending=null;group.remove(wall);wall.dispose();onError(error);});
 }
 update(entity,elapsed);
 return {group,update,get ready(){return active!==null;},get parts(){return active?.parts??[];},dispose(){if(closed)return;closed=true;dropPending();if(active){group.remove(active);active.dispose();active=null;}}};
}
