import test from 'node:test';
import assert from 'node:assert/strict';
import {BoxGeometry,InstancedBufferGeometry,Mesh,MeshBasicMaterial,PerspectiveCamera,Scene} from 'three';
import {createWebGpuMicroeventVisibility} from '../src/rendering/webgpu-microevent-visibility.js';

test('visibility requires a complete scene and rejects an obstructing mesh',()=>{
 const scene=new Scene(),camera=new PerspectiveCamera();camera.position.set(0,0,0);camera.updateMatrixWorld();let ready=false;const visibility=createWebGpuMicroeventVisibility({scene,camera,isReady:()=>ready}),target={x:0,y:0,z:-8};
 assert.equal(visibility.visible(target),false);ready=true;assert.equal(visibility.visible(target),true);const mesh=new Mesh(new BoxGeometry(2,2,2),new MeshBasicMaterial());mesh.position.z=-4;scene.add(mesh);assert.equal(visibility.visible(target),false);mesh.visible=false;assert.equal(visibility.visible(target),true);mesh.geometry.dispose();mesh.material.dispose();
});
test('unresolved instanced geometry fails closed rather than exposing a hidden target',()=>{const scene=new Scene(),camera=new PerspectiveCamera(),geometry=new InstancedBufferGeometry(),material=new MeshBasicMaterial(),mesh=new Mesh(geometry,material);scene.add(mesh);const visibility=createWebGpuMicroeventVisibility({scene,camera,isReady:()=>true});try{assert.equal(visibility.visible({x:0,y:0,z:-8}),false);}finally{geometry.dispose();material.dispose();}});
