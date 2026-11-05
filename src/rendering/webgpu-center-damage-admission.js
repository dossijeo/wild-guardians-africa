import {confirmedCenterDamage} from './webgpu-center-destruction.js';

// The same destruction instance owns particles across phase changes. Admission
// temporarily visits its real meshes, without replacing their effect state.
export function createWebGpuAdmittedCenterDamage({damage,pipelineAdmission,onReady=()=>{},onError=()=>{}}={}){
 if(!damage?.group?.isGroup||typeof damage.update!=='function'||typeof damage.prepare!=='function'||typeof damage.status!=='function'||typeof damage.dispose!=='function'||typeof pipelineAdmission?.prepare!=='function'||typeof onReady!=='function'||typeof onError!=='function')throw TypeError('Invalid admitted center damage');
 const group=damage.group,body=group.children[0],ash=group.children[1];if(!body?.isMesh||!ash?.isMesh)throw TypeError('Invalid center damage meshes');
 let closed=false,activeStage=null,pending=null,latest=null,enabled=false;
 const stage=entity=>{const value=confirmedCenterDamage(entity);if(!Number.isFinite(value))throw Error('Invalid confirmed center damage');return {body:value<.9998,ash:value>.23};};
 const key=value=>`${value.body}:${value.ash}`;
 function cancel(){if(!pending)return;const old=pending;pending=null;old.abort();}
 function update(entity,time){
  if(closed)return;enabled=true;latest={entity,time};const target=stage(entity),targetKey=key(target);
  if(activeStage===targetKey){cancel();damage.update(entity,time);group.visible=true;return;}
  if(pending?.stage===targetKey)return;
  cancel();const controller=new AbortController();controller.stage=targetKey;pending=controller;
  let objects;
  if(activeStage===null){damage.update(entity,time);group.visible=false;objects=[group];}
  else{objects=[];if(target.body&&!body.visible)objects.push(body);if(target.ash&&!ash.visible)objects.push(ash);}
  Promise.resolve().then(async()=>{for(const object of objects)await pipelineAdmission.prepare(object,{signal:controller.signal});}).then(()=>{
   if(closed||pending!==controller||controller.signal.aborted||!enabled)return;
   damage.update(latest.entity,latest.time);pending=null;activeStage=targetKey;group.visible=true;try{onReady();}catch(error){onError(error);}
  }).catch(error=>{if(closed||pending!==controller||controller.signal.aborted)return;pending=null;onError(error);});
 }
 function hide(){if(closed)return;enabled=false;cancel();group.visible=false;}
 return {group,update,hide,get ready(){return activeStage!==null&&enabled;},get upToDate(){return enabled&&activeStage!==null&&pending===null&&activeStage===key(stage(latest.entity));},prepare(camera){if(enabled&&activeStage!==null)damage.prepare(camera);},status(){return damage.status();},dispose(){if(closed)return;closed=true;cancel();damage.dispose();}};
}
