import * as THREE from 'three';
import {cloneRuntimeMaterial} from '../../src/rendering/clone-runtime-material.js';
const materials=new Set();let smooth=false;
export function registerFarTransition(material,kind){
 const original=material.onBeforeCompile,key=material.customProgramCacheKey(),state={side:material.side,transparent:material.transparent,depthWrite:material.depthWrite,forceSinglePass:material.forceSinglePass};
 material.onBeforeCompile=function(shader,renderer){original.call(this,shader,renderer);if(!smooth)return;
  if(kind==='impostor')shader.fragmentShader=shader.fragmentShader.replace('if(coverageThreshold(gl_FragCoord.xy)<1.-vMix*vDensityFade)discard;','if(vMix*vDensityFade<.002)discard;').replace('#include <fog_fragment>','#include <fog_fragment>\n gl_FragColor.a=clamp(vMix*vDensityFade,0.,1.);');
  else shader.fragmentShader=shader.fragmentShader.replace('if(vNativeVisibility<.999){if(vNativeVisibility<.002||coverageThreshold(gl_FragCoord.xy)>=vNativeVisibility)discard;}','if(vNativeVisibility<.002)discard;').replace('#include <opaque_fragment>','diffuseColor.a*=clamp(vNativeVisibility,0.,1.);\n#include <opaque_fragment>');
 };
 material.customProgramCacheKey=()=>key+'|qa-transition-'+kind+'-'+smooth;
 const entry={material,state};materials.add(entry);material.addEventListener('dispose',()=>materials.delete(entry));apply(entry);return material;
}
function apply({material,state}){Object.assign(material,smooth?{side:THREE.FrontSide,transparent:true,depthWrite:false,forceSinglePass:true}:state);material.needsUpdate=true;}
export function cloneStandbyTransition(source){const m=cloneRuntimeMaterial(source);m.onBeforeCompile=source.onBeforeCompile;m.customProgramCacheKey=()=>source.customProgramCacheKey();return registerFarTransition(m,'standby');}
export function setFarTransitionSmooth(value){smooth=!!value;for(const entry of materials)apply(entry);return {smooth,materials:materials.size};}
