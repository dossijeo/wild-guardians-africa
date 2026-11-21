import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {installGroundDepthProxy} from '../tools/experiments/ground-depth-proxy.js';
import {BuildingDestructionPass} from '../src/rendering/buildings.js';

test('ground proxy follows streamed meshes, ancestor transforms and visibility without reparenting',()=>{
 const root=new THREE.Scene(),group=new THREE.Group(),ground=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()),far=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());
 group.position.set(10,2,3);ground.position.set(4,0,5);far.userData.nativeHorizon='terrain';root.add(group,far);group.add(ground);
 const calls=[],pass={captureDepth(camera,scene){scene.updateMatrixWorld(true);calls.push(scene.children.map(o=>({geometry:o.geometry,matrix:o.matrixWorld.clone()})));}},original=pass.captureDepth;
 const world={destructionPass:pass,terrainMeshes:[ground],horizon:{group:root}},review=installGroundDepthProxy(world);
 pass.captureDepth({},root);assert.equal(review.meshes,2);assert.equal(calls[0][0].geometry,ground.geometry);assert.deepEqual(new THREE.Vector3().setFromMatrixPosition(calls[0][0].matrix).toArray(),[14,2,8]);assert.equal(ground.parent,group);
 group.visible=false;root.remove(far);pass.captureDepth({},root);assert.equal(review.meshes,0);assert.deepEqual(calls[1],[]);
 group.visible=true;ground.onBeforeRender=()=>{};pass.captureDepth({},root);assert.equal(review.fallbacks,1);assert.equal(calls[2][0].geometry,undefined);
 review.enabled=false;pass.captureDepth({},root);assert.equal(calls[3].length,1);review.dispose();assert.equal(pass.captureDepth,original);
 ground.geometry.dispose();ground.material.dispose();far.geometry.dispose();far.material.dispose();
});

test('depth preparation submits the same mirrored terrain used by the next capture',async()=>{
 const root=new THREE.Scene(),ground=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());root.add(ground);ground.position.x=6;
 let prepared,drawn;const pass={async prepareDepth(camera,scene){prepared=scene;assert.equal(scene.children[0].geometry,ground.geometry);},captureDepth(camera,scene){drawn=scene;}};
 const review=installGroundDepthProxy({destructionPass:pass,terrainMeshes:[ground]});
 await review.prepare({},root);pass.captureDepth({},root);assert.equal(prepared,drawn);assert.equal(drawn.children[0].matrixWorld.elements[12],6);assert.equal(ground.parent,root);
 review.dispose();ground.geometry.dispose();ground.material.dispose();
});

test('audited scene hooks run against the original root; unknown hooks fall back',()=>{
 const root=new THREE.Scene(),ground=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()),calls=[];root.add(ground);
 const callback=function(renderer,scene){calls.push({self:this,scene});};root.onBeforeRender=callback;
 let submitted;const pass={captureDepth(camera,scene){submitted=scene;scene.onBeforeRender({},scene,camera,null);}},review=installGroundDepthProxy({destructionPass:pass,terrainMeshes:[ground]});
 pass.captureDepth({},root);assert.equal(submitted,root);assert.equal(review.reason,'scene-callback');
 callback.groundDepthSafe=true;pass.captureDepth({},root);assert.notEqual(submitted,root);assert.equal(review.reason,null);assert.equal(calls.length,2);assert.ok(calls.every(c=>c.self===root&&c.scene===root));
 review.dispose();ground.geometry.dispose();ground.material.dispose();
});

test('loading preparation uses the ground scene, preserves batch views and can be reversed',async()=>{
 const root=new THREE.Scene(),ground=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());root.add(ground);const seen=[];
 const pass={captureDepth(){},async prepareDepth(camera,scene){seen.push(scene);}},original=pass.prepareDepth,world={scene:root,destructionPass:pass,terrainMeshes:[ground]},review=installGroundDepthProxy(world,{prepareWorldDepth:true});
 await pass.prepareDepth({},root);assert.notEqual(seen[0],root);assert.equal(seen[0].children[0].geometry,ground.geometry);
 const batch={};await pass.prepareDepth({},batch);assert.equal(seen[1],batch);
 review.enabled=false;await pass.prepareDepth({},root);assert.equal(seen[2],root);
 review.dispose();assert.equal(pass.prepareDepth,original);ground.geometry.dispose();ground.material.dispose();
});

test('real batched depth preload compiles terrain mirrors and restores borrowed materials',async()=>{
 let target=null;const renderer={shadowMap:{enabled:true},getRenderTarget:()=>target,setRenderTarget:value=>{target=value;}},pass=new BuildingDestructionPass(renderer),root=new THREE.Scene(),ground=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()),prop=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());root.add(ground,prop);
 const source=ground.material,review=installGroundDepthProxy({scene:root,destructionPass:pass,terrainMeshes:[ground]},{prepareWorldDepth:true});let submitted=0;
 await pass.prepareDepth(new THREE.PerspectiveCamera(),root,{batchSize:1,nextFrame:async()=>{},compile:async(view,camera,targetScene)=>{const objects=[];view.traverse(o=>objects.push(o));submitted++;assert.equal(objects.length,1);assert.equal(objects[0].geometry,ground.geometry);assert.ok(objects[0].material.isMeshDepthMaterial);assert.notEqual(targetScene,root);}});
 assert.equal(submitted,1);assert.equal(ground.material,source);assert.equal(prop.material.visible,true);assert.equal(renderer.shadowMap.enabled,true);assert.equal(target,null);
 review.dispose();pass.dispose();ground.geometry.dispose();ground.material.dispose();prop.geometry.dispose();prop.material.dispose();
});
