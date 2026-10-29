import test from 'node:test';
import assert from 'node:assert/strict';
import {BoxGeometry,Mesh,MeshBasicMaterial,Vector3} from 'three';
import {sampleRecoverySkinBounds,sampleRecoveryPositions} from './browser/guardian-peer-contacts.js';
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

import {recoveryPriorityPeers} from '../src/rendering/baked-solid-contacts.js';
test('recovery priority excludes self and reciprocal displacement across physical and baked actors',()=>{
 const entry=id=>({animal:{id}}),a=entry('a'),b=entry('b'),c=entry('c'),d=entry('d');
 const manager={entries:new Map([['a',a],['b',b]]),baked:{entries:new Map([['c',c],['d',d]])}};
 assert.deepEqual(recoveryPriorityPeers(manager,'a'),[]);
 assert.deepEqual(recoveryPriorityPeers(manager,'b'),[a]);
 assert.deepEqual(recoveryPriorityPeers(manager,'c'),[a,b]);
 assert.deepEqual(recoveryPriorityPeers(manager,'d'),[a,b,c]);
 manager.entries.delete('a');
 assert.deepEqual(recoveryPriorityPeers(manager,'b'),[]);
 assert.deepEqual(recoveryPriorityPeers(manager,'a'),[]);
 manager.entries.set('a',a);
 assert.deepEqual(recoveryPriorityPeers(manager,'a'),[b]);
});

test('recovery telemetry reads active recovery correction rather than stale fall shift',()=>{
 const model=new Mesh(),entry={animal:{id:'a',magicDown:{phase:'recovering'}},actor:{},binding:{bones:new Map([['Hips',model]])},recovery:{horizontalCorrection:new Vector3(.2,0,.4)},fall:{solidContacts:{shift:new Vector3(9,0,9)}}};
 const manager={entries:new Map([['a',entry]])};
 assert.deepEqual(sampleRecoveryPositions(manager)[0].correction,[.2,0,.4]);
 delete entry.recovery;assert.deepEqual(sampleRecoveryPositions(manager)[0].correction,[9,0,9]);
});
