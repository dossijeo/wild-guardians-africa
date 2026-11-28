import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Bone,Vector3} from 'three';
import {RecoveryPoseSample} from '../src/rendering/recovery-pose-sample.js';
test('reuses complete physical-time pose including passive descendants',()=>{
 const root=new Group(),model=new Group(),hip=new Bone(),tail=new Bone();root.add(model);model.add(hip);hip.add(tail);
 const sample=new RecoveryPoseSample(model);hip.position.set(1,2,3);tail.rotation.z=.7;tail.scale.setScalar(.9);sample.capture(.4);
 const expected=tail.getWorldPosition(new Vector3());hip.position.set(0,0,0);tail.rotation.z=0;tail.scale.setScalar(1);
 assert.equal(sample.apply(.4),true);assert.ok(tail.getWorldPosition(new Vector3()).distanceTo(expected)<1e-9);assert.equal(tail.rotation.z,.7);assert.equal(tail.scale.x,.9);
 assert.equal(sample.apply(.41),false);
 root.position.x=2;assert.equal(sample.apply(.4),false);
 root.position.x=0;root.rotation.y=.2;assert.equal(sample.apply(.4),false);
 root.rotation.y=0;model.scale.setScalar(2);assert.equal(sample.apply(.4),false);
});
