import {centerSource,verifiesCenter} from '../world/native-center-ruin-source.js';
import {confirmedCenterDamage} from './webgpu-center-destruction.js';

// The same destruction instance owns particles across phase changes. Admission
// temporarily visits its real meshes, without replacing their effect state.
export function createWebGpuAdmittedCenterDamage({damage,pipelineAdmission,onReady=()=>{},onError=()=>{}}={}){
 if(!damage?.group?.isGroup||typeof damage.update!=='function'||typeof damage.advanceEffects!=='function'||typeof damage.present!=='function'||typeof damage.prepare!=='function'||typeof damage.status!=='function'||typeof damage.dispose!=='function'||typeof pipelineAdmission?.prepare!=='function'||typeof onReady!=='function'||typeof onError!=='function')throw TypeError('Invalid admitted center damage');
 const group=damage.group,body=group.children[0],ash=group.children[1];if(!body?.isMesh||!ash?.isMesh)throw TypeError('Invalid center damage meshes');
 let closed=false,activeStage=null,pending=null,latest=null,enabled=false;
 const stage=entity=>{const value=confirmedCenterDamage(entity);if(!Number.isFinite(value))throw Error('Invalid confirmed center damage');return {body:value<.9998,ash:value>.23};};
 const key=value=>`${value.body}:${value.ash}`;
 function cancel(){if(!pending)return;const old=pending;pending=null;old.abort();}
 function update(entity,time,ruinAt=null){
  if(closed)return;
  if(acquiredRuin){
   if(time===acquiredRuin.publishedAt&&JSON.stringify(entity)===acquiredRuin.stamp)return;
   if(time<acquiredRuin.end||time===acquiredRuin.end&&entity.status!=='ruined')throw Error('Center ruin publication differs from acquisition');
   acquiredRuin=null;
  }
  const target=stage(entity),targetKey=key(target);
  // Admission can delay mesh visibility while replay is applying successive
  // confirmed boundaries. Those boundaries still drive the particle kernel.
  damage.advanceEffects(entity,time,ruinAt);
  enabled=true;latest={entity,time};
  if(activeStage===targetKey){cancel();damage.present(entity);group.visible=true;return;}
  if(pending?.stage===targetKey)return;
  cancel();const controller=new AbortController();controller.stage=targetKey;pending=controller;
  let objects;
  if(activeStage===null){damage.present(entity);group.visible=false;objects=[group];}
  else{objects=[];if(target.body&&!body.visible)objects.push(body);if(target.ash&&!ash.visible)objects.push(ash);}
  const publish=()=>{
   if(closed||pending!==controller||controller.signal.aborted||!enabled)return;
   damage.present(latest.entity);pending=null;activeStage=targetKey;group.visible=true;try{onReady();}catch(error){onError(error);}
  };
  Promise.resolve().then(async()=>{if(typeof pipelineAdmission.prepareManyAndPublish==='function')await pipelineAdmission.prepareManyAndPublish(objects.map(object=>({object,options:{signal:controller.signal}})),publish);else{for(const object of objects)await pipelineAdmission.prepare(object,{signal:controller.signal});publish();}}).catch(error=>{if(closed||pending!==controller||controller.signal.aborted)return;pending=null;onError(error);});
 }
 let ruinReservation=null,acquiredRuin=null;
 function prepareRuin(reference,{signal,resident}){
  const source=centerSource(reference);
  const sample=latest,entity=sample?.entity,start=source.boundary.effectiveTime,end=source.end;
  const stamp=JSON.stringify(entity),parent=group.parent,meshes=group.children.map(mesh=>({mesh,geometry:mesh.geometry,material:mesh.material}));
  if(!entity||entity.id!==source.center||entity.kind!=='center'||entity.status!=='collapsing'||!(entity.hp>0)||
     !Number.isFinite(sample.time)||sample.time>start||!(confirmedCenterDamage(entity)>=.99)||
     !(entity.collapseRemaining-(start-sample.time)>1e-9&&entity.collapseRemaining-(end-sample.time)<=1e-9)||
     ruinReservation||acquiredRuin||!parent||!signal||!resident(entity,sample.time))throw Error('Center ruin source unavailable');
  let accepted=false,armed=false,attached=false,finished=false;
  const valid=()=>ruinReservation===part&&!closed&&enabled&&!pending&&group.visible&&group.parent===parent&&
   activeStage===key(stage(entity))&&latest?.time===sample.time&&latest.entity===entity&&JSON.stringify(entity)===stamp&&
   !signal.aborted&&resident(entity,sample.time)&&meshes.length===group.children.length&&meshes.every(({mesh,geometry,material},i)=>
    mesh===group.children[i]&&mesh.geometry===geometry&&mesh.material===material);
  const check=()=>{if(!valid())throw Error('Center ruin owner changed');};
  const part={object:group,signal,include:[],valid,eventRoots:()=>[group],presentation:()=>({show:[ash],hide:[body]}),
   capturePresentation(record){check();return damage.captureRuin(sample.time,end,record);},
   acceptCenterRuin(boundary,proof){check();if(!verifiesCenter(source,boundary,proof))throw Error('Center ruin receipt changed');accepted=true;},
   activate(){check();if(!accepted||armed)throw Error('Center ruin not acquired');armed=true;return true;},
   attach(){check();if(!armed||attached)throw Error('Center ruin not armed');attached=true;},
   rollback(){attached=false;armed=false;},
   finalize(){check();if(!attached||finished)throw Error('Center ruin not attached');finished=true;return {
    retire(){const ruined={...entity,status:'ruined',hp:0,collapseRemaining:entity.collapseRemaining-(end-sample.time)};
     damage.update(ruined,end);latest={entity:ruined,time:end};activeStage=key(stage(ruined));ruinReservation=null;
     acquiredRuin={publishedAt:sample.time,end,stamp};},
    notify(){}
   };},
   rollbackFinalized(){finished=false;},
   cancel(){if(ruinReservation!==part)return false;ruinReservation=null;return true;}
  };
  ruinReservation=part;
  if(!valid()){part.cancel();throw Error('Center ruin geometry unavailable');}
  return part;
 }
 function hide(){if(closed)return;enabled=false;cancel();group.visible=false;}
 return {group,update,hide,prepareRuin,get needsSoftDepth(){return enabled&&activeStage!==null&&damage.needsSoftDepth===true;},setSoftDepthEnabled(value){damage.setSoftDepthEnabled?.(value);},get ready(){return activeStage!==null&&enabled;},get upToDate(){return enabled&&activeStage!==null&&pending===null&&activeStage===key(stage(latest.entity));},prepare(camera){if(enabled&&activeStage!==null)damage.prepare(camera);},status(){return damage.status();},dispose(){if(closed)return;closed=true;cancel();group.removeFromParent();if(typeof pipelineAdmission.deferCompilations==='function')pipelineAdmission.deferCompilations(()=>damage.dispose());else damage.dispose();}};
}
