import * as THREE from 'three';
import {MeshStandardNodeMaterial} from 'three/webgpu';
import {dot,float,fract,length,mix,positionLocal,pow,sin,smoothstep,texture,uv,vec3} from 'three/tsl';
import {loadingSoilRecipe} from './webgpu-material-graph-catalog.js';

// LoadingDiorama's earth uses the uncoloured canyon atlas, desaturates it in
// texture space and fades the edge of its circular patch into the sky haze.
// The texture object remains stable while its placeholder image is replaced.
export function createWebGpuLoadingSoil(map){
 if(!map?.isTexture)throw TypeError('Invalid loading soil texture');
 const material=new MeshStandardNodeMaterial(loadingSoilRecipe().structural.state);
 const sample=texture(map,fract(uv().mul(3))).rgb,luma=dot(sample,vec3(.2126,.7152,.0722));
 material.colorNode=vec3(new THREE.Color('#a59b8d')).mul(pow(mix(vec3(luma),sample,.52),vec3(2.2)));
 const p=positionLocal.xy,irregular=sin(p.x.mul(.9).add(sin(p.y.mul(.7)))).mul(.24).add(sin(p.y.mul(1.1)).mul(.17));
 material.opacityNode=float(1).sub(smoothstep(4.5,7.2,length(p).add(irregular)));
 return material;
}
