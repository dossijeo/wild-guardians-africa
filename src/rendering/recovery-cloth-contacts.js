import {Quaternion,Vector3} from 'three';

// Local articulated cloth correction during get-up only. Bone translations and
// lengths remain authored; any residual penetration is handled by body grounding.
export class RecoveryClothContacts{
 constructor(binding,samples){
  this.entries=[];this.clothSamples=new Set();
  for(const [name,bone]of binding.bones)if(/^ClothRear_.*_0[1-3]$/.test(name))this.entries.push({bone,samples:[]});
  for(const sample of samples){const {mesh,index}=sample,{skinIndex:indices,skinWeight:weights}=mesh.geometry.attributes;let best=0;for(let k=1;k<4;k++)if(weights.getComponent(index,k)>weights.getComponent(index,best))best=k;let bone=mesh.skeleton.bones[indices.getComponent(index,best)];
   while(bone?.isBone){const entry=this.entries.find(e=>e.bone===bone);if(entry){entry.samples.push(sample);this.clothSamples.add(sample);}bone=bone.parent;}
  }
  this.point=new Vector3();this.lowest=new Vector3();this.start=new Vector3();this.direction=new Vector3();this.wanted=new Vector3();this.rotation=new Quaternion();this.world=new Quaternion();this.parent=new Quaternion();this.identity=new Quaternion();
 }
 resolve(surface,weight){
  if(weight<=0)return;
  for(let pass=0;pass<2;pass++)for(const {bone,samples}of this.entries){
   let penetration=0;for(const {mesh,index}of samples){mesh.getVertexPosition(index,this.point).applyMatrix4(mesh.matrixWorld);const depth=surface(this.point.x,this.point.z)+.015-this.point.y;if(depth>penetration){penetration=depth;this.lowest.copy(this.point);}}
   if(penetration<=0)continue;
   bone.getWorldPosition(this.start);this.direction.copy(this.lowest).sub(this.start);const length=this.direction.length();if(length<1e-5)continue;
   this.wanted.copy(this.direction);const horizontal=Math.hypot(this.wanted.x,this.wanted.z),vertical=Math.min(.98,Math.max(-.98,(this.direction.y+penetration)/length));
   this.wanted.set(horizontal>1e-6?this.wanted.x/horizontal:1,0,horizontal>1e-6?this.wanted.z/horizontal:0).multiplyScalar(Math.sqrt(1-vertical*vertical));this.wanted.y=vertical;
   this.rotation.setFromUnitVectors(this.direction.normalize(),this.wanted);const angle=this.identity.angleTo(this.rotation);this.rotation.slerp(this.identity,1-weight*Math.min(1,.6/Math.max(angle,1e-6)));
   bone.getWorldQuaternion(this.world).normalize();bone.parent.getWorldQuaternion(this.parent).normalize().invert();bone.quaternion.copy(this.parent.multiply(this.rotation).multiply(this.world));bone.updateWorldMatrix(false,true);
  }
 }
}
