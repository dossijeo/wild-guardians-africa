import * as THREE from 'three';
import { attribute, mix, texture, uniform, vec4 } from 'three/tsl';

// Structural experiment only: the original materials are already decoded in
// CPU memory. Texture upload and the appearance change happen on demand later.
export async function makeStableVertexMaterials(renderer, preview, originalMaterials, mapping, { nativeColor = false } = {}) {
  const records = new Map(mapping.primitives.map(record => [`${record.mesh}:${record.primitive}`, record]));
  const entries = [];
  preview.scene.traverse(object => {
    if (!object.isMesh) return;
    const a = preview.parser.associations.get(object), record = a && records.get(`${a.meshes}:${a.primitives ?? 0}`);
    if (!record || record.material == null) throw Error('Missing material mapping');
    entries.push({ object, record });
  });
  const sources = await Promise.all(entries.map(item => originalMaterials.parser.getDependency('material', item.record.material)));
  const placeholders = new Map(), textureNodes = [], mapBindings = [];
  const ready = uniform(0);
  function placeholder(source, normal) {
    const key = `${source.colorSpace}:${normal}`;
    if (!placeholders.has(key)) {
      const pixel = new Uint8Array(normal ? [128, 128, 255, 255] : [255, 255, 255, 255]);
      const result = new THREE.DataTexture(pixel, 1, 1, THREE.RGBAFormat); result.colorSpace = source.colorSpace; result.flipY = false; result.needsUpdate = true; placeholders.set(key, result);
    }
    return placeholders.get(key);
  }
  for (const [index, item] of entries.entries()) {
    const source = sources[index], nodeMaterial = renderer.library.fromMaterial(source);
    if (!nodeMaterial) throw Error(`Unsupported material type ${source.type}`);
    // GLTFLoader.assignFinalMaterial flips these scales for meshes without
    // tangents. fromMaterial copies by reference, so clone before adjusting.
    if (nodeMaterial.normalScale) nodeMaterial.normalScale = nodeMaterial.normalScale.clone();
    if (nodeMaterial.clearcoatNormalScale) nodeMaterial.clearcoatNormalScale = nodeMaterial.clearcoatNormalScale.clone();
    if (!item.object.geometry.getAttribute('tangent')) {
      if (nodeMaterial.normalScale) nodeMaterial.normalScale.y *= -1;
      if (nodeMaterial.clearcoatNormalScale) nodeMaterial.clearcoatNormalScale.y *= -1;
    }
    if (!item.object.geometry.getAttribute('normal')) nodeMaterial.flatShading = true;
    // Keep the existence of every map stable; use neutral textures until ready.
    for (const [key, value] of Object.entries(source)) {
      if (!value?.isTexture) continue;
      const temporary = placeholder(value, key === 'normalMap');
      nodeMaterial[key] = temporary; mapBindings.push({ index, material: nodeMaterial, key, final: value });
    }
    if (source.map) {
      const geometry = item.object.geometry;
      if (!geometry.getAttribute('color')) throw Error('Missing baked vertex color');
      let original = item.record.colorAccessor == null ? null : await preview.parser.getDependency('accessor', item.record.colorAccessor);
      if (nativeColor) {
        if (original) geometry.setAttribute('color', original); else geometry.deleteAttribute('color');
        nodeMaterial.vertexColors = !!original;
        item.object.material = nodeMaterial;
        continue;
      }
      if (!original) original = new THREE.BufferAttribute(new Uint8Array(geometry.attributes.position.count * 4).fill(255), 4, true);
      geometry.setAttribute('wgOriginalColor', original);
      const sampled = texture(placeholder(source.map, false));
      textureNodes.push({ index, node: sampled, final: source.map });
      nodeMaterial.vertexColors = false;
      nodeMaterial.colorNode = vec4(mix(attribute('color', 'vec4').rgb, sampled.rgb.mul(uniform(source.color.clone())).mul(attribute('wgOriginalColor', 'vec4').rgb), ready), 1);
    }
    item.object.material = nodeMaterial;
  }
  return {
    placeholders: [...placeholders.values()],
    async resolveFinal(asset) {
      const finalSources = await Promise.all(entries.map(item => asset.parser.getDependency('material', item.record.material)));
      const textures = new Set();
      for (const binding of mapBindings) {
        const value = finalSources[binding.index][binding.key];
        if (!value?.isTexture) throw Error(`Final texture missing: ${binding.key}`);
        binding.final = value; textures.add(value);
      }
      for (const item of textureNodes) { item.final = finalSources[item.index].map; if (!item.final?.isTexture) throw Error('Final base texture missing'); }
      return [...textures];
    },
    apply() {
      for (const binding of mapBindings) binding.material[binding.key] = binding.final;
      for (const item of textureNodes) item.node.value = item.final;
      ready.value = 1;
    },
  };
}
