import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {createAssetLod,updateAssetLods} from '../src/rendering/asset-lod.js';
import {installAssetShadows,disposeAssetShadows} from '../src/rendering/asset-shadows.js';

const lab=readFileSync('references/extracted/Bioma_Lab_V4_0_Materiales_Luz_Optimizado/script-8.js','utf8');
function fixture(groupId=0){
 const group=new THREE.Group(),material=new THREE.MeshStandardMaterial({alphaTest:.35,map:new THREE.Texture()});
 const levels=[8,4,1].map(n=>{const g=new THREE.BoxGeometry(4,10,4,n,n,n);g.translate(0,5,0);g.computeBoundingBox();return new THREE.Mesh(g,material);});
 const instances=[0,45,100,200].map(x=>({id:'p'+x,x,y:0,z:0,sx:1,sy:1,sz:1,yaw:.4}));
 const batch=createAssetLod(group,levels,instances,{group:groupId,role:'prop'},0),chunks=new Map([['0,0',group]]),camera=new THREE.PerspectiveCamera(60,1,.1,500);camera.position.set(0,8,0);
 updateAssetLods(chunks,camera,'media');return {group,material,levels,instances,batch,chunks,camera};
}

test('native shadow population combines color bins once using the final original variant and stable GPU matrices',()=>{
 assert.ok(lab.includes("shadow&&b.variants.length>1?[{level:b.variants.length-1,start:0,count:b.activeCount}]"));
 assert.ok(lab.includes('if(b.material&&b.group===2)b.shadow=false;'));
 const {batch,chunks,camera,levels}=fixture(),proxy=batch.shadow;
 assert.equal(proxy.geometry,levels[2].geometry);assert.equal(proxy.count,4);assert.ok(batch.meshes.every(m=>!m.castShadow));assert.equal(proxy.parent,null);
 let cursor=0;for(const mesh of batch.meshes)for(let i=0;i<mesh.count;i++)assert.deepEqual(Array.from(proxy.instanceMatrix.array.slice(cursor++*16,cursor*16)),Array.from(mesh.instanceMatrix.array.slice(i*16,(i+1)*16)));
 const before=proxy.instanceMatrix.version;updateAssetLods(chunks,camera,'media');assert.equal(proxy.instanceMatrix.version,before);
 camera.position.set(50,8,0);updateAssetLods(chunks,camera,'alta');assert.ok(proxy.instanceMatrix.version>before);
 const grass=fixture(2);assert.equal(grass.batch.shadow.castShadow,false);
});

test('shadow proxies enter only the shadow traversal and restore borrowed resources even on an exception',()=>{
 const {group,batch,chunks,camera,material}=fixture(),scene=new THREE.Scene();scene.add(group);scene.updateMatrixWorld(true);
 let calls=0,solid;
 const original=function(lights,world,view){if(!this.enabled){assert.equal(world.getObjectByName('native_asset_shadow_pass'),undefined);return 43;}calls++;assert.equal(this,renderer.shadowMap);assert.equal(view,camera);const pass=world.getObjectByName('native_asset_shadow_pass');assert.ok(pass);assert.deepEqual(pass.children,[batch.shadow]);solid=batch.shadow.material;assert.equal(solid.map,null);assert.equal(solid.alphaTest,0);assert.equal(solid.side,THREE.FrontSide);assert.equal(solid.shadowSide,THREE.FrontSide);assert.equal(batch.shadow.count,4);assert.ok(batch.meshes.every(m=>m.material===material));batch.shadow.onBeforeShadow(renderer,batch.shadow,view,view,batch.shadow.geometry);if(calls===2)throw new Error('GPU failure fixture');return 42;};
 const renderer={shadowMap:{enabled:true,autoUpdate:true,render:original}},release=installAssetShadows(renderer,()=>chunks);
 assert.equal(renderer.shadowMap.render([{}],scene,camera),42);assert.equal(batch.shadow.parent,null);assert.equal(batch.shadow.material,material);assert.deepEqual(scene.children,[group]);
 assert.deepEqual(release.stats,{draws:1,triangles:48});assert.equal(batch.shadow.userData.nativeShadowStats,undefined);
 renderer.shadowMap.enabled=false;assert.equal(renderer.shadowMap.render([{}],scene,camera),43);assert.deepEqual(release.stats,{draws:1,triangles:48});renderer.shadowMap.enabled=true;
 assert.throws(()=>renderer.shadowMap.render([{}],scene,camera),/GPU failure/);assert.equal(batch.shadow.parent,null);assert.equal(batch.shadow.material,material);assert.deepEqual(scene.children,[group]);
 let disposed=0;solid.addEventListener('dispose',()=>disposed++);release();release();assert.equal(disposed,1);assert.equal(renderer.shadowMap.render,original);
 let meshDisposals=0,geometryDisposals=0;batch.shadow.addEventListener('dispose',()=>meshDisposals++);batch.shadow.geometry.addEventListener('dispose',()=>geometryDisposals++);disposeAssetShadows(group);assert.equal(meshDisposals,1);assert.equal(geometryDisposals,0);
});

test('disabled, cached and empty-light passes do not add proxies; hidden color batches and grass never cast',()=>{
 const f=fixture(),grass=fixture(2),scene=new THREE.Scene();scene.add(f.group,grass.group);const chunks=new Map([['0',f.group],['1',grass.group]]);
 const renderer={shadowMap:{enabled:false,autoUpdate:true,render(lights,world){assert.equal(world.getObjectByName('native_asset_shadow_pass'),undefined);}}};
 const release=installAssetShadows(renderer,()=>chunks);renderer.shadowMap.render([{}],scene,f.camera);
 renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;renderer.shadowMap.render([{}],scene,f.camera);renderer.shadowMap.render([],scene,f.camera);release();
 f.batch.meshes.forEach(m=>m.visible=false);
 let visited=0;renderer.shadowMap.autoUpdate=true;renderer.shadowMap.render=(lights,world)=>{visited++;assert.equal(world.getObjectByName('native_asset_shadow_pass').children.length,0);};
 const release2=installAssetShadows(renderer,()=>chunks);renderer.shadowMap.render([{}],scene,f.camera);assert.equal(visited,1);release2();
});
