import test from 'node:test';
import assert from 'node:assert/strict';
import { Scene, PerspectiveCamera, Mesh, PlaneGeometry } from 'three';
import { MeshBasicNodeMaterial, WebGPURenderer } from 'three/webgpu';
import { createWebGpuNativeSky } from '../src/rendering/webgpu-native-sky.js';
import { createWebGpuBlessingVfx } from '../src/rendering/webgpu-blessing-vfx.js';

function renderer() {
 const result = new WebGPURenderer({ canvas: { width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;} } });
 result.hasFeature = () => true;
 return result;
}
function build(renderer, mesh, scene) {
 const builder = renderer.backend.createNodeBuilder(mesh, renderer);
 builder.scene = scene; builder.camera = new PerspectiveCamera(); builder.build();
 return builder;
}
test('sky WGSL reads the live camera basis and projection without CPU camera sampling', async () => {
 const scene = new Scene(), sky = createWebGpuNativeSky({ scene,
  fetchImpl: async url => url.includes('skies.json') ? { ok:true,json:async()=>({panoramas:[{url:'day'},{url:'night'}]}) } : { ok:true,arrayBuffer:async()=>new ArrayBuffer(1) },
  prepare: async () => ({image:{width:1,height:1,pixels:new Uint8Array([1,2,3,128])}}),
 });
 const geometry = new PlaneGeometry(2,2), material = new MeshBasicNodeMaterial();
 try {
  assert.equal(await sky.ready, true);
  sky.update({ isPerspectiveCamera:true, updateMatrixWorld(){throw Error('CPU camera sampling');} }, {elapsed:0});
  material.fragmentNode = scene.backgroundNode;
  const builder = build(renderer(),new Mesh(geometry,material),scene);
  assert.match(builder.fragmentShader,/cameraWorldMatrix/);
  assert.match(builder.fragmentShader,/cameraProjectionMatrixInverse/);
 } finally { sky.dispose(); geometry.dispose(); material.dispose(); }
});
test('blessing billboard WGSL reads the live camera basis without a CPU prepare dependency', () => {
 const scene = new Scene(), effect = createWebGpuBlessingVfx({scene,state:{elapsed:0,plants:[],structures:[],events:[]},residency:{get:()=>null}});
 try {
  effect.prepare({updateWorldMatrix(){throw Error('CPU camera sampling');}});
  const mesh = scene.children.find(item=>item.isMesh);
  const builder = build(renderer(),mesh,scene);
  assert.match(builder.vertexShader,/cameraWorldMatrix/);
 } finally { effect.dispose(); }
});
