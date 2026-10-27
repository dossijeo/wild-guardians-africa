import {BALANCE} from './balance.js';
import {retreatAnimal} from './raids.js';
import {emit} from './game.js';
export const ATTACK=BALANCE.spells.find(s=>s.id==='attack');
export function attackTarget(state,id){return state.raid?.animals.find(a=>a.id===id&&!['gone','retreating'].includes(a.status))??null;}
export function applyGuardianAttack(state,animal,{origin,contact}={}){
 const profile=ATTACK.profiles[animal.species],floor=0;
 const at=contact??{x:animal.x,y:floor+animal.radius,z:animal.z};
 const from=origin??{x:animal.x-2,y:at.y+1,z:animal.z+2};
 const dx=at.x-from.x,dy=at.y-from.y,dz=at.z-from.z,length=Math.hypot(dx,dy,dz)||1;
 const direction={x:dx/length,y:dy/length,z:dz/length};
 animal.magicHealth=Math.max(0,(animal.magicHealth??profile.resilience)-ATTACK.damage);
 animal.magicStunUntil=state.elapsed+profile.stun;
 animal.magicImpact={at:state.elapsed,point:{...at},direction,intensity:1,health:animal.magicHealth,origin:{...from}};
 animal.hitApplied=true;animal.attackRemaining=0;animal.path=null;
 if(animal.status==='attacking')animal.status='walking';
 emit(state,'GuardianMagicHit',{targetId:animal.id,species:animal.species,damage:ATTACK.damage,health:animal.magicHealth,presentation:{x:at.x,y:at.y,z:at.z,elapsed:state.elapsed,direction,origin:{...from}}});
 if(animal.magicHealth===0)retreatAnimal(state,animal,'magic-resilience-exhausted');
 return animal.magicImpact;
}
