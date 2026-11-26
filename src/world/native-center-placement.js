const centerId=/^structure-[1-9]\d*$/;
const propId=/^spatial:[0-5]:-?\d+:-?\d+$/;
const fields=['id','kind','status','culture','villageId','x','z','yaw','hp','maxHp'];
const positiveId=id=>Number.isInteger(id)&&id>0&&id<=0x7fffffff;

export function copyNativeCenterPlacement(value,{committed=false}={}){
 const entity=value?.entity,polygonId=value?.polygonId;
 if(value?.version!==1||typeof value.commandId!=='string'||!value.commandId||
    typeof entity?.id!=='string'||!centerId.test(entity.id)||!positiveId(Number(entity.id.slice(10)))||
    entity.kind!=='center'||entity.status!=='intact'||typeof entity.culture!=='string'||!entity.culture||
    typeof entity.villageId!=='string'||!entity.villageId||![entity.x,entity.z,entity.yaw,entity.hp,entity.maxHp].every(Number.isFinite)||
    entity.hp<=0||entity.hp!==entity.maxHp||!Array.isArray(value.suppressed)||
    value.suppressed.some(id=>typeof id!=='string'||!propId.test(id)||id.split(':').slice(2).map(Number).some(n=>!Number.isInteger(n)||n<-2147483648||n>2147483647))||
    new Set(value.suppressed).size!==value.suppressed.length||(committed?!positiveId(polygonId):polygonId!==undefined))
  throw TypeError('Invalid native center placement');
 return Object.freeze({version:1,commandId:value.commandId,entity:Object.freeze(Object.fromEntries(fields.map(key=>[key,entity[key]]))),
  suppressed:Object.freeze([...value.suppressed].sort()),...(committed?{polygonId}:{})});
}

export function sameNativeCenterEntity(a,b){return fields.every(key=>a?.[key]===b?.[key]);}

export function sameNativeCenterPlacement(a,b){
 return !!a&&!!b&&a.commandId===b.commandId&&sameNativeCenterEntity(a.entity,b.entity)&&
  a.suppressed.length===b.suppressed.length&&a.suppressed.every((id,index)=>id===b.suppressed[index]);
}
