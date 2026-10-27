import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Object3D} from 'three';
import {createSoftDepthVisibility,installSoftDepthVisibility} from '../tools/experiments/soft-depth-visibility.js';
function fixture(){
 const camera=new PerspectiveCamera(60,1,.1,100);camera.updateMatrixWorld();
 const fx=new Object3D(),root=new Object3D();root.add(fx);fx.softParticleDepth=true;
 fx.spriteBuffer={array:new Float32Array(25)};fx.spriteBuffer.array.set([0,0,-5,1,1]);fx.spriteBuffer.array[21]=.1;fx.sprites={geometry:{instanceCount:1}};
 const world={vfxLibrary:{instances:new Set([fx])},destructionPass:{buildings:new Set(),captureDepth(){return 42;}}};return {camera,fx,world};
}
test('visible, edge and near-plane particles retain depth; wholly outside may skip',()=>{
 const {camera,fx,world}=fixture(),needs=createSoftDepthVisibility(),a=fx.spriteBuffer.array;
 assert.equal(needs(world,camera),true);a[0]=20;assert.equal(needs(world,camera),false);
 a[0]=3;assert.equal(needs(world,camera),true);a[0]=0;a[2]=0;assert.equal(needs(world,camera),true);
 a[2]=5;assert.equal(needs(world,camera),false);
});
test('transforms, uncertain data and smoke preserve conservative behavior',()=>{
 const {camera,fx,world}=fixture(),needs=createSoftDepthVisibility();fx.position.x=20;assert.equal(needs(world,camera),false);
 fx.scale.set(30,1,1);assert.equal(needs(world,camera),true);
 fx.scale.set(0,0,0);assert.equal(needs(world,camera),true);
 fx.scale.set(1,1,1);fx.spriteBuffer.array[3]=NaN;assert.equal(needs(world,camera),true);
 fx.spriteBuffer.array[3]=1;world.destructionPass.buildings.add({effects:{native:{smoke:[{}]}}});assert.equal(needs(world,camera),true);
});
test('wrapper restores ownership and does not suppress unknown consumers',()=>{
 const {camera,fx,world}=fixture(),original=world.destructionPass.captureDepth,finish=installSoftDepthVisibility(world);
 assert.equal(world.destructionPass.captureDepth(camera),42);fx.position.x=20;assert.equal(world.destructionPass.captureDepth(camera),undefined);
 world.vfxLibrary.instances.clear();assert.equal(world.destructionPass.captureDepth(camera),42);
 assert.deepEqual(finish(),{requested:3,skipped:1});assert.equal(world.destructionPass.captureDepth,original);
});
