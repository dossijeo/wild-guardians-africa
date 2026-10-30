import {guardianHandPosition} from './guardian-hand-emitters.js';
import * as THREE from 'three';
import {createVfxGeometries} from './vfx-native.js';
import {RITUAL} from './awakening-presentation.js';
const ease=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
// Reuses the native curved leaf mesh, with a fixed-size instanced draw.
export class GuardianRitual {
 constructor(scene){
  const data=createVfxGeometries().leaf,buffer=new THREE.InterleavedBuffer(data,6);
  this.geometry=new THREE.BufferGeometry();this.geometry.setAttribute('position',new THREE.InterleavedBufferAttribute(buffer,3,0));this.geometry.setAttribute('normal',new THREE.InterleavedBufferAttribute(buffer,3,3));
  this.material=new THREE.MeshBasicMaterial({color:0x38ffd1,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,toneMapped:false});
  this.leaves=new THREE.InstancedMesh(this.geometry,this.material,48);this.leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.leaves.frustumCulled=false;this.leaves.visible=false;scene.add(this.leaves);
  this.temp=new THREE.Object3D();this.hand=new THREE.Vector3();this.point=new THREE.Vector3();this.scene=scene;
 }
 update(owner,s,age){
  const w=owner.world,concentration=ease((age-.2)/.45)*(1-ease((age-RITUAL.pulse)/.45));
  const fade=ease(age/.25)*(1-ease((age-2.35)/.45));
  s.group.visible=true;s.group.position.set(s.origin.x,s.origin.y+Math.sin(age*Math.PI/RITUAL.duration)*.16,s.origin.z);
  const targetYaw=Math.atan2(w.camera.position.x-s.origin.x,w.camera.position.z-s.origin.z);
  s.group.rotation.y=targetYaw;
  for(const [name,a] of s.actions){a.enabled=['Idle','Float','Mantle_Breeze'].includes(name);a.weight=1;a.time=age%a.getClip().duration;}s.pose.update();
  s.face.update(null,age,{blink:concentration,expression:{name:'focus',value:concentration*.25}});
  s.group.updateMatrixWorld(true);
  s.lapPose.update(concentration);
  for(const {bone,phase} of s.wind){bone.rotation.z+=.08*concentration*Math.sin(age*5-phase);bone.rotation.x+=.1*concentration*Math.sin(age*4-phase);}
  s.group.updateMatrixWorld(true);
  const pulse=Math.exp(-(((age-RITUAL.pulse)/.13)**2));
  for(const m of s.materials){m.opacity=fade;m.uniforms.opacity.value=fade;m.uniforms.uSpiritTint.value.setHex(0x68ffda);m.uniforms.uSpiritGlow.value=.12+.65*pulse;m.uniforms.uReveal.value=ease((age-.08)/.4)*1.12;m.uniforms.uDissolve.value=ease((age-2.35)/.45)*1.05;m.uniforms.uBottom.value=s.group.position.y+s.bottom;m.uniforms.uHeight.value=s.height;}
  s.vortex.position.copy(s.group.position);s.vortex.update(age/ RITUAL.duration*2.2,0x68ffda,s.height,s.bottom);
  this.leaves.visible=age>.3&&age<2.45;this.material.opacity=ease((age-.3)/.2)*(1-ease((age-2.1)/.35));
  const radius=s.ritualTarget?.kind==='wall'?1.8:Math.max(.8,Math.min(1.6,s.ritualHeight*.6));
  for(let i=0;i<48;i++){
   const hand=s.hands[i%2];if(hand)guardianHandPosition(s.handEmitters,hand,this.hand);else this.hand.copy(s.group.position);
   const t=THREE.MathUtils.clamp((age-.32-i/48*.65)/1.18,0,1),orbit=ease(t/.3),theta=i*2.39996+t*Math.PI*4;
   this.point.copy(s.group.position).lerp(s.target,ease(t));if(s.ritualArc){const wave=Math.sin(Math.PI*ease(t));this.point.x+=s.ritualArc.x*wave;this.point.y+=s.ritualArc.y*wave;this.point.z+=s.ritualArc.z*wave;}this.point.x+=Math.cos(theta)*radius*Math.sin(Math.PI*t);this.point.z+=Math.sin(theta)*radius*Math.sin(Math.PI*t);
   this.temp.position.copy(this.hand).lerp(this.point,orbit);this.temp.rotation.set(t*5+i,theta,t*3);this.temp.scale.setScalar((.2+.15*(i%3)/2)*Math.sin(Math.PI*t));this.temp.updateMatrix();this.leaves.setMatrixAt(i,this.temp.matrix);
  }
  this.leaves.instanceMatrix.needsUpdate=true;
  s.beam.visible=false;s.aura.visible=false;s.core.visible=false;s.impact.visible=age>=RITUAL.pulse&&age<2.55;s.material.color.setHex(0x57ffdc);s.material.opacity=(1-ease((age-RITUAL.pulse)/.5))*.85;
  s.impact.position.copy(s.target);s.impact.position.y+=.1;s.impact.rotation.set(-Math.PI/2,0,0);s.impact.scale.setScalar(radius+Math.max(0,age-RITUAL.pulse)*4);
 }
 hide(){this.leaves.visible=false;}
 dispose(){this.scene.remove(this.leaves);this.leaves.dispose();this.geometry.dispose();this.material.dispose();}
}
