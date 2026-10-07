import {endpointGuard} from '../../src/rendering/environment-endpoints.js';

// QA-only control-flow experiment. No production imports and no changed samples,
// UVs, noise recipe, palette or endpoint conditions. Native equivalence pending.
const mixedEnvironment='\n vec3 day=textureLod(uEnvDay,uv,rough*7.).rgb*4.;\n vec3 night=textureLod(uEnvNight,uv,rough*7.).rgb*4.;\n return mix(day,night+vec3(.025,.045,.10),uNight);';
const singleEnvironment=`
 vec3 qaRadiance=vec3(0.);
 if(uEnvEndpoints>.5&&uNight==0.)qaRadiance=textureLod(uEnvDay,uv,rough*7.).rgb*4.;
 else if(uEnvEndpoints>.5&&uNight==1.)qaRadiance=textureLod(uEnvNight,uv,rough*7.).rgb*4.+vec3(.025,.045,.10);
 else{
  vec3 day=textureLod(uEnvDay,uv,rough*7.).rgb*4.;
  vec3 night=textureLod(uEnvNight,uv,rough*7.).rgb*4.;
  qaRadiance=mix(day,night+vec3(.025,.045,.10),uNight);
 }
 return qaRadiance;`;
export function singleExitEnvironment(source){
 const received=endpointGuard+mixedEnvironment;
 if(!source.includes(received))return source;
 return source.replace(received,singleEnvironment);
}
export const singleExitEnvironmentRecipe={received:endpointGuard+mixedEnvironment,replacement:singleEnvironment};
const controls=new WeakMap();
export function applySingleExitEnvironmentQA(root,enabled){
 let count=0;
 root.traverse(object=>{if(!object.isMesh)return;for(const material of Array.isArray(object.material)?object.material:[object.material]){
  let control=controls.get(material);
  if(!control){
   control={enabled:false,source:material.fragmentShader,attempts:0,matches:0};controls.set(material,control);
   const compile=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material);
   material.onBeforeCompile=(shader,renderer)=>{compile.call(material,shader,renderer);if(control.enabled){const source=shader.fragmentShader;control.attempts++;if(source.includes(singleExitEnvironmentRecipe.received))control.matches++;shader.fragmentShader=singleExitEnvironment(source);}};
   material.customProgramCacheKey=()=>key()+'|qa-single-exit-environment-'+Number(control.enabled);
  }
  if(enabled&&!control.enabled){control.attempts=0;control.matches=0;}
  control.enabled=enabled;
  if(material.isShaderMaterial)material.fragmentShader=enabled?singleExitEnvironment(control.source):control.source;
  material.needsUpdate=true;count++;
 }});
 return count;
}
// Source-hook observations, not successful links or distinct GPU programs.
// Deduplicate shared materials, and expose uncompiled/unmatched ones explicitly.
export function singleExitEnvironmentQAReport(root){
 const seen=new Set(),materials=[];
 root.traverse(object=>{if(!object.isMesh)return;for(const material of Array.isArray(object.material)?object.material:[object.material]){
  if(seen.has(material))continue;seen.add(material);
  const control=controls.get(material);if(!control?.enabled)continue;
  materials.push({uuid:material.uuid,type:material.type,name:material.name,compileAttempts:control.attempts,matchedCompileAttempts:control.matches,shaderSourceMatched:material.isShaderMaterial?control.source.includes(singleExitEnvironmentRecipe.received):null});
 }});
 return {uniqueMaterials:materials.length,compileAttempts:materials.reduce((n,m)=>n+m.compileAttempts,0),matchedCompileAttempts:materials.reduce((n,m)=>n+m.matchedCompileAttempts,0),materials,scope:'Observed onBeforeCompile source replacements and ShaderMaterial source matches only; cache reuse can bypass hooks. Does not prove successful GPU linking, execution, image equivalence or warning cause.'};
}
