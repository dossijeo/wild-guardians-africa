import {guardianImpactTime} from '../simulation/guardian-timing.js';
import {ATTACK} from '../simulation/guardian-combat.js';
import {Vector3} from 'three';
const IMPACT_DURATION=1.1;
const X=new Vector3(1,0,0),Z=new Vector3(0,0,1);
export function captureAnimalImpact(data,animal,elapsed=animal.magicImpact?.at){
 const hit=animal.magicImpact;if(!hit||elapsed<guardianImpactTime(hit)||elapsed-guardianImpactTime(hit)>IMPACT_DURATION)return;
 if(!data.impactBones){let reacting=0;data.impactBones=[];data.model.traverse(bone=>{if(bone.isBone)data.impactBones.push({bone,base:bone.quaternion.clone(),hit:bone.quaternion.clone(),reactive:/spine|chest|head/i.test(bone.name)&&reacting++<3});});}
 if(data.impactAt!==animal.magicImpact.at){data.impactAt=animal.magicImpact.at;for(const e of data.impactBones)e.hit.copy(e.bone.quaternion);}
}
// Restore the authored pose before sampling it again; offsets never accumulate.
export function restoreAnimalImpact(data){
 if(!data.impactApplied)return;
 data.impactApplied=false;
 for(const entry of data.impactBones)entry.bone.quaternion.copy(entry.base);
 if(data.impactModelBase)data.model.quaternion.copy(data.impactModelBase);
}
export function impactResponse(animal,elapsed){
 const hit=animal.magicImpact,profile=ATTACK.profiles[animal.species];if(!hit||!profile)return null;
 const age=elapsed-guardianImpactTime(hit);if(age<0||age>IMPACT_DURATION)return null;
 // Closed-form damped spring: sampled from impact time, stable at low FPS.
 const frequency=14/Math.sqrt(profile.mass),damping=6/Math.sqrt(profile.mass);
 const pulse=Math.sin(age*frequency)*Math.exp(-age*damping),heading=animal.heading??0,c=Math.cos(heading),s=Math.sin(heading),dx=hit.direction.x*c-hit.direction.z*s,dz=hit.direction.x*s+hit.direction.z*c;
 const lever=Math.max(-1,Math.min(1,(hit.point.x-animal.x)*c-(hit.point.z-animal.z)*s));
 const height=Math.max(.5,Math.min(1.4,(hit.point.y-(hit.ground??hit.point.y)+.5)/Math.max(.5,animal.radius??.7))),power=Math.max(0,Math.min(2,hit.intensity??1));
 const longitudinal=((hit.point.x-animal.x)*s+(hit.point.z-animal.z)*c)/Math.max(.5,animal.radius??.7);
 return {pitch:(-dz-Math.min(0,hit.direction.y)*.45+Math.max(-1,Math.min(1,longitudinal))*hit.direction.y*.2)*profile.reaction*pulse*power*height,roll:(dx+lever*.25)*profile.reaction*pulse*power*height,yaw:lever*.08*pulse*power/profile.mass};
}
export function applyAnimalImpact(data,animal,elapsed){
 const r=impactResponse(animal,elapsed);if(!r)return;
 if(!data.impactBones)captureAnimalImpact(data,animal,elapsed);
 if(!data.impactBones)return;
 for(const entry of data.impactBones)entry.base.copy(entry.bone.quaternion);
 if(!data.impactModelBase)data.impactModelBase=data.model.quaternion.clone();
 else data.impactModelBase.copy(data.model.quaternion);
 data.impactApplied=true;
 const blend=Math.min(1,Math.max(0,(elapsed-guardianImpactTime(animal.magicImpact))/.16));
 if(blend<1)for(const entry of data.impactBones)entry.bone.quaternion.slerpQuaternions(entry.hit,entry.base,blend*blend*(3-2*blend));
 data.model.rotateOnWorldAxis(X,r.pitch*.25);data.model.rotateOnWorldAxis(Z,r.roll*.25);
 for(const entry of data.impactBones)if(entry.reactive){entry.bone.rotateX(r.pitch*.65);entry.bone.rotateZ(-r.roll*.65);entry.bone.rotateY(r.yaw);}
 data.model.updateMatrixWorld(true);
}
