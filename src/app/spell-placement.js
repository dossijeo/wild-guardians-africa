import {cast} from '../simulation/game.js';

// A tall crop can occlude terrain several metres behind it. Entity selection
// takes precedence so a power aimed at that crop actually covers the crop.
export function resolvePickedSpell(state,kind,{entityId,point,hitPoint,origin}){
  if(kind==='attack'){const animal=state.raid?.animals.find(a=>a.id===entityId);if(!animal)throw new Error('Selecciona una bestia activa');return {x:animal.x,z:animal.z,selection:{targetId:animal.id,origin,contact:hitPoint}};}
  const plant=state.plants.find(p=>p.id===entityId&&p.alive);
  if(kind!=='shield'){
    if(!plant)return null;
    return {x:plant.x,z:plant.z,selection:{targetId:plant.id,origin,contact:hitPoint}};
  }
  const target=plant??point??state.structures.find(s=>s.id===entityId);
  if(!target)return null;
  return {x:target.x,z:target.z,selection:{origin,contact:hitPoint}};
}
export function castPickedSpell(state,id,kind,pick,nav){
  const target=resolvePickedSpell(state,kind,pick);return target?cast(state,id,kind,target.x,target.z,nav,target.selection):false;
}
// Materialize presentation coordinates at selection time: functions and Three
// vectors cannot be sent as authoritative commands. Wild Engine revalidates.
export function pickedSpellCommand(state,id,kind,pick){
  const target=resolvePickedSpell(state,kind,pick);if(!target)return null;
  let origin=target.selection.origin;if(typeof origin==='function'){try{origin=origin();}catch{origin=null;}}
  const point=value=>value==null?null:{x:value.x,y:value.y,z:value.z};
  const selection={origin:point(origin),contact:point(target.selection.contact)};
  if(kind==='attack')return {kind:'castAttack',id,targetId:target.selection.targetId,x:target.x,z:target.z,selection};
  if(kind==='shield')return {kind:'castShield',id,x:target.x,z:target.z,selection};
  if(kind==='growth'||kind==='multiply')return {kind:'castAgricultural',spell:kind,id,x:target.x,z:target.z,selection:{...selection,targetId:target.selection.targetId}};
  throw Error('Magia desconocida');
}
// The local route remains synchronous. A Worker-backed scene resolves only
// after the ordered authoritative publication has reached presentation.
export function dispatchPickedSpell(state,id,kind,pick,nav,runtime=null){
  if(!runtime)return castPickedSpell(state,id,kind,pick,nav);
  const command=pickedSpellCommand(state,id,kind,pick);if(!command)return false;
  return runtime.submit(command).then(result=>{if(result.rejection)throw Error(result.rejection);return result.value;});
}
