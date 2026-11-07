import * as THREE from 'three';
import {cameraPosition,clamp,diffuseColor,dot,floor,fwidth,length,max,metalness,mix,normalWorld,normalize,output,positionWorld,pow,reflect,roughness,smoothstep,uniform,vec3,vec4} from 'three/tsl';
import {skyNight} from './sky.js';

// The original loading diorama applies AfricanToon to opaque crops only:
// its transparent soil is deliberately excluded. Fine noise is disabled there,
// giving a constant brush value of .32. Sky reflection remains unported.
export function createWebGpuLoadingToon({light,visibility}={}){
 if(!light?.isDirectionalLight||!visibility?.isNode)throw TypeError('Invalid loading toon');
 const night=uniform(0),sun=uniform(new THREE.Vector3()),normal=normalize(normalWorld),view=normalize(cameraPosition.sub(positionWorld)),albedo=diffuseColor.rgb;
 const ramp=(x,levels)=>floor(clamp(x,0,1).mul(levels-.0001)).div(levels-1);
 const band=ramp(max(dot(normal,sun),0).mul(clamp(visibility,0,1)),4),fill=ramp(clamp(normal.y.mul(.5).add(.5),0,1),3),spec=pow(max(dot(reflect(sun.negate(),normal),view),0),mix(18,34,roughness.oneMinus())),specBand=smoothstep(.62,.88,spec).mul(floatOneMinus(roughness.mul(.40)));
 const warm=mix(vec3(1.42,1.06,.62),vec3(.28,.36,.58).mul(2.05),night),shade=mix(vec3(.46,.36,.22),vec3(.10,.14,.24).mul(2.05),night),base=mix(shade.mul(.46),warm,band.mul(.76).add(.24));
 const leaf=smoothstep(.018,.13,albedo.g.sub(albedo.r.mul(.87))).mul(smoothstep(.06,.20,albedo.g)),nv=max(dot(normal,view),0),rim=smoothstep(.18,.72,nv.oneMinus()).mul(roughness.oneMinus().mul(.12).add(.08));
 let toon=albedo.mul(base).mul(fill.mul(.24).add(.76)).add(albedo.mul(leaf).mul(warm).mul(band.mul(.28).add(.13))).add(vec3(specBand).mul(mix(vec3(.92,.78,.46),vec3(.70,.78,.96),night)).mul(metalness.oneMinus().mul(.14).add(.16))).add(albedo.mul(rim).mul(mix(vec3(.44,.24,.10),vec3(.10,.16,.26),night)));
 toon=toon.mul(mix(vec3(.98,.96,.92),vec3(1.03,.99,.92),.32*.30)).max(0);
 let color=pow(clamp(toon.mul(toon.mul(2.51).add(.03)).div(toon.mul(toon.mul(2.43).add(.59)).add(.14)),0,1),1/2.2);
 color=mix(vec3(dot(color,vec3(.299,.587,.114))),color,1.12);color=mix(color,vec3(.84,.76,.58),.025*.32);
 const edge=max(floatOneMinus(smoothstep(.10,.36,nv)),smoothstep(.26,.58,length(fwidth(normal)).mul(2))),edgeWithColor=max(edge,smoothstep(.30,.62,length(fwidth(albedo)).mul(4)).mul(.35));
 color=mix(color,mix(vec3(.28,.18,.07),vec3(.08,.09,.13),night),clamp(edgeWithColor.mul(.38),0,.55));
 const node=vec4(pow(max(color,vec3(0)),2.2),output.a);
 return {node,update(state){night.value=skyNight(state);sun.value.copy(light.position).sub(light.target.position).normalize();}};
}
function floatOneMinus(value){return value.oneMinus();}
