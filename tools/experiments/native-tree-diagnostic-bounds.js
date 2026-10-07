import {Box3,Object3D} from 'three';
// QA only: mirror the native chunk envelope for one procedural instance.
// Use all source variants, never the bounding box of a whole instanced batch.
export function nativeTreeDiagnosticBounds(group,batch,tree){
 group.updateMatrixWorld(true);const bounds=new Box3(),dummy=new Object3D();
 for(const source of batch.levels){if(!source.geometry.boundingBox)source.geometry.computeBoundingBox();bounds.union(source.geometry.boundingBox);}
 dummy.position.set(tree.x-batch.chunkOrigin[0],tree.y,tree.z-batch.chunkOrigin[1]);dummy.rotation.y=tree.yaw;dummy.scale.set(tree.sx,tree.sy,tree.sz);dummy.updateMatrix();
 return bounds.applyMatrix4(dummy.matrix.premultiply(group.matrixWorld));
}
