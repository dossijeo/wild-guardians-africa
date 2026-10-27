import * as THREE from 'three';
// QA only: analytic contact occlusion, not a projected directional shadow.
// Reuses the soil draw. Positions refreshed only after a planting event.
export function installLoadingContact(d){
 const points=Array.from({length:d.plants.capacity},()=>new THREE.Vector2());
 const uniforms={uLoadingRoots:{value:points},uLoadingRootCount:{value:0}};
 const sync=()=>{uniforms.uLoadingRootCount.value=d.plants.plants.length;d.plants.plants.forEach((p,i)=>points[i].set(p.x,-p.z));};
 sync();const previous=d.onPlant;d.onPlant=p=>{sync();previous?.(p);};
 const m=d.ground.material,compile=m.onBeforeCompile,key=m.customProgramCacheKey();
 m.onBeforeCompile=function(shader,renderer){
  compile.call(this,shader,renderer);Object.assign(shader.uniforms,uniforms);
  const anchor='#include <opaque_fragment>';if(!shader.fragmentShader.includes(anchor))throw Error('Loading contact output missing');
  shader.fragmentShader=`uniform vec2 uLoadingRoots[${points.length}];uniform int uLoadingRootCount;\n`+shader.fragmentShader.replace(anchor,`float contact=0.;
  for(int i=0;i<${points.length};i++){
   if(i>=uLoadingRootCount)break;
   vec2 delta=vLoadingSoil-uLoadingRoots[i];
   contact=max(contact,1.-smoothstep(.015,.42,dot(delta,delta)));
  }
  outgoingLight*=1.-.38*contact;
  `+anchor);
 };
 m.customProgramCacheKey=()=>key+'|qa-loading-contact-v1';m.needsUpdate=true;
 return {uniforms,sync};
}
