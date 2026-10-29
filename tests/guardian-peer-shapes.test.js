import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Bone,Box3,Vector3,Quaternion} from 'three';
import {BakedSolidContacts} from '../src/rendering/baked-solid-contacts.js';

test('immutable peer hull is read once while live transforms and collider replacement remain exact',async()=>{
 const {default:R}=await import('@dimforge/rapier3d-compat');await R.init();const world=new R.World({x:0,y:0,z:0});
 try{
  const model=new Group(),hip=new Bone();model.add(hip);model.updateMatrixWorld(true);const binding={model,bones:new Map([['Hips',hip]])};
  const body=world.createRigidBody(R.RigidBodyDesc.fixed()),vertices=new Float32Array([-1,-1,-1,1,-1,-1,0,1,-1,0,0,1]);
  let collider=world.createCollider(R.ColliderDesc.convexHull(vertices),body),reads=0;
  const watch=()=>{const original=collider.vertices.bind(collider);collider.vertices=()=>{reads++;return original();};};watch();
  const peer={data:{model},actor:{parts:[{body}]},solver:{R}},a=new BakedSolidContacts(binding,[],()=>[peer]),b=new BakedSolidContacts(binding,[],()=>[peer]);
  for(let i=0;i<5;i++){
   const q=new Quaternion().setFromAxisAngle(new Vector3(0,1,0),i*.4);collider.setTranslation({x:i,y:2,z:-i});collider.setRotation(q);
   const expected=new Box3(),point=new Vector3(),position=collider.translation(),rotation=collider.rotation();for(let j=0;j<vertices.length;j+=3)expected.expandByPoint(point.fromArray(vertices,j).applyQuaternion(rotation).add(position));expected.expandByScalar(.08);
   for(const contacts of [a,b]){contacts.refreshPeers();assert.ok(contacts.peerBoxes[0].min.distanceTo(expected.min)<1e-6);assert.ok(contacts.peerBoxes[0].max.distanceTo(expected.max)<1e-6);}
  }
  assert.equal(reads,1,'neighbors share immutable shape extraction');
  world.removeCollider(collider,true);collider=world.createCollider(R.ColliderDesc.convexHull(vertices),body);watch();a.refreshPeers();assert.equal(reads,2,'replacement collider must not reuse the old shape');
 }finally{world.free();}
});
