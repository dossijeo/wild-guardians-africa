import * as THREE from 'three';
import { attribute, mix, texture, uniform, vec4 } from 'three/tsl';

const textureLayoutProperties=['colorSpace','mapping','channel','wrapS','wrapT','wrapR','magFilter','minFilter','anisotropy'];
const textureLayout=texture=>JSON.stringify(textureLayoutProperties.map(key=>texture[key]));
const neutralTextures=new WeakMap();

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
export async function makeStableVertexMaterials(renderer, preview, originalMaterials, mapping, { nativeColor = false, toonOutput = null } = {}) {
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
  const placeholders = new Map(), textureNodes = [], mapBindings = [], changes = [], createdMaterials = [], normalScales = [];
  const ready = uniform(0);
  let generation = 0, cancelled = false, resolved = false, applied = false, disposed = false;
  function placeholder(source, normal) {
    const key = JSON.stringify([normal,textureLayout(source)]);
    if (!placeholders.has(key)) {
      placeholders.set(key,acquireNeutralTexture(renderer,source,normal));
    }
    return placeholders.get(key).texture;
  }
  try { for (const [index, item] of entries.entries()) {
    const source = sources[index], nodeMaterial = renderer.library.fromMaterial(source);
    if (!nodeMaterial) throw Error(`Unsupported material type ${source.type}`);
    createdMaterials.push(nodeMaterial);
    // GLTFLoader.assignFinalMaterial flips these scales for meshes without
    // tangents. fromMaterial copies by reference, so clone before adjusting.
    if (nodeMaterial.normalScale) nodeMaterial.normalScale = nodeMaterial.normalScale.clone();
    if (nodeMaterial.clearcoatNormalScale) nodeMaterial.clearcoatNormalScale = nodeMaterial.clearcoatNormalScale.clone();
    if (!item.object.geometry.getAttribute('tangent')) {
      if (nodeMaterial.normalScale) nodeMaterial.normalScale.y *= -1;
      if (nodeMaterial.clearcoatNormalScale) nodeMaterial.clearcoatNormalScale.y *= -1;
    }
    if (source.normalMap && nodeMaterial.normalScale) normalScales.push({ scale: nodeMaterial.normalScale, original: nodeMaterial.normalScale.clone() });
    if (!item.object.geometry.getAttribute('normal')) nodeMaterial.flatShading = true;
    if (toonOutput && !source.transparent) nodeMaterial.outputNode = typeof toonOutput === 'function' ? toonOutput(item.object) : toonOutput;
    // Keep the existence of every map stable; use neutral textures until ready.
    for (const [key, value] of Object.entries(source)) {
      if (!value?.isTexture) continue;
      const temporary = placeholder(value, key === 'normalMap');
      nodeMaterial[key] = temporary; mapBindings.push({ index, material: nodeMaterial, key, layout: textureLayout(temporary), final: value });
    }
    if (source.map) {
      const geometry = item.object.geometry;
      if (!geometry.getAttribute('color')) throw Error('Missing baked vertex color');
      let original = item.record.colorAccessor == null ? null : await preview.parser.getDependency('accessor', item.record.colorAccessor);
      if (nativeColor) {
        nodeMaterial.vertexColors = !!original;
        changes.push({ object: item.object, material: nodeMaterial, color: original, replaceColor: true });
        continue;
      }
      if (!original) original = new THREE.BufferAttribute(new Uint8Array(geometry.attributes.position.count * 4).fill(255), 4, true);
      const sampled = texture(placeholder(source.map, false));
      textureNodes.push({ index, node: sampled, final: source.map });
      nodeMaterial.vertexColors = false;
      nodeMaterial.colorNode = vec4(mix(attribute('color', 'vec4').rgb, sampled.rgb.mul(uniform(source.color.clone())).mul(attribute('wgOriginalColor', 'vec4').rgb), ready), 1);
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
      const resolvedBindings = [], resolvedNodes = [];
      for (const binding of mapBindings) {
        const value = finalSources[binding.index][binding.key];
        if (!value?.isTexture) throw Error(`Final texture missing: ${binding.key}`);
        if (textureLayout(value) !== binding.layout) throw Error(`Final texture layout mismatch: ${binding.key}`);
        resolvedBindings.push({ binding, value }); textures.add(value);
      }
      for (const item of textureNodes) { const value = finalSources[item.index].map; if (!value?.isTexture) throw Error('Final base texture missing'); resolvedNodes.push({ item, value }); }
      for (const { binding, value } of resolvedBindings) binding.final = value;
      for (const { item, value } of resolvedNodes) item.final = value;
      resolved = true;
      return [...textures];
    },
    apply({ blend = 1 } = {}) {
      if (cancelled) throw Error('Material preparation cancelled');
      if (!resolved) throw Error('Final textures not ready');
      if (!Number.isFinite(blend) || blend < 0 || blend > 1) throw Error('Invalid texture blend');
      for (const binding of mapBindings) binding.material[binding.key] = binding.final;
      for (const item of textureNodes) item.node.value = item.final;
      for (const item of normalScales) item.scale.copy(item.original).multiplyScalar(blend);
      ready.value = blend; applied = true;
    },
    setBlend(value) {
      if (cancelled) throw Error('Material preparation cancelled');
      if (!resolved) throw Error('Final textures not ready');
      if (!applied) throw Error('Final textures not applied');
      if (!Number.isFinite(value) || value < 0 || value > 1) throw Error('Invalid texture blend');
      for (const item of normalScales) item.scale.copy(item.original).multiplyScalar(value);
      ready.value = value;
    },
    cancel() { cancelled = true; resolved = false; generation++; },
    dispose() { if (disposed) return; disposed = true; cancelled = true; resolved = false; generation++; for (const material of createdMaterials) material.dispose(); for (const lease of placeholders.values()) lease.release(); },
  };
}
