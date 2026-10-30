import {Matrix4,Mesh,Vector3} from 'three';

// Exact sparse contact sampling: prepare each bone matrix once per pose.
// The caller updates world matrices before sampling. No pose or skin is changed.
export class SkinContactSampler {
 constructor(samples){
  this.samples=samples;this.groups=new Map();this.base=new Vector3();this.point=new Vector3();this.part=new Vector3();
  for(let i=0;i<samples.length;i++){
   const {mesh,index}=samples[i];let group=this.groups.get(mesh);
   if(!group){group={entries:[],matrices:[],post:new Matrix4()};this.groups.set(mesh,group);}
   group.entries.push({index,offset:i*3});
  }
 }
 sample(out){
  if(out.length!==this.samples.length*3)throw Error('Invalid contact sample buffer');
  for(const [mesh,group] of this.groups){
   const skeleton=mesh.skeleton,g=mesh.geometry.attributes;
   for(let b=0;b<skeleton.bones.length;b++){
    const matrix=group.matrices[b]??(group.matrices[b]=new Matrix4());
    matrix.multiplyMatrices(skeleton.bones[b].matrixWorld,skeleton.boneInverses[b]);
   }
   group.post.multiplyMatrices(mesh.matrixWorld,mesh.bindMatrixInverse);
   for(const {index,offset} of group.entries){
    Mesh.prototype.getVertexPosition.call(mesh,index,this.base);this.base.applyMatrix4(mesh.bindMatrix);this.point.set(0,0,0);
    for(let k=0;k<4;k++){
     const weight=g.skinWeight.getComponent(index,k);if(!weight)continue;
     this.part.copy(this.base).applyMatrix4(group.matrices[g.skinIndex.getComponent(index,k)]);
     this.point.addScaledVector(this.part,weight);
    }
    this.point.applyMatrix4(group.post).toArray(out,offset);
   }
  }
  return out;
 }
}
