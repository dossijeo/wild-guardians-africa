import {
  Fn, If, Loop, Break, float, vec2, vec3, uniform, texture,
  positionWorld, positionLocal, normalWorldGeometry, cameraPosition,
  transformNormalToView, dFdx, dFdy, sin, mix, smoothstep,
} from 'three/tsl';

// An API-isolation diagnostic, NOT a replacement for AfricanToon.
export async function createTerrainScene({ THREE, backend, renderer }) {
  if (backend === 'legacy') throw new Error('Terrain diagnostic requires common TSL WebGPURenderer (WebGPU or forceWebGL).');
  const config = (await (await fetch('/content/ground-materials.json')).json()).savanna;
  const textures = await Promise.all([config.base, config.normal, config.arh].map(url => new THREE.TextureLoader().loadAsync(new URL(url, location.origin + '/').href)));
  for (const tex of textures) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.NoColorSpace;
    tex.anisotropy = 8;
  }
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1280 / 720, .1, 160);
  const clock = uniform(0);
  const baseUV = vec2(positionWorld.x.mul(.8).add(positionWorld.z.mul(.6)),
    positionWorld.x.mul(-.6).add(positionWorld.z.mul(.8))).mul(config.scale);
  const dx = dFdx(baseUV), dy = dFdy(baseUV);
  const footprint = dFdx(positionWorld).length().max(dFdy(positionWorld).length());
  const up = smoothstep(.3, .82, normalWorldGeometry.y);
  const path = float(1).sub(smoothstep(1.3, 2.5, positionWorld.x.sub(sin(positionWorld.z.mul(.14)).mul(2)).abs()));
  const cover = float(1).sub(path.mul(.91)).mul(up);
  const displacedUV = Fn(() => {
    const uv = baseUV.toVar();
    const fade = float(1).sub(smoothstep(.065, .20, footprint));
    If(fade.greaterThan(.01).and(up.greaterThan(.01)), () => {
      const N = normalWorldGeometry.normalize();
      const V = cameraPosition.sub(positionWorld).normalize();
      const T = vec3(.8, 0, .6).sub(N.mul(N.dot(vec3(.8, 0, .6)))).normalize();
      const B = N.cross(T).normalize();
      const ray = vec2(V.dot(T), V.dot(B).negate())
        .div(V.dot(N).abs().max(.36)).mul(config.relief * config.scale).mul(fade).mul(up);
      const p = uv.add(ray.mul(.45)).toVar();
      const depth = float(0).toVar();
      Loop(8, () => {
        const h = texture(textures[2], p).grad(dx, dy).b;
        If(depth.greaterThanEqual(float(1).sub(h)), () => Break());
        p.subAssign(ray.div(8));
        depth.addAssign(.125);
      });
      uv.assign(p);
    });
    return uv;
  })().toVar('terrainParallaxUV');
  const arh = texture(textures[2], displacedUV).grad(dx, dy);
  const mapped = texture(textures[1], displacedUV).grad(dx, dy).xyz.mul(2).sub(1);
  const normalFade = float(1).sub(smoothstep(.12, .60, footprint));
  const terrainMaterial = new THREE.MeshStandardNodeMaterial();
  terrainMaterial.colorNode = mix(vec3(.50, .35, .17),
    texture(textures[0], displacedUV).grad(dx, dy).rgb.mul(vec3(1.14, 1.09, .97)), cover);
  terrainMaterial.roughnessNode = mix(.92, arh.g.clamp(.26, .99), cover);
  terrainMaterial.aoNode = mix(1, mix(.45, 1, arh.r), cover);
  terrainMaterial.normalNode = Fn(() => {
    const N = normalWorldGeometry.normalize();
    const T = vec3(.8, 0, .6).sub(N.mul(N.dot(vec3(.8, 0, .6)))).normalize();
    const B = N.cross(T).normalize();
    const amount = cover.mul(normalFade).mul(config.normalBoost);
    return transformNormalToView(N.mul(mapped.z.max(.15))
      .add(T.mul(mapped.x).mul(amount)).sub(B.mul(mapped.y).mul(amount)).normalize());
  })();
  const height = (x, z) => .46 * Math.sin(x * .17) * Math.cos(z * .13) + .18 * Math.sin(z * .37);
  const terrainGeometry = new THREE.PlaneGeometry(64, 64, 128, 128);
  terrainGeometry.rotateX(-Math.PI / 2);
  const positions = terrainGeometry.attributes.position;
  for (let i = 0; i < positions.count; i++) positions.setY(i, height(positions.getX(i), positions.getZ(i)));
  terrainGeometry.computeVertexNormals();
  const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
  terrain.receiveShadow = true;
  scene.add(terrain);

  const light = new THREE.DirectionalLight(0xffe6bb, 2.7);
  light.position.set(-18, 28, 14);
  light.castShadow = true;
  Object.assign(light.shadow.camera, { left: -35, right: 35, top: 35, bottom: -35, near: .1, far: 100 });
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.normalBias = .025;
  const ambient = new THREE.HemisphereLight(0xc1d8ee, 0x80603d, 1.0);
  scene.add(light, ambient);
  const objectMaterial = new THREE.MeshStandardNodeMaterial({ color: 0x995d39, roughness: .85 });
  const objectGeometry = new THREE.BoxGeometry(3, 3, 3);
  for (const [x, z] of [[-7, -5], [7, -9], [-13, 3], [14, 4]]) {
    const mesh = new THREE.Mesh(objectGeometry, objectMaterial);
    mesh.position.set(x, height(x, z) + 1.5, z);
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
  }

  // Shared three-triangle ribbon, visual-only distribution, no alpha blending.
  const bladeGeometry = new THREE.BufferGeometry();
  bladeGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -.045, 0, 0, .045, 0, 0, -.025, .23, .018,
    .045, 0, 0, .025, .23, .018, -.025, .23, .018,
    -.025, .23, .018, .025, .23, .018, 0, .46, .06,
  ], 3));
  bladeGeometry.computeVertexNormals();
  const grassMaterial = new THREE.MeshStandardNodeMaterial({ color: 0x969043, roughness: .95, side: THREE.DoubleSide });
  grassMaterial.positionNode = Fn(() => {
    const p = positionLocal.toVar();
    const wave = sin(clock.mul(1.15).add(positionWorld.x.mul(.21)).add(positionWorld.z.mul(.13)));
    p.x.addAssign(wave.mul(p.y.pow(2)).mul(1.5));
    p.z.addAssign(wave.mul(p.y.pow(2)).mul(.57));
    return p;
  })();
  const matrices = [], dummy = new THREE.Object3D();
  const hash = n => { const v = Math.sin(n * 127.1 + 712) * 43758.5453; return v - Math.floor(v); };
  for (let z = -24, row = 0; z < 24; z += .42, row++) {
    for (let x = -24, col = 0; x < 24; x += .42, col++) {
      const id = row * 1000 + col, px = x + (hash(id) - .5) * .36, pz = z + (hash(id + 97) - .5) * .36;
      if (Math.abs(px - Math.sin(pz * .14) * 2) < 2.2 || [[-7,-5],[7,-9],[-13,3],[14,4]].some(([a,b]) => Math.abs(px-a)<1.7 && Math.abs(pz-b)<1.7)) continue;
      dummy.position.set(px, height(px, pz), pz);
      dummy.rotation.y = hash(id + 313) * Math.PI * 2;
      dummy.scale.setScalar(.65 + hash(id + 919) * .55);
      dummy.updateMatrix();
      matrices.push(dummy.matrix.clone());
    }
  }
  const grass = new THREE.InstancedMesh(bladeGeometry, grassMaterial, matrices.length);
  matrices.forEach((matrix, index) => grass.setMatrixAt(index, matrix));
  grass.receiveShadow = true;
  grass.computeBoundingSphere();
  scene.add(grass);
  renderer.shadowMap.enabled = true;
  const metadata = {
    scenario: 'B common-TSL diagnostic', seed: 712, textureConfig: config,
    terrainTriangles: 32768, grassInstances: matrices.length, grassTriangles: matrices.length * 3,
    pomMaxSamples: 8, materialTextureSamples: '3 + 0..8 ARH POM reads per terrain fragment',
    shadowMap: '1024² directional, renderer-native shadow filter',
    limitations: ['Not AfricanToon visual parity', 'Synthetic procedural terrain/mask and occluders; not campaign scene',
      'No native-shadow cache, render-origin, fluids, contact shadows or production streaming',
      'Grass normal deformation omitted equally on both backends; no individual grass shadow casting'],
  };
  function update(time = 0, night = false, cameraStep = 0) {
    clock.value = time;
    const isNight = typeof night === 'number' ? night > .5 : night === true || night === 'night';
    light.intensity = isNight ? .12 : 2.7;
    light.color.set(isNight ? 0x7896d4 : 0xffe6bb);
    ambient.intensity = isNight ? .20 : 1;
    scene.background = new THREE.Color(isNight ? 0x101a30 : 0xbad3de);
    camera.position.set(13 + Math.sin(cameraStep) * 4, 8, 19 + Math.cos(cameraStep) * 3);
    camera.lookAt(0, 0, -2);
    camera.updateMatrixWorld();
  }
  update();
  return { scene, camera, update, metadata, dispose() {
    for (const resource of [terrainGeometry, terrainMaterial, objectGeometry, objectMaterial, bladeGeometry, grassMaterial, ...textures]) resource.dispose();
    grass.dispose();
    light.shadow.dispose();
    scene.clear();
  } };
}
