// Offline geometric visibility for native props; no per-instance bake/update.
export function nativeAmbientVisibilityEnabled(search='') {
 return new URLSearchParams(search).get('globalAO')==='1';
}
export function nativeVisibilityViews(pack,manifest,buffer) {
 if(manifest.source!==pack.binary.url||manifest.biome!==pack.biomeId||manifest.byteLength!==buffer.byteLength)throw Error('Stale native AO bank: '+pack.biomeId);
 const records=new Map(manifest.records.map(r=>[r.slot+':'+r.level,r]));
 return pack.assets.map(asset=>asset.lods.map((lod,level)=>{
  const r=records.get(asset.slot+':'+level),count=lod.position.count/3;
  if(!r||r.count!==count||!Number.isInteger(r.offset)||r.offset<0||r.offset+count>buffer.byteLength)throw Error('Native AO layout mismatch: '+asset.slot+':'+level);
  return new Uint8Array(buffer,r.offset,count);
 }));
}
export function patchNativeAmbientVisibility(shader,enabled) {
 const anchor='vec3 lit=toLinear4(clamp(base,0.,1.))*illumination*contact;';
 if(!shader.fragmentShader.includes(anchor))throw Error('Native AO: illustrated indirect-light anchor missing');
 shader.uniforms.uNativeAOOn=enabled;
 shader.vertexShader='attribute float ambientVisibility;varying float vAmbientVisibility;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvAmbientVisibility=ambientVisibility;');
 shader.fragmentShader='varying float vAmbientVisibility;uniform float uNativeAOOn;\n'+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace(anchor,`
 // Replace the old height-only contact approximation while enabled. Preserve
 // the direct excess over the shaded hemisphere, and emission below this block.
 contact=mix(contact,1.,uNativeAOOn);
 float cavityStrength=mix(mix(.50,.28,leafMix),mix(.28,.18,leafMix),uNight)*uNativeAOOn;
 float cavityVisibility=mix(1.,clamp(vAmbientVisibility,0.,1.),cavityStrength);
 vec3 indirect=min(illumination,shade);
 vec3 lit=toLinear4(clamp(base,0.,1.))*(indirect*cavityVisibility+max(illumination-indirect,vec3(0.)))*contact;`);
}

export function villageVisibilityView(pack,manifest,buffer){
 if(manifest.source!==pack.binary.url||manifest.culture!==pack.id||manifest.byteLength!==buffer.byteLength||buffer.byteLength!==pack.vertexBytes/32)throw Error('Stale village AO bank: '+pack.id);
 return new Uint8Array(buffer);
}
