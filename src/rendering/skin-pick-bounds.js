import {Box3,Matrix4,Sphere,Vector3} from 'three';

const cache=new WeakMap(),installed=new WeakSet();
const point=new Vector3(),local=new Box3(),part=new Box3(),bounds=new Box3(),matrix=new Matrix4();
const finite=p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z);
// A vertex with nonnegative skin weights is sum(weights) times a point in
// the convex hull of its transformed bone boxes. Include every facial morph
// combination in [0,1] while loading, so selection updates only bone boxes.
export function preparePickBounds(mesh){
 const g=mesh.geometry,p=g?.attributes.position,indices=g?.attributes.skinIndex,weights=g?.attributes.skinWeight,count=mesh.skeleton?.bones.length,morphs=g?.morphAttributes.position??[];
 if(!mesh.isSkinnedMesh||!p||!indices||!weights||!count)return null;
 const attributes=[p,indices,weights,...morphs],old=cache.get(g);
 if(old&&old.count===count&&old.bind.equals(mesh.bindMatrix)&&old.relative===g.morphTargetsRelative&&attributes.length===old.attributes.length&&attributes.every((a,i)=>a===old.attributes[i]&&a.version===old.versions[i]))return old;
 const boxes=Array.from({length:count},()=>new Box3());let minSum=Infinity,maxSum=0;
 for(let i=0;i<p.count;i++){
  point.fromBufferAttribute(p,i);local.min.copy(point);local.max.copy(point);
  for(const morph of morphs){
   for(let axis=0;axis<3;axis++){
    const d=morph.getComponent(i,axis)-(g.morphTargetsRelative?0:point.getComponent(axis));
    local.min.setComponent(axis,local.min.getComponent(axis)+Math.min(0,d));
    local.max.setComponent(axis,local.max.getComponent(axis)+Math.max(0,d));
   }
  }
  local.applyMatrix4(mesh.bindMatrix);if(!finite(local.min)||!finite(local.max))return null;
  let sum=0;
  for(let k=0;k<4;k++){
   const w=weights.getComponent(i,k),bone=indices.getComponent(i,k);
   if(!Number.isFinite(w)||w<0||!Number.isInteger(bone)||bone<0||bone>=count)return null;
   sum+=w;if(w>0)boxes[bone].union(local);
  }
  minSum=Math.min(minSum,sum);maxSum=Math.max(maxSum,sum);
 }
 const result={count,boxes,minSum,maxSum,bind:mesh.bindMatrix.clone(),attributes,versions:attributes.map(a=>a.version),relative:g.morphTargetsRelative};cache.set(g,result);return result;
}

export function updatePickBounds(mesh,envelope){
 if(!envelope||!mesh.bindMatrix.equals(envelope.bind)||mesh.skeleton.bones.length!==envelope.count||
  (mesh.morphTargetInfluences??[]).some(w=>!Number.isFinite(w)||w<0||w>1))return false;
 const attributes=[mesh.geometry.attributes.position,mesh.geometry.attributes.skinIndex,mesh.geometry.attributes.skinWeight,...(mesh.geometry.morphAttributes.position??[])];
 if(attributes.length!==envelope.attributes.length||attributes.some((a,i)=>a!==envelope.attributes[i]||a.version!==envelope.versions[i])||mesh.geometry.morphTargetsRelative!==envelope.relative)return false;
 bounds.makeEmpty();
 for(let i=0;i<envelope.count;i++){
  if(envelope.boxes[i].isEmpty())continue;
  matrix.multiplyMatrices(mesh.skeleton.bones[i].matrixWorld,mesh.skeleton.boneInverses[i]);
  bounds.union(part.copy(envelope.boxes[i]).applyMatrix4(matrix));
 }
 if(bounds.isEmpty())bounds.set(point.set(0,0,0),point);
 for(const axis of ['x','y','z']){
  const a=bounds.min[axis],b=bounds.max[axis],lo=envelope.minSum,hi=envelope.maxSum;
  bounds.min[axis]=Math.min(a*lo,a*hi,b*lo,b*hi);bounds.max[axis]=Math.max(a*lo,a*hi,b*lo,b*hi);
 }
 bounds.applyMatrix4(mesh.bindMatrixInverse);
 if(!finite(bounds.min)||!finite(bounds.max))return false;
 bounds.expandByScalar(1e-5*Math.max(1,bounds.min.length(),bounds.max.length()));
 mesh.boundingBox??=new Box3();mesh.boundingBox.copy(bounds);
 mesh.boundingSphere??=new Sphere();bounds.getBoundingSphere(mesh.boundingSphere);return true;
}

export function installSkinPicking(model){
 model.traverse(mesh=>{
  if(!mesh.isSkinnedMesh||installed.has(mesh))return;
  const envelope=preparePickBounds(mesh),raycast=mesh.raycast;installed.add(mesh);
  mesh.raycast=function(raycaster,hits){
   if(!updatePickBounds(this,envelope)){this.computeBoundingBox();this.boundingSphere??=new Sphere();this.boundingBox.getBoundingSphere(this.boundingSphere);}
   return raycast.call(this,raycaster,hits);
  };
 });
}
