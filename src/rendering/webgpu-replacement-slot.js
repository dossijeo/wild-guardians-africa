import {Group} from 'three';

// A single owner retains the visible object until its confirmed replacement
// has been admitted. Resource disposal remains specific to the caller.
export function createWebGpuReplacementSlot({pipelineAdmission,release,onReady=()=>{},onError=()=>{}}={}){
 if(typeof pipelineAdmission?.prepare!=='function'||typeof release!=='function'||typeof onReady!=='function'||typeof onError!=='function')throw TypeError('Invalid replacement slot');
 const group=new Group();let active=null,pending=null,desiredKey=null,closed=false;
 function releaseObject(object){group.remove(object);if(typeof pipelineAdmission.deferRelease==='function')pipelineAdmission.deferRelease(object,()=>release(object));else release(object);}
 function discard(){if(!pending)return;const item=pending;pending=null;item.controller.abort();releaseObject(item.object);}
 function request(key,build){
  if(closed)return;if(typeof key!=='string'||typeof build!=='function')throw TypeError('Invalid replacement request');desiredKey=key;
  if(active?.key===key){discard();return;}if(pending?.key===key)return;
  discard();const object=build(active?.object??null);if(!object?.isObject3D)throw TypeError('Replacement must be an object');
  const controller=new AbortController(),item={key,object,controller};pending=item;object.visible=false;group.add(object);
  Promise.resolve().then(()=>pipelineAdmission.prepare(object,{signal:controller.signal})).then(()=>{
   if(closed||pending!==item||controller.signal.aborted)return;
   if(active)releaseObject(active.object);active=item;pending=null;object.visible=true;
   try{onReady();}catch(error){onError(error);}
  }).catch(error=>{if(closed||pending!==item||controller.signal.aborted)return;pending=null;releaseObject(object);onError(error);});
 }
 return {group,request,get active(){return active?.object??null;},get pending(){return pending?.object??null;},get ready(){return active!==null;},get upToDate(){return active!==null&&active.key===desiredKey&&pending===null;},dispose(){if(closed)return;closed=true;discard();if(active){releaseObject(active.object);active=null;}}};
}
