import {Group} from 'three';

let nextSlotId=0;

// A single owner retains the visible object until its confirmed replacement
// has been admitted. Resource disposal remains specific to the caller.
export function createWebGpuReplacementSlot({pipelineAdmission,resourceRegistry=null,release,onReady=()=>{},onError=()=>{}}={}){
 if(resourceRegistry!==null&&typeof resourceRegistry?.adopt!=='function'||typeof pipelineAdmission?.prepare!=='function'||typeof release!=='function'||typeof onReady!=='function'||typeof onError!=='function')throw TypeError('Invalid replacement slot');
 const group=new Group(),leases=new WeakMap(),slotId=++nextSlotId;let active=null,pending=null,prepared=null,desiredKey=null,closed=false,revision=0;
 function releaseObject(object){try{group.remove(object);}finally{const lease=leases.get(object),finish=()=>{if(lease)lease.release();else release(object);};if(typeof pipelineAdmission.deferRelease==='function')pipelineAdmission.deferRelease(object,finish);else finish();}}
 function discard(){if(!pending)return;const item=pending;pending=null;item.controller.abort();releaseObject(item.object);}
 function request(key,build){
  if(closed)return;if(typeof key!=='string'||typeof build!=='function')throw TypeError('Invalid replacement request');desiredKey=key;
  if(prepared&&key!==active?.key)prepared.participant.cancel();
  if(active?.key===key){discard();return;}if(pending?.key===key)return;
  discard();const object=build(active?.object??null);if(!object?.isObject3D)throw TypeError('Replacement must be an object');
  if(resourceRegistry)try{leases.set(object,resourceRegistry.adopt({namespace:'structure-candidate',key:`${slotId}:${++revision}:${key}`,dispose:()=>release(object)}));}catch(error){release(object);throw error;}
  const controller=new AbortController(),item={key,object,controller};pending=item;object.visible=false;group.add(object);
  const publish=()=>{
   if(closed||pending!==item||controller.signal.aborted)return;
   if(active)releaseObject(active.object);active=item;pending=null;leases.get(object)?.commit();object.visible=true;
   try{onReady();}catch(error){onError(error);}
  };
  Promise.resolve().then(()=>typeof pipelineAdmission.prepareAndPublish==='function'?pipelineAdmission.prepareAndPublish(object,{signal:controller.signal},publish):Promise.resolve(pipelineAdmission.prepare(object,{signal:controller.signal})).then(publish)).catch(error=>{if(closed||pending!==item||controller.signal.aborted)return;pending=null;releaseObject(object);onError(error);});
 }
 // A native-world proposal is still ineffective. Stage its actual replacement
 // in this owner, and let the existing graphical batch admit and publish it.
 function prepareParticipant(key,build){
  if(closed||pending||prepared||!active||active.key!==desiredKey)throw Error('Replacement slot unavailable for a batch');
  if(typeof key!=='string'||typeof build!=='function'||key===active.key)throw TypeError('Invalid prepared replacement');
  const previous=active,priorKey=desiredKey,object=build();if(!object?.isObject3D||object===previous.object||object.parent!==null)throw TypeError('Prepared replacement must be a new detached object');
  if(resourceRegistry)try{leases.set(object,resourceRegistry.adopt({namespace:'structure-candidate',key:`${slotId}:${++revision}:${key}`,dispose:()=>release(object)}));}catch(error){release(object);throw error;}
  const controller=new AbortController(),item={key,object,controller};let activated=false,attached=false,finalized=false,finished=false;
  object.visible=false;try{group.add(object);}catch(error){releaseObject(object);throw error;}prepared=item;
  const valid=()=>!closed&&!finished&&!controller.signal.aborted&&prepared===item&&!pending&&active===(finalized?item:previous)&&desiredKey===(finalized?key:priorKey)&&object.parent===group&&object.visible===attached&&previous.object.parent===group;
  const check=()=>{if(!valid())throw Error('Prepared replacement became stale');};
  const participant={object,include:[object],signal:controller.signal,valid,eventRoots:()=>[object,previous.object],
   activate(){check();if(activated)throw Error('Prepared replacement already activated');activated=true;return true;},
   attach(){check();if(!activated||attached)throw Error('Prepared replacement not activated');object.visible=true;attached=true;},
   rollback(){object.visible=false;attached=false;},
   finalize(){check();if(!attached||finalized)throw Error('Prepared replacement not attached');active=item;desiredKey=key;finalized=true;return {
    retire(){check();leases.get(object)?.commit();prepared=null;delete item.participant;finished=true;releaseObject(previous.object);},
    notify(){try{onReady();}catch(error){onError(error);}}
   };},
   rollbackFinalized(){if(!finalized)return;if(active!==item)throw Error('Prepared replacement ownership changed');active=previous;desiredKey=priorKey;finalized=false;},
   cancel(){if(finished)return;if(finalized){controller.abort();return;}finished=true;if(prepared===item)prepared=null;delete item.participant;controller.abort();releaseObject(object);}
  };item.participant=participant;return participant;
 }
 return {group,request,prepareParticipant,get activeKey(){return active?.key??null;},get active(){return active?.object??null;},get pending(){return pending?.object??null;},get ready(){return active!==null;},get upToDate(){return active!==null&&active.key===desiredKey&&pending===null;},dispose(){if(closed)return;closed=true;const part=prepared?.participant;if(part){part.rollbackFinalized();part.rollback();part.cancel();}discard();if(active){releaseObject(active.object);active=null;}}};
}
