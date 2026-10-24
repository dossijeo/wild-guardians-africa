import * as THREE from 'three';
import {applyMaterialStudy as applyWind} from './qa-grass-wind.js';
export async function applyMaterialStudy(world,variant='wind'){
 const audit=await applyWind(world,'wind2'),mesh=world.groundDetails.mesh;
 if(!mesh.customDepthMaterial){
  const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
  depth.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,world.qaGrassWind.uniforms);
   shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
   uniform float qaWindTime,qaWindStrength;
   `).replace('#include <begin_vertex>',`#include <begin_vertex>
   vec3 anchor=instanceMatrix[3].xyz;
   vec2 direction=normalize(vec2(1.,.38));
   vec2 qaWindDirection=vec2(dot(instanceMatrix[0].xz,direction)/max(length(instanceMatrix[0].xyz),.001),dot(instanceMatrix[2].xz,direction)/max(length(instanceMatrix[2].xyz),.001));
   float qaWindWave=qaWindStrength*(.65*sin(qaWindTime*1.7+dot(anchor.xz,vec2(.22,.13)))+.35*sin(qaWindTime*3.1+dot(anchor.xz,vec2(.71,-.43))));
   float qaWindHeight=max(position.y,0.);
   transformed.xz+=qaWindDirection*qaWindWave*qaWindHeight*qaWindHeight;
   `);
  };
  depth.customProgramCacheKey=()=> 'qa-grass-wind-shadow-v1';
  depth.userData.nativeShadowInputs=()=>[world.qaGrassWind.uniforms.qaWindTime.value,world.qaGrassWind.uniforms.qaWindStrength.value];
  mesh.customDepthMaterial=depth;
 }
 mesh.castShadow=variant==='shadow';
 return {...audit,variant,castShadow:mesh.castShadow,shadowEnabled:world.renderer.shadowMap.enabled,notes:'Same wind and placement, optional native directional shadow with matching deformation.'};
}
