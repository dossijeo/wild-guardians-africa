import {guardianImpactTime,GUARDIAN_ATTACK_TIMING} from '../simulation/guardian-timing.js';
import {impactResponse} from './animal-impact.js';

// Presentation-only recoil. It never changes the actor, collider or game state.
// The authoritative pose replaces it when the matching command settles.
export class ProvisionalBeastImpact {
 constructor({now=()=>performance.now()}={}){this.now=now;this.byTarget=new Map();this.byCommand=new Map();}
 begin(command,state,surface,anchor=null){
  if(command?.kind!=='castAttack'||typeof command.id!=='string'||!command.id||typeof command.targetId!=='string'||!command.targetId||this.byCommand.has(command.id))return false;
  const animal=state.raid?.animals.find(a=>a.id===command.targetId);if(!animal||this.byTarget.has(animal.id))return false;
  if(anchor!==null&&(!anchor||![anchor.x,anchor.y,anchor.z,anchor.yaw,anchor.at,anchor.horizon].every(Number.isFinite)||anchor.at>anchor.horizon))return false;const x=anchor?.x??animal.x,z=anchor?.z??animal.z;const ground=surface(x,z),contact=command.selection?.contact??{x,y:ground+(animal.radius??.7),z},origin=command.selection?.origin??{x:x-2,y:contact.y+1,z:z+2};
  const dx=contact.x-origin.x,dy=contact.y-origin.y,dz=contact.z-origin.z,length=Math.hypot(dx,dy,dz)||1;
  if(![ground,contact.x,contact.y,contact.z,dx,dy,dz].every(Number.isFinite))return false;
  const startedAt=this.now(),hit={at:-startedAt-1,impactAt:GUARDIAN_ATTACK_TIMING.impact,point:{...contact},direction:{x:dx/length,y:dy/length,z:dz/length},intensity:1,ground};
  const entry={id:command.id,targetId:animal.id,startedAt,hit,...(anchor?{anchor:{...anchor}}:{})};this.byTarget.set(animal.id,entry);this.byCommand.set(command.id,entry);return true;
 }
 sample(animal,simulationTime,{holdUntilPhysical=false}={}){const entry=this.byTarget.get(animal.id);if(!entry)return null;const age=Math.max(0,(this.now()-entry.startedAt)/1000),impact=guardianImpactTime(entry.hit);if(!holdUntilPhysical&&(animal.magicDown||animal.magicImpact&&simulationTime-guardianImpactTime(animal.magicImpact)<=1.1)||age<impact||!holdUntilPhysical&&age>impact+1.1){entry.lastSample=null;return null;}const elapsed=holdUntilPhysical?Math.min(age,impact+1.1):age,visual={...animal,magicImpact:entry.hit};entry.lastSample={age:elapsed,animal:visual};entry.lastAppliedAge=elapsed;entry.sampleCount=(entry.sampleCount??0)+1;return {animal:visual,elapsed};}
 physicalPose(targetId){const entry=this.byTarget.get(targetId);if(entry)entry.lastSample=null;}
 end(id){const entry=this.byCommand.get(id);if(!entry)return false;const sample=entry.lastSample;this.lastResolution={targetId:entry.targetId,elapsed:(this.now()-entry.startedAt)/1000,sampleCount:entry.sampleCount??0,lastAppliedAge:entry.lastAppliedAge??null,lastSample:sample?{age:sample.age,response:impactResponse(sample.animal,sample.age)}:null};this.byCommand.delete(id);if(this.byTarget.get(entry.targetId)===entry)this.byTarget.delete(entry.targetId);return true;}
 clear(){this.byTarget.clear();this.byCommand.clear();}
}
