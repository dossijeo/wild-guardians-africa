import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeStableVertexMaterials } from './browser/vertex-stable-material.js';

const sourceHash = 'a'.repeat(64);
function setup() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0], 3));
  geometry.setAttribute('color', new THREE.Uint8BufferAttribute([100, 100, 100, 255], 4, true));
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
  const scene = new THREE.Group(); scene.add(mesh);
  const parser = { json: { asset: { extras: { wgVertexPreviewSourceSha256: sourceHash } } }, associations: new Map([[mesh, { meshes: 0, primitives: 0 }]]) };
  const preview = { scene, parser }, mapping = { sourceSha256: sourceHash, primitives: [{ mesh: 0, primitive: 0, material: 0, colorAccessor: null }] };
  const material = new THREE.MeshStandardMaterial(); material.map = new THREE.Texture(); material.normalMap = new THREE.Texture();
  const asset = (value, hash = sourceHash) => ({ parser: { json: { asset: { extras: { wgVertexPreviewSourceSha256: hash } } }, getDependency: () => Promise.resolve(value) } });
  const renderer = { library: { fromMaterial: source => source.clone() } };
  return { preview, mapping, material, asset, renderer, mesh };
}

test('compatible primitives can share their final and provisional material',async()=>{
 const x=setup(),second=x.mesh.clone();second.geometry=x.mesh.geometry.clone();x.preview.scene.add(second);x.preview.parser.associations.set(second,{meshes:1,primitives:0});x.mapping.primitives.push({mesh:1,primitive:0,material:0,colorAccessor:null});
 const stable=await makeStableVertexMaterials(x.renderer,x.preview,x.asset(x.material),x.mapping,{shareCompatibleMaterials:true});
 assert.equal(x.mesh.material,second.material);assert.ok(second.geometry.getAttribute('wgOriginalColor'));
 await stable.resolveFinal(x.asset(x.material));stable.apply({blend:.5});assert.equal(second.material.map,x.material.map);stable.dispose();
});

test('different assets share the progressive graph while their texture and blend remain independent',async()=>{
 const a=setup(),b=setup();a.material.color.setHex(0x804020);b.material.color.setHex(0x206080);
 const first=await makeStableVertexMaterials(a.renderer,a.preview,a.asset(a.material),a.mapping),second=await makeStableVertexMaterials(b.renderer,b.preview,b.asset(b.material),b.mapping);
 assert.equal(a.mesh.material.colorNode,b.mesh.material.colorNode);assert.equal(a.mesh.material.colorNode.getCacheKey(),b.mesh.material.colorNode.getCacheKey());
 const references=new Map();a.mesh.material.colorNode.traverse(node=>{if(node.isMaterialReferenceNode)references.set(node.property,node);});
 assert.ok(references.has('map'));assert.ok(references.has('color'));assert.ok(references.has('_wgTextureBlend'));
 await first.resolveFinal(a.asset(a.material));first.apply({blend:.3});await second.resolveFinal(b.asset(b.material));second.apply({blend:.8});
 for(const [item,map,blend] of [[a,a.material.map,.3],[b,b.material.map,.8]]){for(const ref of references.values())ref.updateReference({material:item.mesh.material});assert.equal(references.get('map').getValueFromReference(),map);assert.equal(references.get('_wgTextureBlend').getValueFromReference(),blend);assert.ok(references.get('color').getValueFromReference().equals(item.material.color));}
 first.dispose();second.dispose();
});

test('sampler differences retain separate color graphs and compatible placeholder and final samplers',async()=>{
 const a=setup(),b=setup();b.renderer=a.renderer;b.material.map.wrapS=THREE.RepeatWrapping;b.material.map.minFilter=THREE.NearestFilter;b.material.map.magFilter=THREE.NearestFilter;b.material.map.anisotropy=4;
 const first=await makeStableVertexMaterials(a.renderer,a.preview,a.asset(a.material),a.mapping),second=await makeStableVertexMaterials(b.renderer,b.preview,b.asset(b.material),b.mapping);
 try{assert.notEqual(a.mesh.material.colorNode,b.mesh.material.colorNode);assert.notEqual(a.mesh.material.map,b.mesh.material.map);assert.equal(b.mesh.material.map.wrapS,THREE.RepeatWrapping);assert.equal(b.mesh.material.map.minFilter,THREE.NearestFilter);await first.resolveFinal(a.asset(a.material));await second.resolveFinal(b.asset(b.material));first.apply({blend:.2});second.apply({blend:.8});assert.equal(a.mesh.material.map,a.material.map);assert.equal(b.mesh.material.map,b.material.map);assert.equal(a.mesh.material._wgTextureBlend,.2);assert.equal(b.mesh.material._wgTextureBlend,.8);}finally{first.dispose();second.dispose();}
});

test('anisotropy variants share the graph without sharing sampler resources',async()=>{
 const a=setup(),b=setup();b.renderer=a.renderer;b.material.map.anisotropy=4;const first=await makeStableVertexMaterials(a.renderer,a.preview,a.asset(a.material),a.mapping),second=await makeStableVertexMaterials(b.renderer,b.preview,b.asset(b.material),b.mapping);
 try{assert.equal(a.mesh.material.colorNode,b.mesh.material.colorNode);assert.notEqual(a.mesh.material.map,b.mesh.material.map);assert.equal(a.mesh.material.map.anisotropy,1);assert.equal(b.mesh.material.map.anisotropy,4);await first.resolveFinal(a.asset(a.material));await second.resolveFinal(b.asset(b.material));first.apply({blend:.3});second.apply({blend:.7});assert.equal(a.mesh.material.map.anisotropy,1);assert.equal(b.mesh.material.map.anisotropy,4);assert.equal(a.mesh.material._wgTextureBlend,.3);assert.equal(b.mesh.material._wgTextureBlend,.7);}finally{first.dispose();second.dispose();}
});

test('the shared color graph carries preview, original vertex and texture alpha through the blend',async()=>{
 const x=setup(),stable=await makeStableVertexMaterials(x.renderer,x.preview,x.asset(x.material),x.mapping),alpha=[];x.mesh.material.colorNode.traverse(node=>{if(node.isSplitNode&&node.components==='w')alpha.push(node.node);});assert.equal(alpha.filter(node=>node.type==='AttributeNode').length,2);assert.equal(alpha.filter(node=>node.isMaterialReferenceNode&&node.property==='map').length,1);const graph=x.mesh.material.colorNode,version=x.mesh.material.version;await stable.resolveFinal(x.asset(x.material));stable.apply({blend:.25});stable.setBlend(1);assert.equal(x.mesh.material.colorNode,graph);assert.equal(x.mesh.material.version,version);stable.dispose();
});

test('different UV channels retain separate progressive graphs',async()=>{
 const a=setup(),b=setup();b.material.map.channel=1;const first=await makeStableVertexMaterials(a.renderer,a.preview,a.asset(a.material),a.mapping),second=await makeStableVertexMaterials(b.renderer,b.preview,b.asset(b.material),b.mapping);assert.notEqual(a.mesh.material.colorNode,b.mesh.material.colorNode);assert.notEqual(a.mesh.material.colorNode.getCacheKey(),b.mesh.material.colorNode.getCacheKey());first.dispose();second.dispose();
});

test('a registered baked material follows progressive maps and blend and can be released',async()=>{
 const x=setup(),stable=await makeStableVertexMaterials(x.renderer,x.preview,x.asset(x.material),x.mapping),source=x.mesh.material,replica=source.clone(),release=source._wgRegisterReplica(replica),placeholder=replica.map;
 await stable.resolveFinal(x.asset(x.material));stable.apply({blend:.25});assert.notEqual(replica.map,placeholder);assert.equal(replica.map,x.material.map);assert.equal(replica.normalMap,x.material.normalMap);assert.equal(replica._wgTextureBlend,.25);assert.ok(replica.normalScale.equals(source.normalScale));
 stable.setBlend(.75);assert.equal(replica._wgTextureBlend,.75);assert.ok(replica.normalScale.equals(source.normalScale));release();stable.setBlend(1);assert.equal(replica._wgTextureBlend,.75);stable.dispose();replica.dispose();
});

test('tangent layout differences keep incompatible material instances separate',async()=>{
 const x=setup(),second=x.mesh.clone();second.geometry=x.mesh.geometry.clone();second.geometry.setAttribute('tangent',new THREE.Float32BufferAttribute([1,0,0,1],4));x.preview.scene.add(second);x.preview.parser.associations.set(second,{meshes:1,primitives:0});x.mapping.primitives.push({mesh:1,primitive:0,material:0,colorAccessor:null});
 const stable=await makeStableVertexMaterials(x.renderer,x.preview,x.asset(x.material),x.mapping,{shareCompatibleMaterials:true});assert.notEqual(x.mesh.material,second.material);assert.equal(x.mesh.material.normalScale.y,-second.material.normalScale.y);stable.dispose();
});

test('sharing preserves separate object-dependent shader variants',async()=>{
 const x=setup(),fur=x.mesh.clone(),other=x.mesh.clone();fur.geometry=x.mesh.geometry.clone();other.geometry=x.mesh.geometry.clone();fur.geometry.setAttribute('_fur_light',new THREE.Float32BufferAttribute([.5],1));
 x.preview.scene.add(fur,other);x.preview.parser.associations.set(fur,{meshes:1,primitives:0});x.preview.parser.associations.set(other,{meshes:2,primitives:0});x.mapping.primitives.push({mesh:1,primitive:0,material:0,colorAccessor:null},{mesh:2,primitive:0,material:0,colorAccessor:null});
 const stable=await makeStableVertexMaterials(x.renderer,x.preview,x.asset(x.material),x.mapping,{shareCompatibleMaterials:true,materialVariant:object=>object.geometry.getAttribute('_fur_light')?'fur':'base'});
 assert.equal(x.mesh.material,other.material);assert.notEqual(x.mesh.material,fur.material);await stable.resolveFinal(x.asset(x.material));stable.apply();assert.equal(fur.material.map,x.material.map);stable.dispose();
});

test('stable material refuses premature or mismatched texture application', async () => {
  const x = setup(), stable = await makeStableVertexMaterials(x.renderer, x.preview, x.asset(x.material), x.mapping);
  const placeholder = x.mesh.material.map;
  assert.throws(() => stable.apply(), /not ready/);
  await assert.rejects(stable.resolveFinal(x.asset(x.material, 'b'.repeat(64))), /source mismatch/);
  assert.throws(() => stable.apply(), /not ready/);
  assert.equal(x.mesh.material.map, placeholder);
  const incomplete = x.material.clone(); incomplete.normalMap = null;
  await assert.rejects(stable.resolveFinal(x.asset(incomplete)), /missing/);
  assert.throws(() => stable.apply(), /not ready/);
  assert.equal(x.mesh.material.map, placeholder);
  const textures = await stable.resolveFinal(x.asset(x.material));
  assert.equal(textures.length, 2);
  stable.apply();
  assert.equal(x.mesh.material.map, x.material.map);
  assert.equal(x.mesh.material.normalMap, x.material.normalMap);
});

test('placeholder textures preserve each source sampler and UV channel', async () => {
  const x = setup();
  x.material.map.wrapS = THREE.RepeatWrapping;
  x.material.map.minFilter = THREE.LinearMipmapLinearFilter;
  x.material.map.channel = 1;
  x.material.normalMap.wrapS = THREE.ClampToEdgeWrapping;
  const stable = await makeStableVertexMaterials(x.renderer, x.preview, x.asset(x.material), x.mapping);
  for (const key of ['mapping', 'channel', 'wrapS', 'wrapT', 'wrapR', 'magFilter', 'minFilter', 'anisotropy', 'colorSpace']) {
    assert.equal(x.mesh.material.map[key], x.material.map[key], key);
    assert.equal(x.mesh.material.normalMap[key], x.material.normalMap[key], key);
  }
  assert.notEqual(x.mesh.material.map, x.mesh.material.normalMap);
  stable.dispose();
});

test('incompatible final texture layout leaves the provisional material intact', async () => {
  const x = setup(), stable = await makeStableVertexMaterials(x.renderer, x.preview, x.asset(x.material), x.mapping);
  const placeholder=x.mesh.material.map,final=x.material.clone();final.map=x.material.map.clone();final.map.wrapS=THREE.RepeatWrapping;
  await assert.rejects(stable.resolveFinal(x.asset(final)),/layout mismatch: map/);
  assert.throws(()=>stable.apply(),/not ready/);assert.equal(x.mesh.material.map,placeholder);
  await stable.resolveFinal(x.asset(x.material));stable.apply();assert.equal(x.mesh.material.map,x.material.map);stable.dispose();
});

test('texture replacement rejects incompatible WebGPU binding dimensions and sample types',async()=>{
 const candidates=[new THREE.DataArrayTexture(new Uint8Array(4),1,1,1),new THREE.Data3DTexture(new Uint8Array(4),1,1,1),new THREE.DepthTexture(1,1),new THREE.DataTexture(new Uint32Array(4),1,1,THREE.RGBAIntegerFormat,THREE.UnsignedIntType),new THREE.DataTexture(new Float32Array(4),1,1,THREE.RGBAFormat,THREE.FloatType)];
 for(const candidate of candidates){const x=setup(),stable=await makeStableVertexMaterials(x.renderer,x.preview,x.asset(x.material),x.mapping),placeholder=x.mesh.material.map,final=x.material.clone();for(const key of ['colorSpace','mapping','channel','wrapS','wrapT','wrapR','magFilter','minFilter','anisotropy'])candidate[key]=x.material.map[key];final.map=candidate;await assert.rejects(stable.resolveFinal(x.asset(final)),/layout mismatch: map/);assert.equal(x.mesh.material.map,placeholder);stable.dispose();candidate.dispose();}
});

test('compatible compressed 2D color data keeps the same sampled binding',async()=>{
 const x=setup(),stable=await makeStableVertexMaterials(x.renderer,x.preview,x.asset(x.material),x.mapping),final=x.material.clone(),compressed=new THREE.CompressedTexture([],1,1,THREE.RGBA_BPTC_Format);for(const key of ['colorSpace','mapping','channel','wrapS','wrapT','wrapR','magFilter','minFilter','anisotropy'])compressed[key]=x.material.map[key];final.map=compressed;await stable.resolveFinal(x.asset(final));stable.apply();assert.equal(x.mesh.material.map,compressed);stable.dispose();compressed.dispose();
});

test('compatible neutral textures are shared only within a renderer and released after the last owner',async()=>{
 const a=setup(),b=setup(),c=setup();b.renderer=a.renderer;
 const first=await makeStableVertexMaterials(a.renderer,a.preview,a.asset(a.material),a.mapping),second=await makeStableVertexMaterials(b.renderer,b.preview,b.asset(b.material),b.mapping),third=await makeStableVertexMaterials(c.renderer,c.preview,c.asset(c.material),c.mapping);
 const shared=a.mesh.material.map;assert.equal(b.mesh.material.map,shared);assert.notEqual(c.mesh.material.map,shared);let disposals=0;shared.addEventListener('dispose',()=>disposals++);
 first.dispose();assert.equal(disposals,0);second.dispose();assert.equal(disposals,1);second.dispose();assert.equal(disposals,1);third.dispose();
});

test('failed setup releases its neutral texture leases without affecting another asset',async()=>{
 const a=setup(),b=setup();b.renderer=a.renderer;const stable=await makeStableVertexMaterials(a.renderer,a.preview,a.asset(a.material),a.mapping),shared=a.mesh.material.map;let disposals=0;shared.addEventListener('dispose',()=>disposals++);
 const bad=new THREE.Mesh(b.mesh.geometry.clone(),new THREE.MeshStandardMaterial());bad.geometry.deleteAttribute('color');b.preview.scene.add(bad);b.preview.parser.associations.set(bad,{meshes:1,primitives:0});b.mapping.primitives.push({mesh:1,primitive:0,material:0,colorAccessor:null});
 await assert.rejects(makeStableVertexMaterials(b.renderer,b.preview,b.asset(b.material),b.mapping),/Missing baked/);assert.equal(disposals,0);stable.dispose();assert.equal(disposals,1);
});

test('texture blending requires a resolved material and accepts only finite proportions', async () => {
  const x = setup(), stable = await makeStableVertexMaterials(x.renderer, x.preview, x.asset(x.material), x.mapping);
  assert.throws(() => stable.setBlend(.5), /not ready/);
  await stable.resolveFinal(x.asset(x.material));
  assert.throws(() => stable.setBlend(.5), /not applied/);
  assert.throws(() => stable.apply({ blend: NaN }), /Invalid texture blend/);
  stable.apply({ blend: 0 });
  assert.equal(x.mesh.material.normalScale.x, 0);
  stable.setBlend(.5); assert.equal(x.mesh.material.normalScale.x, .5);
  stable.setBlend(1); assert.equal(x.mesh.material.normalScale.x, 1);
  assert.throws(() => stable.setBlend(1.1), /Invalid texture blend/);
  stable.cancel(); assert.throws(() => stable.setBlend(.5), /cancelled/);
});

test('cancellation prevents in-flight and later application', async () => {
  const x = setup(), stable = await makeStableVertexMaterials(x.renderer, x.preview, x.asset(x.material), x.mapping);
  const placeholder = x.mesh.material.map; let finish;
  const pendingAsset = x.asset(x.material);
  pendingAsset.parser.getDependency = () => new Promise(resolve => { finish = resolve; });
  const pending = stable.resolveFinal(pendingAsset); stable.cancel(); finish(x.material);
  await assert.rejects(pending, /cancelled/);
  assert.throws(() => stable.apply(), /cancelled/);
  await assert.rejects(stable.resolveFinal(x.asset(x.material)), /cancelled/);
  assert.equal(x.mesh.material.map, placeholder);
});

test('a preview from another source is rejected before material creation', async () => {
  const x = setup(); x.preview.parser.json.asset.extras.wgVertexPreviewSourceSha256 = 'b'.repeat(64);
  const material = x.mesh.material;
  await assert.rejects(makeStableVertexMaterials(x.renderer, x.preview, x.asset(x.material), x.mapping), /source mismatch/);
  assert.equal(x.mesh.material, material);
});

test('a late previous load cannot replace the newest textures', async () => {
  const x = setup(), stable = await makeStableVertexMaterials(x.renderer, x.preview, x.asset(x.material), x.mapping);
  let finish;
  const stale = x.asset(x.material); stale.parser.getDependency = () => new Promise(resolve => { finish = resolve; });
  const pending = stable.resolveFinal(stale);
  const newest = x.material.clone(); newest.map = new THREE.Texture(); newest.normalMap = new THREE.Texture();
  await stable.resolveFinal(x.asset(newest));
  finish(x.material);
  await assert.rejects(pending, /superseded/);
  stable.apply();
  assert.equal(x.mesh.material.map, newest.map);
});

test('a malformed later primitive leaves the whole scene unchanged', async () => {
  const x = setup(), firstMaterial = x.mesh.material, badGeometry = x.mesh.geometry.clone();
  badGeometry.deleteAttribute('color');
  const bad = new THREE.Mesh(badGeometry, new THREE.MeshStandardMaterial()); x.preview.scene.add(bad);
  x.preview.parser.associations.set(bad, { meshes: 1, primitives: 0 });
  x.mapping.primitives.push({ mesh: 1, primitive: 0, material: 0, colorAccessor: null });
  const badMaterial = bad.material;
  await assert.rejects(makeStableVertexMaterials(x.renderer, x.preview, x.asset(x.material), x.mapping), /Missing baked/);
  assert.equal(x.mesh.material, firstMaterial);
  assert.equal(x.mesh.geometry.getAttribute('wgOriginalColor'), undefined);
  assert.equal(bad.material, badMaterial);
});
