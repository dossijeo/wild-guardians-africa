import {Vector3} from 'three';
import {Fn,int,uniform} from 'three/tsl';
import {bindGpuMotionMaterial,unbindGpuMotionMaterial,gpuActorLocalTransform} from './gpu-actor-motion-material.js';

// Shared transform math for existing stationary owners. No clock, duration,
// admission or body registry lives here; the typed caller retains those facts.
export function createNativeStationaryGpuTransform({origin,height,heading,anchorPosition,anchorYaw,heightOffset,label}){
 const f=Math.fround,bindingAnchor=Object.freeze(anchorPosition?{x:anchorPosition.x,y:anchorPosition.y,z:anchorPosition.z}:{x:origin.x,y:height+heightOffset,z:origin.z});
 if(![bindingAnchor.x,bindingAnchor.y,bindingAnchor.z,height+heightOffset,heading-anchorYaw].every(n=>Number.isFinite(n)&&Number.isFinite(f(n))))throw TypeError(`Native ${label} transform cannot be projected`);
 const bindings=new Map(),anchor=uniform(new Vector3(bindingAnchor.x,bindingAnchor.y,bindingAnchor.z)),position=uniform(new Vector3(origin.x,height+heightOffset,origin.z)),yaw=uniform(heading-anchorYaw);
 const transform=base=>Fn(()=>gpuActorLocalTransform(base,position,yaw,anchor,int(1).greaterThan(0)))();
 return {bindingAnchor,
  bind:material=>bindGpuMotionMaterial(bindings,material,transform),unbind:material=>unbindGpuMotionMaterial(bindings,material),
  sample:()=>({x:f(origin.x),y:f(height+heightOffset),z:f(origin.z),yaw:f(heading),dx:f(origin.x)-bindingAnchor.x,dy:f(height+heightOffset)-bindingAnchor.y,dz:f(origin.z)-bindingAnchor.z,yawDelta:f(heading-anchorYaw),currentSpeed:0,running:0}),
  dispose(){for(const material of [...bindings.keys()])unbindGpuMotionMaterial(bindings,material);}
 };
}
