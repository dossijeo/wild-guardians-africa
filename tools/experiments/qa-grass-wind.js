import {applyMaterialStudy as placeGrass} from './qa-grass-biomes.js';
// QA only. Existing Blender mesh, placement and instance budget are unchanged.
export async function applyMaterialStudy(world,variant='static') {
 if(!world.qaGrassWind){
  const placement=await placeGrass(world),mesh=world.groundDetails.mesh,m=mesh.material;
  const uniforms={qaWindTime:{value:0},qaWindStrength:{value:0}};
  m.onBeforeCompile=shader=>{
   if(m.userData.qaWindStatic)return;
   Object.assign(shader.uniforms,uniforms);
   shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
   uniform float qaWindTime,qaWindStrength;
   vec2 qaWindDirection; float qaWindWave; float qaWindHeight;
   `).replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
   vec3 anchor=instanceMatrix[3].xyz;
   vec2 direction=normalize(vec2(1.,.38));
   qaWindDirection=vec2(dot(instanceMatrix[0].xz,direction)/max(length(instanceMatrix[0].xyz),.001),dot(instanceMatrix[2].xz,direction)/max(length(instanceMatrix[2].xyz),.001));
   qaWindWave=qaWindStrength*(.65*sin(qaWindTime*1.7+dot(anchor.xz,vec2(.22,.13)))+.35*sin(qaWindTime*3.1+dot(anchor.xz,vec2(.71,-.43))));
   qaWindHeight=max(position.y,0.);
   // Inverse transpose of the height-dependent horizontal shear.
   objectNormal.y-=2.*qaWindHeight*qaWindWave*dot(objectNormal.xz,qaWindDirection);
   `).replace('#include <begin_vertex>',`#include <begin_vertex>
   transformed.xz+=qaWindDirection*qaWindWave*qaWindHeight*qaWindHeight;
   `);
  };
  m.customProgramCacheKey=()=> 'qa-grass-wind-v1-'+!!m.userData.qaWindStatic;m.needsUpdate=true;
  world.qaGrassWind={uniforms,placement};
 }
 const q=world.qaGrassWind,m=world.groundDetails.material;
 const staticMode=variant==='static';
 if(m.userData.qaWindStatic!==staticMode){m.userData.qaWindStatic=staticMode;m.needsUpdate=true;}
 q.uniforms.qaWindStrength.value=variant==='static'?0:.18;
 q.uniforms.qaWindTime.value=variant==='wind2'?2:0;
 return {variant,...q.placement,windStrength:q.uniforms.qaWindStrength.value,windTime:q.uniforms.qaWindTime.value,castShadow:world.groundDetails.mesh.castShadow,additionalTextures:0,notes:'Analytic wind; fixed QA time. No new instances relative to static control.'};
}
