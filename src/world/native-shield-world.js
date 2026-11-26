import {BALANCE} from '../simulation/balance.js';
import {copyNativeWorldBoundary,sameNativeWorldBoundary} from './native-world-boundary.js';

const duration=BALANCE.spells.find(spell=>spell.id==='shield').duration_seconds;


const cropStopIds=['actorId','assignmentSequence','generation','bodyId','targetId','routeTicket'];
const cropStopPose=['x','z','phase','yaw'];
export function copyNativeShieldCropStop(value){
 const worldBoundary=copyNativeWorldBoundary(value?.worldBoundary);
 if(!worldBoundary||value.version!==1||!cropStopIds.every(k=>Number.isSafeInteger(value[k])&&value[k]>0)||
    value.routeTicket>=worldBoundary.ticket||!Number.isSafeInteger(value.slot)||value.slot<0||
    !cropStopPose.every(k=>Number.isFinite(value[k]))||value.phase<0||
    (value.removal===true?typeof value.running!=='boolean':value.removal!==undefined||value.running!==undefined))
   throw Error('Invalid native Shield crop stop');
 return Object.freeze({version:1,worldBoundary,slot:value.slot,...(value.removal?{removal:true,running:value.running}:{}),
  ...Object.fromEntries([...cropStopIds,...cropStopPose].map(k=>[k,value[k]]))});
}
export function sameNativeShieldCropStop(a,b){
 return !!a&&!!b&&a.slot===b.slot&&a.removal===b.removal&&a.running===b.running&&sameNativeWorldBoundary(a.worldBoundary,b.worldBoundary)&&
  [...cropStopIds,...cropStopPose].every(k=>a[k]===b[k]);
}
export function shieldCropStopFromProposal(resources,source,running){
 const row=resources.routeEffects.rows;
 if(!row.length)return null;
 if(!nativeShieldWorldKind(resources.kind)||resources.retainsNativeAssignments||resources.gateEffects.rows.length||row.length!==26||
    ![source.actorId,source.assignmentSequence,source.routeHandle.slot,source.routeHandle.generation,source.bodyId,0,
     resources.worldBoundary.effectiveTime,0].every((value,i)=>value===row[i]))
   throw Error('Shield route stop differs from its acquired crop');
 return copyNativeShieldCropStop({version:1,worldBoundary:resources.worldBoundary,actorId:row[0],assignmentSequence:row[1],
  ...(resources.kind===4?{removal:true,running}:{}),
  slot:row[2],generation:row[3],bodyId:row[4],x:row[8],z:row[9],phase:row[11],yaw:row[12],targetId:source.targetId,routeTicket:source.worldBoundary.ticket});
}
export function nativeShieldWorldKind(kind){return kind===3||kind===4;}

export function copyNativeShieldWorld(value,kind,{proposal=false}={}){
 const spell=value?.spell,id=value?.polygonId;
 if(!nativeShieldWorldKind(kind)||!spell||spell.kind!=='shield'||typeof spell.id!=='string'||!spell.id||
    ![spell.x,spell.z,spell.radius,spell.remaining].every(Number.isFinite)||spell.radius<=0||
    spell.remaining<0||spell.remaining>duration||kind===3&&spell.remaining!==duration||
    (proposal&&kind===3?id!==null:!Number.isInteger(id)||id<=0||id>0x7fffffff))
  throw TypeError('Invalid native shield world declaration');
 return Object.freeze({spell:Object.freeze({id:spell.id,kind:'shield',x:spell.x,z:spell.z,radius:spell.radius,remaining:spell.remaining}),polygonId:id});
}

export function sameNativeShieldWorld(a,b,{addition=false}={}){
 return !!a&&!!b&&(addition||a.polygonId===b.polygonId)&&
  ['id','x','z','radius','remaining'].every(key=>a.spell[key]===b.spell[key]);
}
