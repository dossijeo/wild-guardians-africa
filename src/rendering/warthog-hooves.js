import {Vector3,Quaternion,MathUtils} from 'three';

// Sole triangles on the active GroundFix_v2 mesh, rather than its lowest
// heel vertices: those form a misleading horizontal edge on tilted hooves.
const landmarks=[['LeftFoot',[15863,9505,1863]],['RightFoot',[10770,12498,9770]]];
const rigs=new WeakMap();
const a=new Vector3(),b=new Vector3(),c=new Vector3(),normal=new Vector3();
const down=new Vector3(0,-1,0),worldQ=new Quaternion(),parentQ=new Quaternion(),delta=new Quaternion();
export function prepareWarthogHooves(model){
  if(rigs.has(model))return;
  model.updateWorldMatrix(true,true);
  const mesh=model.getObjectByName('Mesh_0_1');
  if(!mesh?.isSkinnedMesh)return;
  const feet=landmarks.map(([name,ids])=>{
    const bone=model.getObjectByName(name);
    mesh.getVertexPosition(ids[0],a).applyMatrix4(mesh.matrixWorld);
    mesh.getVertexPosition(ids[1],b).applyMatrix4(mesh.matrixWorld);
    mesh.getVertexPosition(ids[2],c).applyMatrix4(mesh.matrixWorld);
    normal.subVectors(b,a).cross(c.sub(a)).normalize();
    bone.getWorldQuaternion(worldQ).invert();
    return {bone,normal:normal.clone().applyQuaternion(worldQ),anchor:bone.worldToLocal(a.clone()),height:0};
  });
  rigs.set(model,feet);
}
export function plantWarthogHooves(model){
  const feet=rigs.get(model);if(!feet)return;
  model.updateWorldMatrix(true,true);
  let lowest=Infinity;
  for(const foot of feet){foot.height=a.copy(foot.anchor).applyMatrix4(foot.bone.matrixWorld).y;lowest=Math.min(lowest,foot.height);}
  for(const foot of feet){
    // Fade out on the lifted foot, preserving the original swing and ankle
    // articulation. No state accumulation: the mixer supplies each new pose.
    const weight=1-MathUtils.smoothstep((foot.height-lowest)/model.scale.y,.035,.14);
    foot.bone.getWorldQuaternion(worldQ);
    normal.copy(foot.normal).applyQuaternion(worldQ);
    delta.setFromUnitVectors(normal,down);
    delta.slerp(newIdentity,1-weight);
    worldQ.premultiply(delta);
    foot.bone.parent.getWorldQuaternion(parentQ).invert();
    foot.bone.quaternion.copy(parentQ.multiply(worldQ));
  }
  model.updateMatrixWorld(true);
}
const newIdentity=new Quaternion();
