import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {AfricanToon,paintedWaterMaterial} from '../src/rendering/african-toon.js';
import {SceneMaterialRegistry} from '../src/rendering/material-registry.js';
import {nativeGroundMaterial,updateGroundQuality} from '../src/rendering/render-quality.js';
import {NativeHorizon,nativeNearRegion} from '../src/rendering/horizon.js';

test('paused frames do not traverse the graph or rewrite water clocks; late shared water is synchronized',()=>{
 const scene=new THREE.Scene(),toon=new AfricanToon(),registry=new SceneMaterialRegistry(scene,toon),material=paintedWaterMaterial('#5599cc'),geometry=new THREE.PlaneGeometry();
 const a=new THREE.Mesh(geometry,material),b=new THREE.Mesh(geometry,material);scene.add(a,b);
 let writes=0,value=material.userData.paintUniforms.uTime.value;
 Object.defineProperty(material.userData.paintUniforms.uTime,'value',{get:()=>value,set:v=>{writes++;value=v;}});
 const traverse=scene.traverse;scene.traverse=()=>{throw new Error('Unexpected complete scene scan');};
 registry.update(12);registry.update(12);registry.update(12);
 assert.equal(writes,1);assert.equal(registry.materials.get(material),2);assert.equal(registry.waters.size,1);
 scene.remove(a);registry.update(14);assert.equal(value,14);assert.equal(writes,2);
 scene.remove(b);registry.update(16);assert.equal(value,14);assert.equal(registry.waters.size,0);assert.equal(registry.materials.size,0);
 const late=paintedWaterMaterial('#5599cc'),mesh=new THREE.Mesh(geometry,late);scene.add(mesh);registry.update(16);
 assert.equal(late.userData.paintUniforms.uTime.value,16);
 scene.traverse=traverse;registry.dispose();assert.equal(registry.nodes.size,0);assert.equal(registry.waters.size,0);
});

test('entering nested actors, instanced meshes and reparenting retain single shader composition and borrowed ownership',async()=>{
 const scene=new THREE.Scene(),registry=new SceneMaterialRegistry(scene,new AfricanToon()),parent=new THREE.Group(),other=new THREE.Group();scene.add(parent,other);
 const material=new THREE.MeshStandardMaterial(),geometry=new THREE.BoxGeometry();let disposed=0;material.addEventListener('dispose',()=>disposed++);
 const nested=new THREE.Group();nested.add(new THREE.SkinnedMesh(geometry,material),new THREE.InstancedMesh(geometry,material,3));
 await Promise.resolve();parent.add(nested);
 const compile=material.onBeforeCompile,version=material.version;
 assert.match(material.customProgramCacheKey(),/african-toon/);assert.equal(registry.materials.get(material),2);
 other.add(nested);assert.equal(registry.materials.get(material),2);assert.equal(material.onBeforeCompile,compile);assert.equal(material.version,version);
 nested.clear();assert.equal(registry.materials.has(material),false);
 nested.add(new THREE.Mesh(geometry,material));assert.equal(material.onBeforeCompile,compile);
 registry.dispose();registry.dispose();assert.equal(disposed,0);assert.equal(registry.meshes.size,0);
 scene.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial()));assert.equal(registry.nodes.size,0);
 material.dispose();assert.equal(disposed,1);
});

test('explicit refresh handles material arrays, replacement and late metadata without stale references',()=>{
 const scene=new THREE.Scene(),registry=new SceneMaterialRegistry(scene,new AfricanToon()),geometry=new THREE.BoxGeometry(),plain=new THREE.MeshStandardMaterial({transparent:true}),water=paintedWaterMaterial('#5599cc');
 const mesh=new THREE.Mesh(geometry,[plain,water,water]);scene.add(mesh);registry.update(9);
 assert.equal(registry.materials.get(water),1);assert.doesNotMatch(plain.customProgramCacheKey(),/african-toon/);
 plain.transparent=false;registry.refresh(mesh);assert.match(plain.customProgramCacheKey(),/african-toon/);
 const replacement=paintedWaterMaterial('#aa6633',true);mesh.material=[plain,replacement];registry.refresh(mesh);registry.update(9);
 assert.equal(registry.materials.has(water),false);assert.equal(registry.waters.has(water),false);assert.equal(replacement.userData.paintUniforms.uTime.value,9);
 replacement.userData.paintUniforms={uTime:{value:0}};registry.refresh(mesh);registry.update(9);assert.equal(replacement.userData.paintUniforms.uTime.value,9);
 delete replacement.userData.paintUniforms;registry.refresh(mesh);assert.equal(registry.waters.size,0);
 registry.dispose();
});

test('resident and unchanged-region horizon quality replacements are registered immediately',()=>{
 const scene=new THREE.Scene(),registry=new SceneMaterialRegistry(scene,new AfricanToon()),ground=new THREE.Mesh(new THREE.PlaneGeometry(),nativeGroundMaterial('media'));scene.add(ground);
 const pack=JSON.parse(readFileSync('public/content/biome-canyons.json','utf8')),horizon=new NativeHorizon(scene,()=>paintedWaterMaterial('#5599cc'),mesh=>registry.refresh(mesh)),config={seed:'712',biome:'canyons',relief:1,river:true},region=nativeNearRegion({x:0,z:0},'media');
 horizon.update(config,pack.profile,region,'media');const group=horizon.group;
 for(const quality of ['muy_baja','media']){
  const old=ground.material,horizonOld=group.children[0].material;
  updateGroundQuality([ground],quality,mesh=>registry.refresh(mesh));horizon.update(config,pack.profile,region,quality);
  assert.equal(horizon.group,group);assert.equal(registry.materials.has(old),false);assert.equal(registry.materials.has(horizonOld),false);
  for(const mesh of [ground,group.children[0]]){assert.equal(registry.materials.has(mesh.material),true);assert.match(mesh.material.customProgramCacheKey(),/african-toon/);assert.equal(!!mesh.material.isMeshBasicMaterial,quality==='muy_baja');}
 }
 horizon.dispose();assert.equal(registry.nodes.has(group),false);registry.dispose();
});

test('QA fallback preserves old traversal semantics and returning to the registry resynchronizes time',()=>{
 const scene=new THREE.Scene(),registry=new SceneMaterialRegistry(scene,new AfricanToon()),water=paintedWaterMaterial('#5599cc');scene.add(new THREE.Mesh(new THREE.PlaneGeometry(),water));
 registry.update(2);registry.enabled=false;registry.update(3);assert.equal(water.userData.paintUniforms.uTime.value,3);assert.equal(registry.stats.legacyScans,2);
 registry.enabled=true;registry.update(2);assert.equal(water.userData.paintUniforms.uTime.value,2);registry.dispose();
});

test('temporary excluded pass roots never register nested materials or leave event listeners',()=>{
 const scene=new THREE.Scene(),pass=new THREE.Group();pass.userData.materialRegistryExcluded=true;
 const nested=new THREE.Group(),material=new THREE.MeshStandardMaterial();nested.add(new THREE.Mesh(new THREE.BoxGeometry(),material));pass.add(nested);scene.add(pass);
 const registry=new SceneMaterialRegistry(scene,new AfricanToon()),before=registry.stats.discoveredNodes;
 for(let i=0;i<4;i++){scene.remove(pass);scene.add(pass);}
 nested.add(new THREE.Mesh(new THREE.BoxGeometry(),material));
 assert.equal(registry.stats.discoveredNodes,before);assert.equal(registry.nodes.has(pass),false);assert.equal(registry.nodes.has(nested),false);assert.equal(registry.materials.size,0);assert.doesNotMatch(material.customProgramCacheKey(),/african-toon/);
 registry.dispose();assert.equal(pass.hasEventListener('childadded',registry.added),false);
});
