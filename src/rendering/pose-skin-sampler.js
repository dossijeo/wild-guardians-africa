import {Matrix4,Mesh} from 'three';

// Valid for one synchronous pose scan. Refresh after animation or transforms.
// Use Mesh's morph handling and preserve Three's bind/skin/world operation order.
export function poseSkinSampler(mesh){
 const matrices=new Float64Array(mesh.skeleton.bones.length*16),matrix=new Matrix4();
 for(let i=0;i<mesh.skeleton.bones.length;i++)matrix.multiplyMatrices(mesh.skeleton.bones[i].matrixWorld,mesh.skeleton.boneInverses[i]).toArray(matrices,i*16);
 const {skinIndex,skinWeight}=mesh.geometry.attributes;
 return (index,target)=>{
  Mesh.prototype.getVertexPosition.call(mesh,index,target);
  target.applyMatrix4(mesh.bindMatrix);
  const x=target.x,y=target.y,z=target.z;let sx=0,sy=0,sz=0;
  for(let k=0;k<4;k++){
   const w=skinWeight.getComponent(index,k);if(!w)continue;
   const o=skinIndex.getComponent(index,k)*16;
   const denominator=1/(matrices[o+3]*x+matrices[o+7]*y+matrices[o+11]*z+matrices[o+15]);
   sx+=((matrices[o]*x+matrices[o+4]*y+matrices[o+8]*z+matrices[o+12])*denominator)*w;
   sy+=((matrices[o+1]*x+matrices[o+5]*y+matrices[o+9]*z+matrices[o+13])*denominator)*w;
   sz+=((matrices[o+2]*x+matrices[o+6]*y+matrices[o+10]*z+matrices[o+14])*denominator)*w;
  }
  return target.set(sx,sy,sz).applyMatrix4(mesh.bindMatrixInverse).applyMatrix4(mesh.matrixWorld);
 };
}
