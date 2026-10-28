import test from 'node:test';
import assert from 'node:assert/strict';
import {BoxGeometry,Mesh,MeshBasicMaterial} from 'three';
import {sampleRecoverySkinBounds} from './browser/guardian-peer-contacts.js';
test('skin bounds include baked actors and distinguish separation from broad-phase candidates',()=>{
 const geometry=new BoxGeometry(2,2,2),material=new MeshBasicMaterial();
 const a=new Mesh(geometry,material),b=new Mesh(geometry,material);a.updateMatrixWorld(true);b.position.x=3;b.updateMatrixWorld(true);
 const manager={entries:new Map([['a',{animal:{id:'a'},actor:{},recovery:{},data:{model:a}}]]),baked:{entries:new Map([['b',{animal:{id:'b'},recovery:{},data:{model:b}}]])}};
 let [pair]=sampleRecoverySkinBounds(manager);assert.deepEqual(pair.modes,['physical','baked']);assert.equal(pair.candidate,false);assert.equal(pair.overlap[0],-1);
 b.position.x=1;b.updateMatrixWorld(true);[pair]=sampleRecoverySkinBounds(manager);assert.equal(pair.candidate,true);assert.deepEqual(pair.overlap,[1,2,2]);
 geometry.dispose();material.dispose();
});

test('baked vertices are queried against real Rapier collider volumes',async()=>{
 const {default:R}=await import('@dimforge/rapier3d-compat');await R.init();
 const world=new R.World({x:0,y:0,z:0});
 const body=world.createRigidBody(R.RigidBodyDesc.fixed());const collider=world.createCollider(R.ColliderDesc.ball(4),body);
 const geometry=new BoxGeometry(2,2,2),material=new MeshBasicMaterial(),a=new Mesh(geometry,material),b=new Mesh(geometry,material);
 a.updateMatrixWorld(true);b.updateMatrixWorld(true);
 const manager={entries:new Map([['a',{animal:{id:'a'},actor:{parts:[{body}]},recovery:{},data:{model:a}}]]),baked:{entries:new Map([['b',{animal:{id:'b'},recovery:{},data:{model:b}}]])}};
 assert.equal(sampleRecoverySkinBounds(manager)[0].bakedVerticesInsidePhysical.inside,geometry.attributes.position.count);
 collider.setTranslation({x:20,y:0,z:0});
 assert.equal(sampleRecoverySkinBounds(manager)[0].bakedVerticesInsidePhysical.inside,0);
 world.free();geometry.dispose();material.dispose();
});
