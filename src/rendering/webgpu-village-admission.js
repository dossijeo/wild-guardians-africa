import {Group} from 'three';

// Candidate groups contain the actual confirmed layout and share their banks'
// geometry and materials. Only the container is owned here.
export function createWebGpuAdmittedVillage({pipelineAdmission,onReady=()=>{},onError=()=>{}}={}){
 if(typeof pipelineAdmission?.prepare!=='function'||typeof onReady!=='function'||typeof onError!=='function')throw TypeError('Invalid admitted village');
 const group=new Group();let active=null,pending=null,desiredKey=null,closed=false;
 function discard(){if(!pending)return;const item=pending;pending=null;item.controller.abort();group.remove(item.object);item.object.clear();}
 function update(key,build){
  if(closed)return;if(typeof key!=='string'||typeof build!=='function')throw TypeError('Invalid village layout');desiredKey=key;
  if(active?.key===key){discard();return;}if(pending?.key===key)return;
  discard();const object=build();if(!object?.isGroup)throw TypeError('Village layout must be a group');
  const controller=new AbortController(),item={key,object,controller};pending=item;object.visible=false;group.add(object);
  Promise.resolve().then(()=>pipelineAdmission.prepare(object,{signal:controller.signal})).then(()=>{
   if(closed||pending!==item||controller.signal.aborted)return;
   if(active){group.remove(active.object);active.object.clear();}active=item;pending=null;object.visible=true;onReady();
  }).catch(error=>{if(closed||pending!==item||controller.signal.aborted)return;pending=null;group.remove(object);object.clear();onError(error);});
 }
 return {group,update,get ready(){return active!==null;},get upToDate(){return active!==null&&active.key===desiredKey&&pending===null;},get meshes(){return active?.object.children??[];},dispose(){if(closed)return;closed=true;discard();if(active){group.remove(active.object);active.object.clear();active=null;}}};
}
