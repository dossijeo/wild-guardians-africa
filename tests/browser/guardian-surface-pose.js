import {Vector3} from 'three';
import {isTailContactVertex} from '../../src/rendering/beast-ground-contact.js';
// QA-only snapshot of one rendered pose, not a replacement for physics replay.
export function captureSurfacePose(model,surface){
 model.updateWorldMatrix(true,true);model.updateMatrixWorld(true);const nodes=[],meshes=[],point=new Vector3();
 model.traverse(node=>{nodes.push({name:node.name,position:node.position.toArray(),quaternion:node.quaternion.toArray(),scale:node.scale.toArray(),morph:node.morphTargetInfluences?.slice()});if(node.isSkinnedMesh)node.skeleton.update();});
 let order=0,minimum=Infinity;
 model.traverse(node=>{const index=order++;if(!node.isSkinnedMesh)return;const floors=[];for(let i=0;i<node.geometry.attributes.position.count;i++){if(isTailContactVertex(node,i)){floors.push(null);continue;}node.getVertexPosition(i,point).applyMatrix4(node.matrixWorld);const floor=surface(point.x,point.z);floors.push(floor);minimum=Math.min(minimum,point.y-floor);}meshes.push({index,name:node.name,floors});});
 return {version:1,scope:'Exact per-vertex floor heights at captured X/Z only; valid for replaying this pose, not moving it or simulating subsequent frames.',worldMatrix:model.matrixWorld.toArray(),nodes,meshes,minimum};
}
export function replaySurfacePose(model,snapshot){
 const nodes=[];model.traverse(n=>nodes.push(n));if(nodes.length!==snapshot.nodes.length)throw Error('Snapshot hierarchy mismatch');
 for(let i=0;i<nodes.length;i++){const n=nodes[i],s=snapshot.nodes[i];if(n.name!==s.name)throw Error('Snapshot node mismatch');n.position.fromArray(s.position);n.quaternion.fromArray(s.quaternion);n.scale.fromArray(s.scale);if(s.morph){if(n.morphTargetInfluences?.length!==s.morph.length)throw Error('Snapshot morph mismatch');n.morphTargetInfluences.splice(0,s.morph.length,...s.morph);}}
 if(model.parent)throw Error('Replay model must be detached');model.matrix.fromArray(snapshot.worldMatrix);model.matrix.decompose(model.position,model.quaternion,model.scale);model.updateMatrixWorld(true);for(const n of nodes)if(n.isSkinnedMesh)n.skeleton.update();
 let minimum=Infinity,witness=null;const point=new Vector3();
 for(const m of snapshot.meshes){const mesh=nodes[m.index];if(!mesh?.isSkinnedMesh||mesh.name!==m.name||mesh.geometry.attributes.position.count!==m.floors.length)throw Error('Snapshot geometry mismatch');for(let i=0;i<m.floors.length;i++){if(m.floors[i]===null)continue;mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld);const gap=point.y-m.floors[i];if(gap<minimum){minimum=gap;witness={mesh:mesh.name,index:i,position:point.toArray()};}}}
 return {minimum,witness};
}
