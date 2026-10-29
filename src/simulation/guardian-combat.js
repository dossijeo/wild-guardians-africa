import {GUARDIAN_ATTACK_TIMING} from './guardian-timing.js';
import {BALANCE} from './balance.js';
import {retreatAnimal,interruptAnimalAttack} from './raids.js';
import {emit} from './game.js';
export const ATTACK=BALANCE.spells.find(s=>s.id==='attack');
export function attackTarget(state,id){return state.raid?.animals.find(a=>a.id===id&&!['gone','retreating'].includes(a.status))??null;}
export function applyGuardianAttack(state,animal,{nav,origin,contact,ground=0}={}){
 const profile=ATTACK.profiles[animal.species],floor=ground;
 const at=contact??{x:animal.x,y:floor+animal.radius,z:animal.z};
 const from=origin??{x:animal.x-2,y:at.y+1,z:animal.z+2};
 const dx=at.x-from.x,dy=at.y-from.y,dz=at.z-from.z,length=Math.hypot(dx,dy,dz)||1;
 const direction={x:dx/length,y:dy/length,z:dz/length};
 animal.magicHealth=Math.max(0,(animal.magicHealth??profile.resilience)-ATTACK.damage);
 // Even resistant species must stay at the selected contact through flight.
 // Their configured stun can be shorter than the shared presentation marker.
 animal.magicStunUntil=state.elapsed+Math.max(profile.stun,GUARDIAN_ATTACK_TIMING.impact);
 animal.magicImpact={at:state.elapsed,impactAt:state.elapsed+GUARDIAN_ATTACK_TIMING.impact,point:{...at},direction,intensity:1,ground,health:animal.magicHealth,origin:{...from}};
 interruptAnimalAttack(state,animal,nav);
 emit(state,'GuardianMagicHit',{targetId:animal.id,species:animal.species,damage:ATTACK.damage,health:animal.magicHealth,presentation:{x:at.x,y:at.y,z:at.z,elapsed:state.elapsed,cueAt:animal.magicImpact.impactAt,direction,origin:{...from}}});
 if(animal.magicHealth===0)retreatAnimal(state,animal,'magic-resilience-exhausted',nav);
 return animal.magicImpact;
}
