import {Vector2} from 'three';
import {cameraNear,cameraProjectionMatrix,cameraProjectionMatrixInverse,cameraViewMatrix,clamp,float,ivec2,max,min,mix,normalize,positionView,texture,textureLoad,uniform,vec4} from 'three/tsl';
import {hiSsrTraceNode} from './webgpu-hissr-trace.js';

// A binding belongs to one immutable capture allocation. Replace the binding
// and retire its material only after GPU work completes when resizing.
export function createWebGpuWaterHiSsrBindings(capture,{maxDistance=48,thickness=.35,strength=.65}={}){
 if(!capture?.depth?.isDepthTexture||!capture?.color?.isTexture||!Array.isArray(capture.levels)||!Number.isFinite(maxDistance)||maxDistance<=0||!Number.isFinite(thickness)||thickness<=0||!Number.isFinite(strength)||strength<0||strength>1)throw TypeError('Invalid water Hi-SSR bindings');
 const {width,height}=capture.depth.image;
 return {depth:texture(capture.depth),color:texture(capture.color),levels:capture.levels.map(level=>texture(level)),resolution:uniform(new Vector2(width,height)),maxDistance:uniform(maxDistance),thickness:uniform(thickness),strength:uniform(strength)};
}

// Called within the water node graph. Ray endpoints stay in front of the
// camera near plane; misses and screen edges preserve the environment map.
export function waterHiSsrReflectionNode(bindings,direction,environmentReflection){
 const rayDirection=normalize(cameraViewMatrix.mul(vec4(direction,0)).xyz),start=positionView;
 const nearDistance=max(cameraNear.negate().sub(start.z).div(max(rayDirection.z,.00001)),0);
 const distance=rayDirection.z.greaterThan(0).select(min(bindings.maxDistance,nearDistance.mul(.999)),bindings.maxDistance);
 const end=start.add(rayDirection.mul(distance));
 const hit=hiSsrTraceNode({depth:bindings.depth,levels:bindings.levels,resolution:bindings.resolution,start,end,projection:cameraProjectionMatrix,projectionInverse:cameraProjectionMatrixInverse,thickness:bindings.thickness}).toVar();
 const color=textureLoad(bindings.color,ivec2(hit.xy.mul(bindings.resolution))).setUpdateMatrix(false).rgb;
 return mix(environmentReflection,color,clamp(hit.z.mul(bindings.strength),float(0),float(1)));
}
