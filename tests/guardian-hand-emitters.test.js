import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {actorGeometry} from './helpers/actor-geometry.js';
import {guardianHandEmitters,guardianHandPosition} from '../src/rendering/guardian-hand-emitters.js';
test('real Guardian emits inside the hand region and follows wrist articulation',async()=>{
 const model=await actorGeometry(new URL('../public/content/guardian/guardian.glb',import.meta.url)),points=guardianHandEmitters(model),out=new Vector3();
 assert.equal(points.size,2);
 for(const [bone,point] of points){
  assert.ok(point.y>.03&&point.y<.08,'emission is beyond the wrist, within the authored hand');
  const original=point.clone();bone.rotation.z+=.6;model.position.set(10,2,-4);model.scale.setScalar(2.4);model.updateWorldMatrix(true,true);
  const expected=bone.localToWorld(point.clone());guardianHandPosition(points,bone,out);assert.ok(out.distanceTo(expected)<1e-9);assert.deepEqual(point.toArray(),original.toArray());
  assert.ok(out.distanceTo(bone.getWorldPosition(new Vector3()))>.08,'source must not fall back to the wrist');
 }
});
