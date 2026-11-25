import {BALANCE} from '../simulation/balance.js';

const duration=BALANCE.spells.find(spell=>spell.id==='shield').duration_seconds;

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
