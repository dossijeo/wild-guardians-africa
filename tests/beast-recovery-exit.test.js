import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Bone,Vector3,Quaternion} from 'three';
import {BeastRecoveryExit} from '../src/rendering/beast-recovery-exit.js';
test('exit preserves world pose across root translation and heading then restores native pose',()=>{
 const root=new Group(),model=new Group(),hip=new Bone(),head=new Bone();hip.name='Hips';root.add(model);model.add(hip);hip.add(head);hip.position.y=1;head.position.y=.5;root.updateMatrixWorld(true);
 const start=hip.getWorldPosition(new Vector3()),rotation=hip.getWorldQuaternion(new Quaternion()),exit=new BeastRecoveryExit(model,10);
 root.position.set(2,.2,3);root.rotation.y=1;hip.position.y=1.1;head.rotation.x=.3;root.updateMatrixWorld(true);const native=hip.position.clone();
 assert.equal(exit.apply(10),false);assert.ok(hip.getWorldPosition(new Vector3()).distanceTo(start)<1e-8);assert.ok(hip.getWorldQuaternion(new Quaternion()).angleTo(rotation)<1e-7);
 exit.restore();assert.ok(hip.position.distanceTo(native)<1e-8);assert.ok(Math.abs(head.rotation.x-.3)<1e-8);
 exit.apply(10.15);exit.restore();assert.ok(hip.position.distanceTo(native)<1e-8);assert.equal(exit.apply(10.31),true);assert.ok(hip.position.distanceTo(native)<1e-8);
});
