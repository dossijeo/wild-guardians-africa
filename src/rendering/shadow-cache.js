import * as THREE from 'three';

// Compare actual depth inputs, not frame counters or color material versions.
// Unknown depth shaders/callbacks deliberately fall back to drawing every frame.
export function shadowSnapshot(renderer, light, scene, camera) {
  if (!scene || !camera || renderer.shadowMap.type === THREE.VSMShadowMap) return null;
  const values = [], put = value => values.push(value);
  const numbers = array => { put(array.length); for (const value of array) put(value); };
  function input(value) {
    if (value == null || typeof value !== 'object') { put(value); return; }
    if (value.isTexture) {
      if (value.matrixAutoUpdate) value.updateMatrix();
      put(value); put(value.version); put(value.source); put(value.source?.version);
      put(value.wrapS); put(value.wrapT); put(value.minFilter); put(value.magFilter);
      numbers(value.matrix.elements); return;
    }
    if (value.elements) { numbers(value.elements); return; }
    if (value.toArray) { numbers(value.toArray()); return; }
    if (Array.isArray(value) || ArrayBuffer.isView(value)) {
      put(value.length); for (const element of value) input(element); return;
    }
    throw new Error('Unsupported depth input');
  }
  function attribute(attribute, count) {
    put(attribute);
    if (!attribute) return;
    const data = attribute.isInterleavedBufferAttribute ? attribute.data : attribute;
    put(data); put(attribute.itemSize); put(attribute.normalized);
    if (attribute.isInstancedBufferAttribute || data.isInstancedInterleavedBuffer) {
      // Producers may upload unchanged arrays every frame. Only active values
      // affect the depth map; version changes alone are not deformation.
      const active = Math.min(attribute.count, Math.ceil(count / (data.meshPerAttribute || 1)));
      put(active);
      for (let i = 0; i < active; i++) for (let j = 0; j < attribute.itemSize; j++)
        put(data.array[i * (data.stride || attribute.itemSize) + (attribute.offset || 0) + j]);
    } else put(data.version);
  }
  function material(material) {
    put(material); put(material.visible); put(material.side); put(material.shadowSide);
    put(material.alphaTest); put(material.alphaHash); put(material.opacity);
    put(material.displacementScale); put(material.displacementBias); put(material.wireframe);
    put(material.clipShadows); put(material.clipIntersection);
    input(material.clippingPlanes?.map(p => [p.normal.x, p.normal.y, p.normal.z, p.constant]) || []);
    input(material.map); input(material.alphaMap); input(material.displacementMap);
  }
  try {
    const shadow = light.shadow;
    shadow.updateMatrices(light);
    put(scene); put(shadow.map); put(shadow.map?.width); put(shadow.map?.height); put(shadow.map?.depthTexture); put(renderer.shadowMap.type);
    put(renderer.localClippingEnabled); input(renderer.clippingPlanes?.map(p => [p.normal.x, p.normal.y, p.normal.z, p.constant]) || []);
    input(shadow.mapSize); input(shadow.camera.projectionMatrix); input(shadow.camera.matrixWorldInverse);
    put(camera.layers.mask); input(camera.projectionMatrix); input(camera.matrixWorldInverse);
    scene.traverseVisible(object => {
      if (!object.castShadow || !object.layers.test(camera.layers) || (!object.isMesh && !object.isLine && !object.isPoints)) return;
      if (!object.isMesh) throw new Error('Untracked line/point shadow');
      const count = object.isInstancedMesh ? object.count : object.geometry.instanceCount;
      if (count === 0) return;
      if (object.onBeforeShadow !== THREE.Object3D.prototype.onBeforeShadow && object.onBeforeShadow !== object.userData.nativeShadowCallback)
        throw new Error('Untracked shadow callback');
      if (object.onAfterShadow !== THREE.Object3D.prototype.onAfterShadow) throw new Error('Untracked shadow callback');
      put(object); input(object.matrixWorld); put(object.frustumCulled); put(count);
      const geometry = object.geometry; put(geometry); put(geometry.drawRange.start); put(geometry.drawRange.count);
      for (const group of geometry.groups) { put(group.start); put(group.count); put(group.materialIndex); } put('groupsEnd');
      attribute(geometry.index, count);
      for (const name of Object.keys(geometry.attributes).sort()) { put(name); attribute(geometry.attributes[name], count); } put('attributesEnd');
      attribute(object.instanceMatrix, count);
      put(geometry.morphTargetsRelative);
      for (const name of Object.keys(geometry.morphAttributes).sort()) { put(name); for (const attr of geometry.morphAttributes[name]) attribute(attr, count); } put('morphEnd');
      input(object.morphTargetInfluences);
      if (object.morphTexture) input(object.morphTexture);
      if (object.isSkinnedMesh) {
        input(object.bindMatrix); input(object.bindMatrixInverse);
        for (let i = 0; i < object.skeleton.bones.length; i++) {
          // boneMatrices/texture are uploaded later by WebGLObjects; world
          // matrices already contain this frame's pose at shadow traversal.
          input(object.skeleton.bones[i].matrixWorld); input(object.skeleton.boneInverses[i]);
        }
      }
      for (const source of Array.isArray(object.material) ? object.material : [object.material]) material(source);
      const depth = object.customDepthMaterial; put(depth);
      if (depth) {
        const contract = depth.userData.nativeShadowInputs;
        if (typeof contract !== 'function') throw new Error('Untracked depth shader');
        put(contract); put(depth.onBeforeCompile); put(depth.customProgramCacheKey);
        input(Object.entries(depth.defines || {}).sort());
        put(depth.version); put(depth.vertexShader); put(depth.fragmentShader); material(depth); input(contract());
      }
    });
    return values;
  } catch { return null; }
}

export class ShadowCache {
  enabled = true;
  snapshot = null;
  stats = {draws: 0, hits: 0, untracked: 0};
  invalidate() { this.snapshot = null; }
  matches(next, forced = false) {
    if (!next) { this.stats.untracked++; return false; }
    return this.enabled && !forced && this.snapshot && next.length === this.snapshot.length && next.every((value, i) => Object.is(value, this.snapshot[i]));
  }
  commit(snapshot) { this.snapshot = snapshot; this.stats.draws++; }
}
