import * as THREE from 'three';
import {dot,float,mix,output,screenUV,smoothstep,uniform,vec2,vec4} from 'three/tsl';
import {skyNight} from './sky.js';

// Shared by all garden materials; output is the lit material result. The
// focus changes uniforms only, so orbit and day/night never recompile it.
export function createWebGpuLoadingFocus({camera,focus=new THREE.Vector3(0,1.15,0)}={}){
 if(!camera?.isPerspectiveCamera||!focus?.isVector3)throw TypeError('Invalid loading focus');
 const centre=uniform(new THREE.Vector2(.5,.5)),aspect=uniform(1),amount=uniform(1),night=uniform(0),point=new THREE.Vector3(),direction=new THREE.Vector3();
 const offset=vec2(screenUV.x,float(1).sub(screenUV.y)).sub(centre),scaled=vec2(offset.x.mul(aspect),offset.y),edge=smoothstep(.028,.42,dot(scaled,scaled)),gain=mix(1,mix(mix(1.30,2.30,night),.60,edge),amount);
 const node=vec4(output.rgb.mul(gain),output.a);
 return {configure(material){if(!material?.isNodeMaterial||material.outputNode!=null)throw TypeError('Unsupported loading focus material');material.outputNode=node;return material;},update(state){camera.updateMatrixWorld();point.copy(focus).project(camera);centre.value.set(Number.isFinite(point.x)?(point.x+1)*.5:.5,Number.isFinite(point.y)?(point.y+1)*.5:.5);camera.getWorldDirection(direction);amount.value=1-THREE.MathUtils.smoothstep(direction.y,.08,.72);aspect.value=camera.aspect;night.value=skyNight(state);},node};
}

