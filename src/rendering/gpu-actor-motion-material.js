import {cos,modelWorldMatrix,modelWorldMatrixInverse,normalLocal,positionLocal,sin,vec3,vec4} from 'three/tsl';

// Both native assignments and historical replay claim the same material owner.
// Neither may wrap a material already controlled by another motion resource.
const owners=new WeakMap();
export function bindGpuMotionMaterial(bindings,material,transform){
 if(!material?.isNodeMaterial||material.castShadowPositionNode)throw TypeError('Expected compatible node material');
 if(bindings.has(material))return material;
 if(owners.has(material))throw Error('Motion material already owned');
 const previous=material.positionNode,node=transform(previous??positionLocal);
 material.positionNode=node;bindings.set(material,{node,previous});owners.set(material,bindings);material.needsUpdate=true;return material;
}
export function unbindGpuMotionMaterial(bindings,material){
 const binding=bindings.get(material);if(!binding)return false;
 if(material.positionNode===binding.node){material.positionNode=binding.previous;material.needsUpdate=true;}
 if(owners.get(material)===bindings)owners.delete(material);bindings.delete(material);return true;
}
export function gpuActorLocalTransform(base,position,yaw,anchor,oriented){
 const value=base.toVar(),world=modelWorldMatrix.mul(vec4(value,1)).xyz.sub(anchor),c=cos(yaw),s=sin(yaw),rotated=vec3(c.mul(world.x).add(s.mul(world.z)),world.y,c.mul(world.z).sub(s.mul(world.x))),worldNormal=modelWorldMatrix.mul(vec4(normalLocal,0)).xyz,rotatedNormal=vec3(c.mul(worldNormal.x).add(s.mul(worldNormal.z)),worldNormal.y,c.mul(worldNormal.z).sub(s.mul(worldNormal.x)));
 normalLocal.assign(oriented.select(modelWorldMatrixInverse.mul(vec4(rotatedNormal,0)).xyz.normalize(),normalLocal));
 return modelWorldMatrixInverse.mul(vec4(rotated.add(position),1)).xyz;
}
