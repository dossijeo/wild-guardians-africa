import {GUARDIAN_ATTACK_TIMING} from '../simulation/guardian-timing.js';

// Presentation-only launch gate. Target eligibility and damage remain with
// the authoritative simulation; command IDs keep late responses from
// changing a more recent gesture.
export function createEarlyGpuAttackGesture({state,clock=()=>performance.now()}={}){
 if(!state||typeof clock!=='function')throw TypeError('Invalid attack gesture state');
 let gesture=null;
 return {
  canBegin(){if(!gesture)return true;return gesture.provisional?(clock()-gesture.started)/1000>=GUARDIAN_ATTACK_TIMING.gestureEnd:state.elapsed-gesture.at>=GUARDIAN_ATTACK_TIMING.gestureEnd;},
  begin(command){if(command?.kind==='castAttack')gesture={id:command.id,started:clock(),provisional:true};},
  confirm(id){if(gesture?.id===id)gesture={id,at:state.guardianAttackStartedAt??state.elapsed,provisional:false};},
  reject(id){if(gesture?.id===id)gesture=null;}
 };
}
