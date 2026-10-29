import * as THREE from 'three';
// The GLTFLoader associations preserve source primitive indices through lossless
// runtime compression. Never depend on display names or scene traversal order.
export function attachModelVisibility(gltf,meta,buffer){
 if(buffer.byteLength!==meta.byteLength)throw Error('Model AO byte length mismatch');
 const records=new Map(meta.records.map(r=>[r.mesh+':'+r.primitive,r])),seen=new Set(),geometries=new Map();
 gltf.scene.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const a=gltf.parser.associations.get(mesh),key=a?.meshes+':'+a?.primitives,r=records.get(key);
  if(!r||r.count!==mesh.geometry.attributes.position.count||!Number.isInteger(r.offset)||r.offset<0||r.offset+r.count>buffer.byteLength)throw Error('Model AO primitive mismatch: '+key);
  if(geometries.has(mesh.geometry)&&geometries.get(mesh.geometry)!==key)throw Error('Model AO geometry alias mismatch');
  if(!geometries.has(mesh.geometry))mesh.geometry.setAttribute('ambientVisibility',new THREE.BufferAttribute(new Uint8Array(buffer,r.offset,r.count),1,true));
  geometries.set(mesh.geometry,key);seen.add(key);
  for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])material.userData.modelAmbientVisibility??={value:1};
 });
 // Unreferenced glTF meshes can exist; every rendered primitive must be mapped.
 return {mapped:seen.size,available:records.size};
}
export function patchModelAmbientVisibility(shader,enabled){
 enabled.compilation={beast:shader.fragmentShader.includes('vec3 beastLight=albedo*(fillColor+'),toon:shader.fragmentShader.includes('vec3 base=mix(coolShade*.46,'),pbr:shader.fragmentShader.includes('#include <aomap_fragment>')};
 shader.uniforms.uModelAOOn=enabled;
 shader.vertexShader='attribute float ambientVisibility;varying float vModelVisibility;\n'+shader.vertexShader;
 const anchor='#include <uv_vertex>';
 if(!shader.vertexShader.includes(anchor))throw Error('Model AO vertex anchor missing');
 shader.vertexShader=shader.vertexShader.replace(anchor,anchor+'\nvModelVisibility=ambientVisibility;');
 // Independent of transformed position: compatible with skin/morph, growth and
 // the authored crop bridges which replace begin_vertex entirely.
 shader.fragmentShader='varying float vModelVisibility;uniform float uModelAOOn;\n'+shader.fragmentShader;
 const factor='mix(1.,clamp(vModelVisibility,0.,1.),mix(.32,.20,uNight)*uModelAOOn)';
 shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>','#include <aomap_fragment>\nreflectedLight.indirectDiffuse*='+factor+';');
 shader.fragmentShader=shader.fragmentShader.replace('vec3 base=mix(coolShade*.46,','coolShade*='+factor+';\n vec3 base=mix(coolShade*.46,');
 shader.fragmentShader=shader.fragmentShader.replace('vec3 beastLight=albedo*(fillColor+','fillColor*='+factor+';\n vec3 beastLight=albedo*(fillColor+');
}
