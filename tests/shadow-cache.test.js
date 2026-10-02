import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ShadowCache,shadowSnapshot} from '../src/rendering/shadow-cache.js';
import {createNativeShadowUniforms,installNativeShadow} from '../src/rendering/native-shadow.js';
import {createAssetShadow,installAssetShadows} from '../src/rendering/asset-shadows.js';

function fixture() {
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),light=new THREE.DirectionalLight();
  light.castShadow=true;light.position.set(5,10,5);scene.add(light,light.target);
  const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial(),4);
  mesh.castShadow=true;mesh.count=1;mesh.setMatrixAt(0,new THREE.Matrix4());scene.add(mesh);
  let draws=0;
  const renderer={shadowMap:{enabled:true,autoUpdate:true,needsUpdate:false,type:THREE.PCFSoftShadowMap,render(){if(!renderer.shadowMap.enabled||(!renderer.shadowMap.autoUpdate&&!renderer.shadowMap.needsUpdate))return;draws++;light.shadow.needsUpdate=false;renderer.shadowMap.needsUpdate=false;}},renderBufferDirect(){}};
  const uniforms=createNativeShadowUniforms(),release=installNativeShadow(renderer,light,uniforms);
  const draw=()=>{scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);renderer.shadowMap.render([light],scene,camera);};
  const close=()=>{release();light.shadow.map?.dispose();mesh.geometry.dispose();mesh.material.dispose();};
  return {scene,camera,light,mesh,renderer,uniforms,release,draw,close,get draws(){return draws;}};
}

test('static frames reuse both depth attachments while movement, explicit invalidation and target replacement redraw',()=>{
  const f=fixture();f.draw();f.draw();assert.equal(f.draws,1);assert.equal(f.release.cache.stats.hits,1);assert.equal(f.uniforms.uNativeShadowOn.value,1);
  f.mesh.position.x=2;f.draw();assert.equal(f.draws,2);f.draw();assert.equal(f.draws,2);
  f.light.shadow.needsUpdate=true;f.draw();assert.equal(f.draws,3);
  f.renderer.shadowMap.needsUpdate=true;f.draw();assert.equal(f.draws,4);
  f.light.shadow.map.dispose();f.light.shadow.map=null;f.draw();assert.equal(f.draws,5);
  f.renderer.shadowMap.enabled=false;f.draw();assert.equal(f.uniforms.uNativeShadowOn.value,0);
  f.renderer.shadowMap.enabled=true;f.draw();assert.equal(f.uniforms.uNativeShadowOn.value,1);assert.equal(f.draws,5);
  f.release.cache.enabled=false;f.draw();f.draw();assert.equal(f.draws,7);f.close();
});

test('unchanged instance uploads reuse shadows; active instance values, count and growth uniforms invalidate',()=>{
  const f=fixture(),growth=new THREE.InstancedBufferAttribute(new Float32Array(16),4);
  f.mesh.geometry.setAttribute('iGrowth',growth);
  let clock=0;const depth=new THREE.MeshDepthMaterial();depth.userData.nativeShadowInputs=()=>[clock];f.mesh.customDepthMaterial=depth;
  f.draw();f.mesh.instanceMatrix.needsUpdate=true;growth.needsUpdate=true;f.draw();assert.equal(f.draws,1);
  growth.array[8]=5;growth.needsUpdate=true;f.draw();assert.equal(f.draws,1,'inactive capacity is irrelevant');
  growth.array[0]=.4;growth.needsUpdate=true;f.draw();assert.equal(f.draws,2);
  clock=.1;f.draw();assert.equal(f.draws,3);f.mesh.count=2;f.draw();assert.equal(f.draws,4);
  f.mesh.instanceMatrix.array[12]=3;f.draw();assert.equal(f.draws,5);f.close();depth.dispose();
});

test('skin poses, morphs, cut holes, alpha textures, clipping and geometry replacement invalidate',()=>{
  const f=fixture(),bone=new THREE.Bone(),skin=new THREE.SkinnedMesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());
  skin.add(bone);skin.bind(new THREE.Skeleton([bone]));skin.castShadow=true;f.scene.add(skin);
  f.draw();f.draw();assert.equal(f.draws,1);bone.position.y=.2;f.draw();assert.equal(f.draws,2);
  skin.morphTargetInfluences=[0];f.draw();skin.morphTargetInfluences[0]=.5;f.draw();assert.equal(f.draws,4);
  const holes=[new THREE.Vector4()],depth=new THREE.MeshDepthMaterial();depth.userData.nativeShadowInputs=()=>holes;f.mesh.customDepthMaterial=depth;f.draw();holes[0].w=.2;f.draw();assert.equal(f.draws,6);
  const texture=new THREE.Texture();f.mesh.material.alphaMap=texture;f.draw();texture.needsUpdate=true;f.draw();assert.equal(f.draws,8);
  f.mesh.material.clipShadows=true;f.mesh.material.clippingPlanes=[new THREE.Plane(new THREE.Vector3(1,0,0),1)];f.draw();f.mesh.material.clippingPlanes[0].constant=2;f.draw();assert.equal(f.draws,10);
  skin.geometry.attributes.position.needsUpdate=true;f.draw();assert.equal(f.draws,11);
  f.camera.layers.enable(2);f.draw();assert.equal(f.draws,12);
  f.mesh.visible=false;f.draw();assert.equal(f.draws,13);f.close();skin.geometry.dispose();skin.material.dispose();depth.dispose();texture.dispose();
});

test('unknown callbacks and custom depth shaders never reuse; failed draws never commit a snapshot',()=>{
  const f=fixture();f.mesh.onBeforeShadow=()=>{};f.draw();f.draw();assert.equal(f.draws,2);assert.equal(f.release.cache.stats.untracked,2);
  f.mesh.userData.nativeShadowCallback=f.mesh.onBeforeShadow;f.draw();f.draw();assert.equal(f.draws,3);
  const depth=new THREE.ShaderMaterial();f.mesh.customDepthMaterial=depth;f.draw();f.draw();assert.equal(f.draws,5);
  depth.userData.nativeShadowInputs=()=>[new Map()];f.draw();f.draw();assert.equal(f.draws,7);
  f.close();depth.dispose();
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),light=new THREE.DirectionalLight();light.castShadow=true;
  let fail=true,calls=0;const renderer={shadowMap:{enabled:true,autoUpdate:true,render(){calls++;if(fail)throw Error('failed');}},renderBufferDirect(){}};
  const release=installNativeShadow(renderer,light,createNativeShadowUniforms());
  assert.throws(()=>renderer.shadowMap.render([light],scene,camera),/failed/);assert.equal(release.cache.snapshot,null);
  fail=false;renderer.shadowMap.render([light],scene,camera);renderer.shadowMap.render([light],scene,camera);assert.equal(calls,2);release();light.shadow.map.dispose();
});

test('temporary asset proxies participate before cache comparison and wrappers release in reverse order',()=>{
  const f=fixture(),group=new THREE.Group(),color=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial(),2);
  color.count=1;const proxy=createAssetShadow([{geometry:color.geometry,material:color.material}],2,0);proxy.count=1;proxy.setMatrixAt(0,new THREE.Matrix4());
  group.userData.lodBatches=[{meshes:[color],shadow:proxy}];f.scene.add(group);
  const releaseAsset=installAssetShadows(f.renderer,()=>new Map([[1,group]]));
  f.draw();f.draw();assert.equal(f.draws,1);assert.equal(proxy.parent,null);group.position.x=4;f.draw();assert.equal(f.draws,2);
  proxy.instanceMatrix.array[12]=2;f.draw();assert.equal(f.draws,3);proxy.count=0;f.draw();assert.equal(f.draws,4);
  releaseAsset();f.close();proxy.dispose();color.dispose();color.geometry.dispose();color.material.dispose();
});

test('context loss/restoration invalidates cached textures and disposal removes listeners',()=>{
  const f=fixture();f.release();const listeners=new Map();f.renderer.domElement={addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type)};
  const release=installNativeShadow(f.renderer,f.light,createNativeShadowUniforms());f.draw();f.draw();assert.equal(f.draws,1);
  listeners.get('webglcontextlost')();f.draw();assert.equal(f.draws,2);listeners.get('webglcontextrestored')();f.draw();assert.equal(f.draws,3);
  release();release();assert.equal(listeners.size,0);f.close();
});

test('instanced interleaved geometry compares its active prefix, including divisor and count',()=>{
  const f=fixture(),mesh=new THREE.Mesh(new THREE.InstancedBufferGeometry(),new THREE.MeshBasicMaterial());
  const buffer=new THREE.InstancedInterleavedBuffer(new Float32Array(16),4,2);mesh.geometry.setAttribute('driver',new THREE.InterleavedBufferAttribute(buffer,2,1));mesh.geometry.instanceCount=2;mesh.castShadow=true;f.scene.add(mesh);
  f.draw();buffer.needsUpdate=true;f.draw();assert.equal(f.draws,1);buffer.array[5]=1;f.draw();assert.equal(f.draws,1);
  buffer.array[1]=2;f.draw();assert.equal(f.draws,2);mesh.geometry.instanceCount=3;f.draw();assert.equal(f.draws,3);
  f.close();mesh.geometry.dispose();mesh.material.dispose();
});
