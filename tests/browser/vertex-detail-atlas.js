import * as THREE from 'three';

// Research prototype: encode the signed difference between the original
// base-color texture and interpolated vertex color in a shared UV-space atlas.
// This deliberately retains the other original material maps for comparison.
export function buildDetailAtlas(renderer, models, { tileSize = 256, columns = 4 } = {}) {
  const primitives = [];
  for (const model of models) {
    const references = new Map();
    model.original.scene.traverse(object => {
      if (!object.isMesh) return;
      const a = model.original.parser.associations.get(object);
      if (a) references.set(`${a.meshes}:${a.primitives ?? 0}`, object);
    });
    model.preview.scene.traverse(object => {
      if (!object.isMesh) return;
      const a = model.preview.parser.associations.get(object);
      const reference = a && references.get(`${a.meshes}:${a.primitives ?? 0}`);
      if (!reference) throw Error('Original primitive not found');
      if (!reference.material.map) return;
      if (!object.geometry.attributes.color || !object.geometry.attributes.uv || object.geometry.attributes.position.count !== reference.geometry.attributes.position.count) throw Error('Incompatible vertex data');
      if (reference.material.map.channel !== 0) throw Error('Only UV0 supported');
      primitives.push({ object, reference });
    });
  }
  if (!primitives.length) throw Error('No textured primitives');
  const rows = Math.ceil(primitives.length / columns), width = columns * tileSize, height = rows * tileSize;
  if (width > renderer.capabilities.maxTextureSize || height > renderer.capabilities.maxTextureSize) throw Error('Atlas exceeds device limit');
  const pixels = new Uint8Array(width * height * 4); pixels.fill(128);
  const target = new THREE.WebGLRenderTarget(tileSize, tileSize, { depthBuffer: false });
  target.texture.colorSpace = THREE.NoColorSpace;
  const scene = new THREE.Scene(), camera = new THREE.Camera();
  const oldTarget = renderer.getRenderTarget(), oldClear = renderer.getClearColor(new THREE.Color()).clone(), oldAlpha = renderer.getClearAlpha();
  const tile = new Uint8Array(tileSize * tileSize * 4);
  for (const [index, item] of primitives.entries()) {
    const geometry = item.object.geometry.clone();
    geometry.setAttribute('bakedColor', item.object.geometry.attributes.color);
    let originalColor = item.reference.geometry.attributes.color;
    if (!originalColor) originalColor = new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count * 3).fill(1), 3);
    geometry.setAttribute('originalColor', originalColor);
    const material = new THREE.RawShaderMaterial({
      uniforms: { sourceMap: { value: item.reference.material.map }, baseColor: { value: item.reference.material.color } },
      vertexShader: `precision highp float; attribute vec2 uv; attribute vec3 bakedColor; attribute vec3 originalColor; varying vec2 vUv; varying vec3 vBaked; varying vec3 vOriginal; void main(){vUv=uv;vBaked=bakedColor;vOriginal=originalColor;gl_Position=vec4(uv*2.0-1.0,0.0,1.0);}`,
      fragmentShader: `precision highp float; uniform sampler2D sourceMap; uniform vec3 baseColor; varying vec2 vUv; varying vec3 vBaked; varying vec3 vOriginal; void main(){vec3 exact=texture2D(sourceMap,vUv).rgb*baseColor*vOriginal;gl_FragColor=vec4(clamp((exact-vBaked)*0.5+0.5,0.0,1.0),1.0);}`,
      side: THREE.DoubleSide, depthTest: false, depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material); mesh.frustumCulled = false; scene.add(mesh);
    renderer.setRenderTarget(target); renderer.setClearColor(new THREE.Color(.5, .5, .5), 1); renderer.clear(); renderer.render(scene, camera);
    renderer.readRenderTargetPixels(target, 0, 0, tileSize, tileSize, tile);
    const x = index % columns, y = Math.floor(index / columns);
    for (let row = 0; row < tileSize; row++) pixels.set(tile.subarray(row * tileSize * 4, (row + 1) * tileSize * 4), ((y * tileSize + row) * width + x * tileSize) * 4);
    item.rect = new THREE.Vector4(x / columns, y / rows, 1 / columns, 1 / rows);
    scene.remove(mesh); geometry.dispose(); material.dispose();
  }
  renderer.setRenderTarget(oldTarget); renderer.setClearColor(oldClear, oldAlpha); target.dispose();
  const atlas = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat); atlas.colorSpace = THREE.NoColorSpace;
  atlas.magFilter = THREE.NearestFilter; atlas.minFilter = THREE.NearestFilter; atlas.generateMipmaps = false; atlas.needsUpdate = true;
  for (const item of primitives) {
    const material = item.reference.material.clone(); material.map = null; material.color.setRGB(1, 1, 1); material.vertexColors = true;
    material.defines = { ...material.defines, USE_UV: '' };
    material.onBeforeCompile = shader => {
      shader.uniforms.wgDetailAtlas = { value: atlas }; shader.uniforms.wgDetailRect = { value: item.rect };
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D wgDetailAtlas; uniform vec4 wgDetailRect;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\nvec2 wgUV=clamp(vUv,vec2(0.001),vec2(0.999)); diffuseColor.rgb=clamp(diffuseColor.rgb+(texture2D(wgDetailAtlas,wgDetailRect.xy+wgUV*wgDetailRect.zw).rgb*2.0-1.0),0.0,1.0);');
    };
    material.customProgramCacheKey = () => 'wg-detail-atlas-prototype-v1'; material.needsUpdate = true;
    item.object.material = material;
  }
  return { atlas, primitives: primitives.length, width, height, bytes: pixels.byteLength, tileSize };
}
