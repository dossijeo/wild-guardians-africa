import {guardianImpactTime,GUARDIAN_ATTACK_TIMING} from '../simulation/guardian-timing.js';

// Presentation-only recoil. It never changes the actor, collider or game state.
// The authoritative pose replaces it when the matching command settles.
export class ProvisionalBeastImpact {
 constructor({now=()=>performance.now()}={}){this.now=now;this.byTarget=new Map();this.byCommand=new Map();}
 begin(command,state,surface){
  if(command?.kind!=='castAttack'||typeof command.id!=='string'||typeof command.targetId!=='string')return false;
  const animal=state.raid?.animals.find(a=>a.id===command.targetId);if(!animal||this.byTarget.has(animal.id))return false;
  const ground=surface(animal.x,animal.z),contact=command.selection?.contact??{x:animal.x,y:ground+(animal.radius??.7),z:animal.z},origin=command.selection?.origin??{x:animal.x-2,y:contact.y+1,z:animal.z+2};
  const dx=contact.x-origin.x,dy=contact.y-origin.y,dz=contact.z-origin.z,length=Math.hypot(dx,dy,dz)||1;
  if(![ground,contact.x,contact.y,contact.z,dx,dy,dz].every(Number.isFinite))return false;
  const startedAt=this.now(),hit={at:-startedAt-1,impactAt:GUARDIAN_ATTACK_TIMING.impact,point:{...contact},direction:{x:dx/length,y:dy/length,z:dz/length},intensity:1,ground};
  const entry={id:command.id,targetId:animal.id,startedAt,hit};this.byTarget.set(animal.id,entry);this.byCommand.set(command.id,entry);return true;
 }
 sample(animal,simulationTime){const entry=this.byTarget.get(animal.id);if(!entry||animal.magicDown||animal.magicImpact&&simulationTime-guardianImpactTime(animal.magicImpact)<=1.1)return null;const age=Math.max(0,(this.now()-entry.startedAt)/1000);if(age<guardianImpactTime(entry.hit)||age>guardianImpactTime(entry.hit)+1.1)return null;return {animal:{...animal,magicImpact:entry.hit},elapsed:age};}
 end(id){const entry=this.byCommand.get(id);if(!entry)return false;this.byCommand.delete(id);if(this.byTarget.get(entry.targetId)===entry)this.byTarget.delete(entry.targetId);return true;}
 clear(){this.byTarget.clear();this.byCommand.clear();}
}
