// AnimationMixer may skip identical sampled transforms. Restore the last mixer
// pose before sampling so procedural layers never accumulate across renders.
export class GuardianPose {
 constructor(model,mixer){
  this.mixer=mixer;this.bones=[];
  model.traverse(bone=>{if(bone.isBone)this.bones.push({bone,position:bone.position.clone(),quaternion:bone.quaternion.clone(),scale:bone.scale.clone()});});
 }
 update(){
  for(const p of this.bones){p.bone.position.copy(p.position);p.bone.quaternion.copy(p.quaternion);p.bone.scale.copy(p.scale);}
  this.mixer.update(0);
  for(const p of this.bones){p.position.copy(p.bone.position);p.quaternion.copy(p.bone.quaternion);p.scale.copy(p.bone.scale);}
 }
}
