import * as THREE from 'three';
import { attribute, materialReference, mix, vec4 } from 'three/tsl';

const textureLayoutProperties=['colorSpace','mapping','channel','wrapS','wrapT','wrapR','magFilter','minFilter','anisotropy'];
// Match the structural binding distinctions used by Three's WebGPU backend.
// Compressed BC7 and ordinary RGBA textures can share a float 2D binding;
// arrays, depth and integer/unfilterable float textures cannot use that slot.
function textureBinding(texture){
 const dimension=texture.isCubeTexture?'cube':texture.isArrayTexture||texture.isDataArrayTexture||texture.isCompressedArrayTexture?'2d-array':texture.is3DTexture||texture.isData3DTexture?'3d':'2d';
 let sample='float';if(texture.isDepthTexture)sample='depth';else if(texture.isDataTexture||texture.isDataArrayTexture||texture.isData3DTexture){if(texture.type===THREE.IntType)sample='sint';else if(texture.type===THREE.UnsignedIntType)sample='uint';else if(texture.type===THREE.FloatType)sample='float32';}
 return [dimension,sample,texture.isDepthTexture?texture.compareFunction:null,texture.renderTarget?.samples??0];
}
const textureLayout=texture=>JSON.stringify([...textureBinding(texture),...textureLayoutProperties.map(key=>texture[key])]);
const neutralTextures=new WeakMap();
// Three's node cache includes node identities. Reuse a graph per structural
// texture layout: UV channels and binding types affect generated code even
// though colors, textures and blend values are per-material data.
const progressiveColorNodes=new Map();
function progressiveColorNodeFor(map){
 const key=textureLayout(map);let node=progressiveColorNodes.get(key);if(!node){node=vec4(mix(attribute('color','vec4').rgb,materialReference('map','texture').rgb.mul(materialReference('color','color')).mul(attribute('wgOriginalColor','vec4').rgb),materialReference('_wgTextureBlend','float')),1);progressiveColorNodes.set(key,node);}return node;
}

// Each renderer owns its neutral textures. Materials borrow them and release
// their lease without invalidating another asset that is still using one.
function acquireNeutralTexture(renderer,source,normal){
 let records=neutralTextures.get(renderer);if(!records){records=new Map();neutralTextures.set(renderer,records);}
 const key=JSON.stringify([normal,textureLayout(source)]);let record=records.get(key);
 if(!record){
  const pixel=new Uint8Array(normal?[128,128,255,255]:[255,255,255,255]),texture=new THREE.DataTexture(pixel,1,1,THREE.RGBAFormat);
  for(const property of textureLayoutProperties)texture[property]=source[property];
  texture.flipY=false;texture.needsUpdate=true;record={texture,refs:0};records.set(key,record);
 }
 record.refs++;let released=false;
 return {texture:record.texture,release(){if(released)return;released=true;if(--record.refs===0){records.delete(key);record.texture.dispose();}}};
}

// Structural experiment only. Source identifiers must agree before any
// original texture can replace the provisional appearance.
export async function makeStableVertexMaterials(renderer, preview, originalMaterials, mapping, { nativeColor = false, toonOutput = null, shareCompatibleMaterials = false, materialVariant = null } = {}) {
  if (typeof shareCompatibleMaterials !== 'boolean' || materialVariant !== null && typeof materialVariant !== 'function') throw TypeError('Invalid material sharing policy');
  const sourceHash = mapping?.sourceSha256;
  if (!/^[a-f0-9]{64}$/.test(sourceHash ?? '')) throw Error('Missing or invalid source hash');
  const assertSource = asset => { if (asset?.parser?.json?.asset?.extras?.wgVertexPreviewSourceSha256 !== sourceHash) throw Error('Material or preview source mismatch'); };
  assertSource(preview); assertSource(originalMaterials);
  const records = new Map(mapping.primitives.map(record => [`${record.mesh}:${record.primitive}`, record]));
  if (records.size !== mapping.primitives.length) throw Error('Duplicate primitive mapping');
  const entries = [];
  preview.scene.traverse(object => {
    if (!object.isMesh) return;
    const a = preview.parser.associations.get(object), record = a && records.get(`${a.meshes}:${a.primitives ?? 0}`);
    if (!record || record.material == null) throw Error('Missing material mapping');
    entries.push({ object, record });
  });
  const sources = await Promise.all(entries.map(item => originalMaterials.parser.getDependency('material', item.record.material)));
  const placeholders = new Map(), mapBindings = [], changes = [], createdMaterials = [], progressiveMaterials = [], normalScales = [], compatibleMaterials = new Map(),replicas=new Map();
  let generation = 0, cancelled = false, resolved = false, applied = false, disposed = false;
  function placeholder(source, normal) {
    const key = JSON.stringify([normal,textureLayout(source)]);
    if (!placeholders.has(key)) {
      placeholders.set(key,acquireNeutralTexture(renderer,source,normal));
    }
    return placeholders.get(key).texture;
  }
  try { for (const [index, item] of entries.entries()) {
    const source = sources[index], geometry = item.object.geometry;
    let original = null;
    if (source.map) {
      if (!geometry.getAttribute('color')) throw Error('Missing baked vertex color');
      original = item.record.colorAccessor == null ? null : await preview.parser.getDependency('accessor', item.record.colorAccessor);
    }
    // A callback may produce a different graph for each object. Share only
    // when the caller opted in and the geometry-dependent material state agrees.
    const variant = materialVariant?.(item.object) ?? '';
    if (typeof variant !== 'string') throw TypeError('Invalid material variant');
    const key = shareCompatibleMaterials && typeof toonOutput !== 'function' ? JSON.stringify([item.record.material,!!geometry.getAttribute('tangent'),!!geometry.getAttribute('normal'),nativeColor&&!!original,variant]) : null;
    const shared = key === null ? null : compatibleMaterials.get(key);
    if (shared) {
      if (!source.map) changes.push({object:item.object,material:shared});
      else if (nativeColor) changes.push({object:item.object,material:shared,color:original,replaceColor:true});
      else changes.push({object:item.object,material:shared,originalColor:original??new THREE.BufferAttribute(new Uint8Array(geometry.attributes.position.count*4).fill(255),4,true)});
      continue;
    }
    const nodeMaterial = renderer.library.fromMaterial(source);
    if (!nodeMaterial) throw Error(`Unsupported material type ${source.type}`);
    createdMaterials.push(nodeMaterial);
    nodeMaterial._wgRegisterReplica=replica=>{if(disposed||!replica?.isMaterial)throw TypeError('Invalid progressive material replica');let set=replicas.get(nodeMaterial);if(!set){set=new Set();replicas.set(nodeMaterial,set);}set.add(replica);for(const binding of mapBindings)if(binding.material===nodeMaterial)replica[binding.key]=nodeMaterial[binding.key];if(nodeMaterial.normalScale&&replica.normalScale)replica.normalScale.copy(nodeMaterial.normalScale);if(Object.hasOwn(nodeMaterial,'_wgTextureBlend'))replica._wgTextureBlend=nodeMaterial._wgTextureBlend;return ()=>{set.delete(replica);if(!set.size)replicas.delete(nodeMaterial);};};
    if (key !== null) compatibleMaterials.set(key,nodeMaterial);
    // GLTFLoader.assignFinalMaterial flips these scales for meshes without
    // tangents. fromMaterial copies by reference, so clone before adjusting.
    if (nodeMaterial.normalScale) nodeMaterial.normalScale = nodeMaterial.normalScale.clone();
    if (nodeMaterial.clearcoatNormalScale) nodeMaterial.clearcoatNormalScale = nodeMaterial.clearcoatNormalScale.clone();
    if (!item.object.geometry.getAttribute('tangent')) {
      if (nodeMaterial.normalScale) nodeMaterial.normalScale.y *= -1;
      if (nodeMaterial.clearcoatNormalScale) nodeMaterial.clearcoatNormalScale.y *= -1;
    }
    if (source.normalMap && nodeMaterial.normalScale) normalScales.push({ material:nodeMaterial,scale: nodeMaterial.normalScale, original: nodeMaterial.normalScale.clone() });
    if (!item.object.geometry.getAttribute('normal')) nodeMaterial.flatShading = true;
    if (toonOutput && !source.transparent) nodeMaterial.outputNode = typeof toonOutput === 'function' ? toonOutput(item.object) : toonOutput;
    // Keep the existence of every map stable; use neutral textures until ready.
    for (const [key, value] of Object.entries(source)) {
      if (!value?.isTexture) continue;
      const temporary = placeholder(value, key === 'normalMap');
      nodeMaterial[key] = temporary; mapBindings.push({ index, material: nodeMaterial, key, layout: textureLayout(temporary), final: value });
    }
    if (source.map) {
      if (nativeColor) {
        nodeMaterial.vertexColors = !!original;
        changes.push({ object: item.object, material: nodeMaterial, color: original, replaceColor: true });
        continue;
      }
      if (!original) original = new THREE.BufferAttribute(new Uint8Array(geometry.attributes.position.count * 4).fill(255), 4, true);
      nodeMaterial.vertexColors = false;
      nodeMaterial._wgTextureBlend=0;nodeMaterial.colorNode=progressiveColorNodeFor(nodeMaterial.map);progressiveMaterials.push(nodeMaterial);
      changes.push({ object: item.object, material: nodeMaterial, originalColor: original });
    } else {
      changes.push({ object: item.object, material: nodeMaterial });
    }
  } } catch (error) {
    for (const material of createdMaterials) material.dispose();
    for (const lease of placeholders.values()) lease.release();
    throw error;
  }
  for (const change of changes) {
    const geometry = change.object.geometry;
    if (change.replaceColor) { if (change.color) geometry.setAttribute('color', change.color); else geometry.deleteAttribute('color'); }
    if (change.originalColor) geometry.setAttribute('wgOriginalColor', change.originalColor);
    change.object.material = change.material;
  }
  return {
    placeholders: [...placeholders.values()].map(lease=>lease.texture),
    async resolveFinal(asset) {
      if (cancelled) throw Error('Material preparation cancelled');
      const current = ++generation;
      resolved = false;
      assertSource(asset);
      const finalSources = await Promise.all(entries.map(item => asset.parser.getDependency('material', item.record.material)));
      if (cancelled || generation !== current) throw Error('Material preparation cancelled or superseded');
      const textures = new Set();
      const resolvedBindings = [];
      for (const binding of mapBindings) {
        const value = finalSources[binding.index][binding.key];
        if (!value?.isTexture) throw Error(`Final texture missing: ${binding.key}`);
        if (textureLayout(value) !== binding.layout) throw Error(`Final texture layout mismatch: ${binding.key}`);
        resolvedBindings.push({ binding, value }); textures.add(value);
      }
      for (const { binding, value } of resolvedBindings) binding.final = value;
      resolved = true;
      return [...textures];
    },
    apply({ blend = 1 } = {}) {
      if (cancelled) throw Error('Material preparation cancelled');
      if (!resolved) throw Error('Final textures not ready');
      if (!Number.isFinite(blend) || blend < 0 || blend > 1) throw Error('Invalid texture blend');
      for (const binding of mapBindings) {binding.material[binding.key] = binding.final;for(const replica of replicas.get(binding.material)??[])replica[binding.key]=binding.final;}
      for (const item of normalScales) {item.scale.copy(item.original).multiplyScalar(blend);for(const replica of replicas.get(item.material)??[])replica.normalScale?.copy(item.scale);}
      for (const material of progressiveMaterials) {material._wgTextureBlend=blend;for(const replica of replicas.get(material)??[])replica._wgTextureBlend=blend;}
      applied = true;
    },
    setBlend(value) {
      if (cancelled) throw Error('Material preparation cancelled');
      if (!resolved) throw Error('Final textures not ready');
      if (!applied) throw Error('Final textures not applied');
      if (!Number.isFinite(value) || value < 0 || value > 1) throw Error('Invalid texture blend');
      for (const item of normalScales) {item.scale.copy(item.original).multiplyScalar(value);for(const replica of replicas.get(item.material)??[])replica.normalScale?.copy(item.scale);}
      for (const material of progressiveMaterials) {material._wgTextureBlend=value;for(const replica of replicas.get(material)??[])replica._wgTextureBlend=value;}
    },
    cancel() { cancelled = true; resolved = false; generation++; },
    dispose() { if (disposed) return; disposed = true; cancelled = true; resolved = false; generation++; replicas.clear();for (const material of createdMaterials) material.dispose(); for (const lease of placeholders.values()) lease.release(); },
  };
}
