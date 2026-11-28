import {Matrix4,Mesh,SkinnedMesh,Vector3,Vector4} from 'three';

// Experimental height-only skinning. Cache each bone's contribution to the
// parent-relative vertical row for this mesh and this pose; unlike a whole
// skinned vertex, the caller never needs the unused horizontal coordinates.
export class GroundSkinSampler {
 constructor(){this.row=new Matrix4();this.bone=new Matrix4();this.base=new Vector3();this.indices=new Vector4();this.weights=new Vector4();this.rows=new Float64Array(0);}
 bind(mesh,meshToRoot){
  this.mesh=mesh;this.meshToRoot=meshToRoot;this.fast=mesh.getVertexPosition===SkinnedMesh.prototype.getVertexPosition&&mesh.applyBoneTransform===SkinnedMesh.prototype.applyBoneTransform;
  const affine=m=>{const e=m.elements;return e[3]===0&&e[7]===0&&e[11]===0&&e[15]===1;};
  if(!affine(mesh.bindMatrixInverse))this.fast=false;
  if(!this.fast)return;
  this.row.multiplyMatrices(meshToRoot,mesh.bindMatrixInverse);const e=this.row.elements,n=mesh.skeleton.bones.length;
  if(this.rows.length<n*4)this.rows=new Float64Array(n*4);
  this.offset=e[13];
  for(let i=0;i<n;i++){
   this.bone.multiplyMatrices(mesh.skeleton.bones[i].matrixWorld,mesh.skeleton.boneInverses[i]);const b=this.bone.elements,k=i*4;
   if(b[3]!==0||b[7]!==0||b[11]!==0||b[15]!==1){this.fast=false;return;}
   this.rows[k]=e[1]*b[0]+e[5]*b[1]+e[9]*b[2];this.rows[k+1]=e[1]*b[4]+e[5]*b[5]+e[9]*b[6];this.rows[k+2]=e[1]*b[8]+e[5]*b[9]+e[9]*b[10];this.rows[k+3]=e[1]*b[12]+e[5]*b[13]+e[9]*b[14];
  }
 }
 height(index){
  const mesh=this.mesh;
  if(!this.fast){mesh.getVertexPosition(index,this.base);const e=this.meshToRoot.elements;return e[1]*this.base.x+e[5]*this.base.y+e[9]*this.base.z+e[13];}
  Mesh.prototype.getVertexPosition.call(mesh,index,this.base);this.base.applyMatrix4(mesh.bindMatrix);
  this.indices.fromBufferAttribute(mesh.geometry.attributes.skinIndex,index);this.weights.fromBufferAttribute(mesh.geometry.attributes.skinWeight,index);
  const p=this.base,rows=this.rows;let y=this.offset;
  for(let i=0;i<4;i++){const weight=this.weights.getComponent(i);if(weight!==0){const k=this.indices.getComponent(i)*4;y+=weight*(rows[k]*p.x+rows[k+1]*p.y+rows[k+2]*p.z+rows[k+3]);}}
  return y;
 }
}
