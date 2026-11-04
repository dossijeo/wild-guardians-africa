import * as THREE from 'three';
import {cameraPosition, clamp, diffuseColor, dot, exp, floor, fract, max, mix, normalWorld, normalize, positionWorld, pow, sin, smoothstep, step, uniform, vec3, vec4} from 'three/tsl';

// Equivalent to skyNight, kept independent of the sky asset-loading module.
function guardianNight(state){let value=state.time>=300?1-Math.exp(-(state.time-300)*2.4):state.day>1?Math.exp(-state.time*2.4):0;if(value<.0001)value=0;if(1-value<.0001)value=1;return value;}

// Uniforms are shared by the guardian meshes and do not create per-cast variants.
export function createWebGpuGuardianStyle(){
 const night=uniform(0),sun=uniform(new THREE.Vector3(-6,12,9).normalize()),tint=uniform(new THREE.Color(0xffcf79)),glow=uniform(.13),reveal=uniform(0),dissolve=uniform(0),bottom=uniform(0),height=uniform(3);
 const normal=normalize(normalWorld),shade=smoothstep(-.15,.75,dot(normal,normalize(sun))),direct=max(dot(normal,normalize(sun)),0);
 const light=mix(mix(vec3(.55,.51,.45),vec3(1.3,1.24,1.08),shade),vec3(.3,.4,.48).add(direct.mul(.25)),clamp(night,0,1));
 const h=clamp(positionWorld.y.sub(bottom).div(max(.1,height)),0,1);
 const noise=fract(sin(dot(floor(positionWorld.mul(55)),vec3(12.9898,78.233,37.719))).mul(43758.5453));
 const boundary=h.mul(.75).add(noise.mul(.25)),solid=smoothstep(reveal.sub(.06),reveal.add(.06),h).oneMinus();
 const edge=exp(h.sub(reveal).abs().mul(-35)),breakup=smoothstep(boundary.sub(.07),boundary,dissolve).mul(step(.001,dissolve));
 const view=normalize(cameraPosition.sub(positionWorld)),rim=pow(dot(normal,view).abs().oneMinus(),2);
 const color=mix(tint.mul(rim.mul(.55).add(shade.mul(.16)).add(.18)),diffuseColor.rgb.mul(light.add(tint.mul(glow))),solid).add(tint.mul(edge.mul(1.5).add(breakup.mul(1.4))));
 const output=vec4(color,diffuseColor.a),alphaTest=dissolve.greaterThan(boundary.add(.02)).select(1,0);
 const uniforms={opacity:{value:1},uSpiritTint:tint,uSpiritGlow:glow,uReveal:reveal,uDissolve:dissolve,uBottom:bottom,uHeight:height};
 return {uniforms,configure(material){material.transparent=true;material.depthWrite=true;material.forceSinglePass=true;material.toneMapped=false;material.outputNode=output;material.alphaTestNode=alphaTest;material.uniforms=uniforms;material.needsUpdate=true;},update({state,age,originY,modelBottom,modelHeight,impact,kind='attack'}){const ease=x=>{const t=THREE.MathUtils.clamp(x,0,1);return t*t*(3-2*t);};night.value=guardianNight(state);tint.value.setHex(kind==='growth'?0xa8ed8b:kind==='multiply'?0xe5b4ff:0xffcf79);glow.value=.13+.65*Math.exp(-(((age-impact)/.14)**2));reveal.value=ease((age-(kind==='attack'?.02:.16))/(kind==='attack'?.12:.4))*1.12;dissolve.value=ease((age-1.5)/.7)*1.05;bottom.value=originY+modelBottom;height.value=modelHeight;}};
}
