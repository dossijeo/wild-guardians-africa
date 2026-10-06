import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createAssetLod,updateAssetLods} from '../src/rendering/asset-lod.js';
import {NativeAssetGroups,nativeChunkBounds} from '../src/rendering/asset-groups.js';
import {installAssetShadows} from '../src/rendering/asset-shadows.js';

const lab=readFileSync('references/extracted/Bioma_Lab_V4_0_Materiales_Luz_Optimizado/script-8.js','utf8');
const cull=Function('return ({'+lab.slice(lab.indexOf(' cull(vp,origin){'),lab.indexOf(' pause(){this.clearHorizon();')).trim()+'});')();
function fixture(){
 const scene=new THREE.Scene(),groups=new NativeAssetGroups(scene),chunks=new Map(),camera=new THREE.PerspectiveCamera(60,1,.1,500);
 camera.position.set(0,10,25);camera.lookAt(0,5,0);camera.updateMatrixWorld(true);
 const material=new THREE.MeshStandardMaterial(),levels=[8,4,1].map(n=>{const geometry=new THREE.BoxGeometry(4,10,4,n,n,n);geometry.translate(0,5,0);geometry.computeBoundingBox();return new THREE.Mesh(geometry,material);});
 for(const [key,x,z] of [['front',0,0],['other',8,0],['behind',0,150]]){
  const group=new THREE.Group(),instances=[0,2,4].map((i)=>({id:key+i,x:x+i,y:0,z,sx:1,sy:1,sz:1,yaw:.4}));
  createAssetLod(group,levels,instances,{group:0,role:'prop'},0);chunks.set(key,group);scene.add(group);
 }
 updateAssetLods(chunks,camera,'media');return {scene,groups,chunks,camera,levels};
}

test('full native chunk boxes match the original plane culling and remain independent of reduced render geometry',()=>{
 const {chunks,camera}=fixture();
 const vp=new THREE.Matrix4();for(const eye of [[0,10,25],[80,20,0],[-80,5,0],[0,150,0]]){
  camera.position.fromArray(eye);camera.lookAt(0,5,0);camera.updateMatrixWorld(true);vp.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
  cull.chunks=new Map([...chunks].map(([k,g])=>{const b=nativeChunkBounds(g);return [k,{aabb:{min:b.min.toArray(),max:b.max.toArray()}}];}));cull.cull(vp.elements,[0,0]);
  const frustum=new THREE.Frustum().setFromProjectionMatrix(vp);for(const [key,g] of chunks)assert.equal(frustum.intersectsBox(nativeChunkBounds(g)),cull.chunks.get(key).visible);
 }
 const group=chunks.get('front'),bounds=nativeChunkBounds(group).clone();for(const m of group.userData.lodBatches[0].meshes)m.count=0;assert.deepEqual(nativeChunkBounds(group),bounds);
});

test('global groups retain native matrices and per-instance coverage, cull main chunks but keep shadow populations',()=>{
 const {scene,groups,chunks,camera,levels}=fixture();
 const first=chunks.get('front').userData.lodBatches[0];first.meshes[0].geometry.attributes.nativeVisibility.array.set([0,.4,1]);first.meshes[0].geometry.attributes.nativeVisibility.needsUpdate=true;
 const stats=groups.update(chunks,camera);assert.equal(stats.visibleChunks,2);assert.equal(stats.colorGroups,1);assert.equal(stats.shadowGroups,1);assert.equal(stats.rawColorSlices,2);
 const color=groups.colors.get('0:0').mesh,shadow=groups.shadows.get('0').mesh;
 assert.equal(color.instanceMatrix.usage,THREE.DynamicDrawUsage);assert.equal(shadow.instanceMatrix.usage,THREE.DynamicDrawUsage);
 assert.equal(color.count,6);assert.equal(shadow.count,9);assert.equal(shadow.geometry,levels[2].geometry);assert.deepEqual(Array.from(color.geometry.attributes.nativeVisibility.array.slice(0,6)),[0,Math.fround(.4),1,1,1,1]);
 assert.equal(color.geometry.attributes.position.array,levels[0].geometry.attributes.position.array);assert.notEqual(color.geometry.attributes.position,levels[0].geometry.attributes.position);
 assert.deepEqual(Array.from(color.instanceMatrix.array.slice(0,48)),Array.from(first.meshes[0].instanceMatrix.array));
 assert.ok([...chunks.values()].every(g=>g.userData.lodBatches.every(b=>b.meshes.every(m=>m.layers.mask===((1<<31)>>>0)))));
 const versions=[color.instanceMatrix.version,color.geometry.attributes.nativeVisibility.version,shadow.instanceMatrix.version];assert.equal(groups.update(chunks,camera).uploads,0);assert.deepEqual([color.instanceMatrix.version,color.geometry.attributes.nativeVisibility.version,shadow.instanceMatrix.version],versions);
 first.meshes[0].geometry.attributes.nativeVisibility.array[0]=.5;first.meshes[0].geometry.attributes.nativeVisibility.needsUpdate=true;assert.equal(groups.update(chunks,camera).uploads,1);assert.equal(shadow.instanceMatrix.version,versions[2]);
 let draws=0;const renderer={shadowMap:{enabled:true,autoUpdate:true,render(lights,world){const pass=world.getObjectByName('native_asset_shadow_pass');assert.deepEqual(pass.children,[shadow]);draws++;}}};
 const release=installAssetShadows(renderer,()=>groups.shadowChunks);renderer.shadowMap.render([{}],scene,camera);assert.equal(draws,1);assert.equal(shadow.parent,null);release();groups.dispose();
});

test('clip exceptions, hidden chunks and vegetation retain the original pass eligibility',()=>{
 const {groups,chunks,camera}=fixture(),front=chunks.get('front'),batch=front.userData.lodBatches[0];batch.clip=true;
 const g=chunks.get('other'),b=g.userData.lodBatches[0];b.group=2;
 chunks.get('behind').visible=false;groups.update(chunks,camera);
 assert.equal(batch.meshes[0].layers.mask,1);assert.equal(groups.colors.size,1);assert.equal(groups.shadows.size,0);assert.deepEqual(groups.shadowChunks.get('front').userData.lodBatches,[batch]);
 for(const m of b.meshes)m.visible=false;groups.update(chunks,camera);assert.equal(groups.colors.size,0);assert.equal(groups.shadows.size,0);groups.dispose();
});

test('retired groups release their own buffers once, preserve borrowed arrays and switch back to individual drawing',()=>{
 const {scene,groups,chunks,camera,levels}=fixture();groups.update(chunks,camera);const color=groups.colors.get('0:0').mesh,shadow=groups.shadows.get('0').mesh;
 let colors=0,shadowMatrices=0,source=0;color.geometry.addEventListener('dispose',()=>colors++);shadow.addEventListener('dispose',()=>shadowMatrices++);levels[0].geometry.addEventListener('dispose',()=>source++);
 chunks.delete('other');groups.update(chunks,camera);assert.equal(groups.colors.get('0:0').mesh,color);assert.equal(color.count,3);
 groups.enabled=false;groups.update(chunks,camera);assert.equal(colors,1);assert.equal(shadowMatrices,1);assert.equal(source,0);assert.equal(groups.root.children.length,0);assert.ok([...chunks.values()].every(g=>g.userData.lodBatches.every(b=>b.meshes.every(m=>m.layers.mask===1))));
 groups.enabled=true;groups.update(chunks,camera);assert.ok(groups.colors.size>0);groups.dispose();groups.dispose();assert.equal(colors,1);assert.equal(source,0);assert.equal(groups.root.parent,null);assert.ok(!scene.children.includes(groups.root));
});

test('light volume retains offscreen casters, excludes remote/clip chunks and follows focus independently of color',()=>{
 const {scene,groups,chunks,camera,levels}=fixture(),light=new THREE.DirectionalLight();light.castShadow=true;scene.add(light,light.target);
 Object.assign(light.shadow.camera,{left:-20,right:20,top:60,bottom:-60,near:.1,far:200});light.shadow.camera.updateProjectionMatrix();light.position.set(0,100,0);
 const offscreen=new THREE.Group();createAssetLod(offscreen,levels,[0,2,4].map(i=>({x:i,y:0,z:40,sx:1,sy:1,sz:1,yaw:0})),{group:0,role:'prop'},0);chunks.set('offscreen',offscreen);scene.add(offscreen);updateAssetLods(chunks,camera,'media');
 let stats=groups.update(chunks,camera,{x:0,z:0},light);
 assert.equal(stats.visibleChunks,2);assert.equal(stats.shadowChunks,3);assert.equal(stats.culledShadowChunks,1);assert.equal(groups.shadows.get('0').mesh.count,9);assert.equal(groups.colors.get('0:0').mesh.count,6);
 const remote=chunks.get('behind').userData.lodBatches[0];remote.clip=true;groups.update(chunks,camera,{x:0,z:0},light);assert.equal(groups.shadowChunks.has('behind'),false);
 light.position.z=light.target.position.z=150;stats=groups.update(chunks,camera,{x:0,z:0},light);
 assert.equal(stats.visibleChunks,2);assert.equal(stats.shadowChunks,1);assert.equal(groups.shadows.size,0);assert.deepEqual(groups.shadowChunks.get('behind').userData.lodBatches,[remote]);
 groups.shadowCulling=false;groups.update(chunks,camera,{x:0,z:0},light);assert.equal(groups.shadows.get('0').mesh.count,9);assert.ok(groups.shadowChunks.has('behind'));
 // Selection stays in global double precision while submitted matrices rebase.
 groups.shadowCulling=true;const shift=new THREE.Vector3(48_000_000,0,-48_000_000);
 for(const chunk of chunks.values()){chunk.position.add(shift);delete chunk.userData.nativeAssetBounds;}
 camera.position.add(shift);camera.lookAt(shift.x,5,shift.z);light.position.add(shift);light.target.position.add(shift);
 stats=groups.update(chunks,camera,{x:shift.x,z:shift.z},light);assert.equal(stats.shadowChunks,1);assert.equal(stats.visibleChunks,2);assert.ok(groups.shadowChunks.has('behind'));
 groups.dispose();
});

test('shadow selection includes bounds of the final native variant even if they exceed LOD0',()=>{
 const {scene,groups,chunks,camera,levels}=fixture(),light=new THREE.DirectionalLight();light.castShadow=true;scene.add(light,light.target);
 levels[2].geometry.translate(0,0,180);levels[2].geometry.computeBoundingBox();light.position.set(0,100,180);light.target.position.z=180;
 Object.assign(light.shadow.camera,{left:-20,right:20,top:20,bottom:-20,near:.1,far:200});light.shadow.camera.updateProjectionMatrix();
 assert.ok(nativeChunkBounds(chunks.get('front')).max.z>160);
 groups.update(chunks,camera,{x:0,z:0},light);assert.ok(groups.shadows.get('0').mesh.count>=3);groups.dispose();
});

test('optional far color compaction removes only fully hidden instances and preserves native shadows',()=>{
 const {groups,chunks,camera}=fixture(),batch=chunks.get('front').userData.lodBatches[0],attribute=batch.meshes[0].geometry.attributes.nativeVisibility;
 attribute.array.set([0,.001,1]);attribute.needsUpdate=true;groups.omitZeroColor=true;
 groups.update(chunks,camera);const color=groups.colors.get('0:0').mesh,shadow=groups.shadows.get('0').mesh;
 assert.equal(color.count,5);assert.equal(shadow.count,9);assert.ok(Math.abs(color.geometry.attributes.nativeVisibility.getX(0)-.001)<1e-8);
 const version=color.instanceMatrix.version;groups.update(chunks,camera);assert.equal(color.count,5);assert.equal(color.instanceMatrix.version,version);
 attribute.setX(0,.25);attribute.needsUpdate=true;groups.update(chunks,camera);assert.equal(color.count,6);assert.equal(shadow.count,9);
 attribute.setX(0,0);attribute.needsUpdate=true;groups.update(chunks,camera);assert.equal(color.count,5);
 groups.omitZeroColor=false;groups.update(chunks,camera);assert.equal(color.count,6);assert.equal(color.geometry.attributes.nativeVisibility.getX(0),0);groups.dispose();
});

test('shortened prop residency preserves logical instances and terrain group visibility in merged and fallback paths',()=>{
 const {groups,chunks,camera}=fixture(),front=chunks.get('front'),batch=front.userData.lodBatches[0],ids=batch.instances.map(p=>p.id),matrices=batch.meshes[0].instanceMatrix.array.slice();
 front.userData.farPropsVisible=false;groups.update(chunks,camera);assert.equal(front.visible,true);assert.equal(groups.colors.get('0:0').mesh.count,3);assert.equal(groups.shadows.get('0').mesh.count,6);assert.deepEqual(batch.instances.map(p=>p.id),ids);assert.deepEqual(batch.meshes[0].instanceMatrix.array,matrices);
 groups.enabled=false;groups.update(chunks,camera);assert.equal(batch.meshes[0].layers.mask,((1<<31)>>>0));assert.equal(chunks.get('other').userData.lodBatches[0].meshes[0].layers.mask,1);
 front.userData.farPropsVisible=true;groups.update(chunks,camera);assert.equal(batch.meshes[0].layers.mask,1);groups.dispose();
});
