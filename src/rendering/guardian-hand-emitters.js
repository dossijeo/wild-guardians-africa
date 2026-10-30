import {Vector3} from 'three';

// Hand bones begin at the wrist. Fit a local emission point to their skin once,
// before animation; UV-split duplicates must not bias the surface centroid.
export function guardianHandEmitters(model){
 model.updateWorldMatrix(true,true);const points=new Map(),v=new Vector3();
 for(const side of ['L','R']){
  const bone=model.getObjectByName('Hand'+side)??model.getObjectByName('Hand.'+side);if(!bone)continue;
  const point=new Vector3(),seen=new Set();let count=0;
  model.traverse(mesh=>{
   if(!mesh.isSkinnedMesh)return;const joint=mesh.skeleton.bones.indexOf(bone);if(joint<0)return;
   const {position,skinIndex,skinWeight}=mesh.geometry.attributes;
   for(let i=0;i<position.count;i++){
    let weight=0;for(let k=0;k<4;k++)if(skinIndex.getComponent(i,k)===joint)weight+=skinWeight.getComponent(i,k);
    if(weight<.5)continue;
    mesh.getVertexPosition(i,v).applyMatrix4(mesh.matrixWorld);bone.worldToLocal(v);
    const key=v.toArray().map(n=>Math.round(n*1e6)).join(',');if(seen.has(key))continue;
    seen.add(key);point.add(v);count++;
   }
  });
  if(count)point.divideScalar(count);points.set(bone,point);
 }
 return points;
}
export function guardianHandPosition(points,bone,out){
 return out.copy(points?.get(bone)??ZERO).applyMatrix4(bone.matrixWorld);
}
const ZERO=new Vector3();
