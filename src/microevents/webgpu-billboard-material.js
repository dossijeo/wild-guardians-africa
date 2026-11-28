import {DoubleSide} from 'three';
import {MeshBasicNodeMaterial} from 'three/webgpu';
import {attribute,cameraProjectionMatrix,clamp,cos,float,length,modelViewMatrix,select,sin,texture,uniform,varying,vec2,vec3,vec4} from 'three/tsl';

// The same instanced data and atlas as MicroeventBillboards, with its vertex
// expansion performed in camera space on the WebGPU backend.
export function createWebGpuMicroeventMaterial(atlas){
 if(!atlas?.isTexture)throw TypeError('Invalid microevent atlas');
 const corner=attribute('position','vec3').xy,center=attribute('aCenter','vec3'),sizeRotation=attribute('aSizeRotation','vec3'),rect=attribute('aAtlas','vec4'),tint=attribute('aTint','vec4'),mode=attribute('aMode','float');
 const angle=sizeRotation.z,c=cos(angle),s=sin(angle),q=corner.mul(sizeRotation.xy),offset=vec2(c.mul(q.x).sub(s.mul(q.y)),s.mul(q.x).add(c.mul(q.y))),view=modelViewMatrix.mul(vec4(center,1)).add(vec4(offset,0,0));
 const uv=varying(rect.xy.add(corner.add(.5).mul(rect.zw))),local=varying(corner.mul(2)),color=varying(tint),glow=varying(mode),map=texture(atlas,uv),light=uniform(1),radial=clamp(float(1).sub(length(local)),0,1).pow(2),sample=select(glow.greaterThan(.5),vec4(vec3(1),radial),map),alpha=sample.a.mul(color.a);
 const material=new MeshBasicNodeMaterial({transparent:true,depthTest:true,depthWrite:false,side:DoubleSide,toneMapped:false});material.vertexNode=cameraProjectionMatrix.mul(view);material.outputNode=vec4(sample.rgb.mul(color.rgb).mul(select(glow.greaterThan(.5),float(1),light)),select(alpha.lessThan(.015),float(0),alpha));
 return {material,setAtlas(value){if(!value?.isTexture)throw TypeError('Invalid microevent atlas');map.value=value;},setLight(value){if(!Number.isFinite(value))throw TypeError('Invalid microevent light');light.value=value;}};
}
