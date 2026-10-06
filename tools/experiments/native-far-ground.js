import * as THREE from 'three';
// Low-detail ground belongs to the regional layer. Discard the live resident
// rectangle so the two surfaces never overlap or compete in the depth buffer.
export function attachNativeFarGround(candidate,data,world){
 const colors=Float32Array.from(data.colors,c=>c<=.04045?c*.0773993808:Math.pow((c+.055)*.9478672986,2.4));
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(data.positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setIndex(new THREE.BufferAttribute(data.indices,1));
 const bounds={value:new THREE.Vector4()},origin=world.toon.uniforms.uWorldOrigin,material=new THREE.MeshBasicMaterial({vertexColors:true,fog:true,toneMapped:false});
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,{uFarNearBounds:bounds,uFarGroundOrigin:origin,uFarGroundNight:world.toon.uniforms.uNight});
  shader.vertexShader='varying vec2 vFarGroundXZ;uniform float uFarGroundNight;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvFarGroundXZ=(modelMatrix*vec4(transformed,1.)).xz;');
  // Approximate fixed-light night grading per vertex: no terrain noise, normals
  // or extra fragment texture reads. Original daytime colors remain intact.
  shader.vertexShader=shader.vertexShader.replace('#include <color_vertex>','#include <color_vertex>\nvColor.rgb*=mix(vec3(1.),vec3(.187675676,.302022472,.661818182),clamp(uFarGroundNight,0.,1.));');
  shader.fragmentShader='varying vec2 vFarGroundXZ;uniform vec4 uFarNearBounds;uniform vec2 uFarGroundOrigin;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nvec2 farGroundXZ=vFarGroundXZ+uFarGroundOrigin;if(farGroundXZ.x>=uFarNearBounds.x&&farGroundXZ.y>=uFarNearBounds.y&&farGroundXZ.x<=uFarNearBounds.z&&farGroundXZ.y<=uFarNearBounds.w)discard;');
 };
 material.customProgramCacheKey=()=> 'far-ground-resident-clip-night-v2';
 const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;mesh.userData.materialRegistryExcluded=true;candidate.impostors.add(mesh);
 candidate.updateGroundBounds=()=>bounds.value.set(...world.nearBounds);
 candidate.updateGroundBounds();const dispose=candidate.dispose;candidate.dispose=options=>{mesh.removeFromParent();geometry.dispose();material.dispose();dispose.call(candidate,options);};
}
