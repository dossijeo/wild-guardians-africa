import {diffuseColor,dot,exp,float,length,max,mix,normalView,normalize,positionLocal,pow,screenUV,smoothstep,uniform,vec2,vec3,vec4} from 'three/tsl';
import {skyNight} from './sky.js';

// Loading-only diffuse light: screen-space bands from the authored garden,
// shared by crops and soil. Shadows still belong to the lighting subsystem.
export function createWebGpuLoadingDiffuse({camera,visibility=null}={}){
 if(!camera?.isPerspectiveCamera||visibility!==null&&!visibility?.isNode)throw TypeError('Invalid loading diffuse camera');
 const aspect=uniform(1),night=uniform(0),inner=uniform(2.9);
 const screen=vec2(screenUV.x.mul(2).sub(1),float(1).sub(screenUV.y.mul(2))),across=screen.x.mul(aspect).sub(float(-.12).add(screen.y.mul(.48)));
 const lobe=(center,width,strength)=>exp(pow(across.sub(center).div(width),2).negate()).mul(strength);
 const bands=lobe(-.29,.29,.38).add(lobe(-.09,.24,.50)).add(lobe(.13,.28,.43)).add(lobe(.34,.23,.24)).mul(smoothstep(-.68,-.10,screen.y));
 const lambert=max(0,dot(normalize(normalView),normalize(vec3(.48,1,0)))),tint=mix(vec3(1,.80,.42),vec3(.75,.90,.74),night);
 function configure(material,{ground=false}={}){
  if(!material?.isNodeMaterial||!material.outputNode?.isNode||typeof ground!=='boolean')throw TypeError('Unsupported loading diffuse material');
  const output=material.outputNode,footprint=ground?max(bands,exp(pow(screen.x.mul(aspect).add(.08).div(.55),2).negate().sub(pow(screen.y.add(.37).div(.32),2))).mul(.85)):bands;
  let color=output.rgb.mul(ground?mix(.46,.18,night):mix(.72,.30,night)).add(diffuseColor.rgb.mul(tint).mul(footprint).mul(lambert.mul(.76).add(.24)).mul(visibility?mix(.16,1,visibility.clamp(0,1)):1).mul(ground?mix(1.2,3,night):mix(2.1,3.5,night)));
  let alpha=output.a;
  if(ground){const radius=length(positionLocal.xy),rim=smoothstep(2.5,6.2,radius);color=color.mul(mix(vec3(1.12,.91,.72),vec3(1),night)).add(diffuseColor.rgb.mul(vec3(.018,.042,.085)).mul(night).mul(float(1).sub(footprint.clamp(0,1))));color=mix(color,mix(vec3(.44,.32,.20),vec3(.012,.028,.065),night),rim.mul(.6));alpha=alpha.mul(float(1).sub(smoothstep(inner,inner.add(2.3),radius)));}
  material.outputNode=vec4(color,alpha);return material;
 }
 return {configure,update(state){if(!Array.isArray(state?.plants)||state.plants.some(p=>!Number.isFinite(p?.x)||!Number.isFinite(p?.z)))throw TypeError('Invalid loading diffuse plants');aspect.value=camera.aspect;night.value=skyNight(state);inner.value=Math.max(2.9,...state.plants.map(p=>Math.hypot(p.x,p.z)+.6));},status(){return {aspect:aspect.value,night:night.value,inner:inner.value};}};
}
