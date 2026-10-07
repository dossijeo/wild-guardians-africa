import test from 'node:test';
import assert from 'node:assert/strict';
import {Bone,Skeleton,SkinnedMesh,BufferGeometry,Float32BufferAttribute,Uint16BufferAttribute,Group,Vector3} from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {prepareSkinEnvelope,updateSkinEnvelopeSphere} from '../src/rendering/skin-envelope.js';
function rig(weights=[.5,.5,0,0,1,0,0,0,0,2,0,0]){
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute([-1,0,0,1,2,0,0,1,1],3));
 geometry.setAttribute('skinIndex',new Uint16BufferAttribute([0,1,0,0,0,0,0,0,0,1,0,0],4));
 geometry.setAttribute('skinWeight',new Float32BufferAttribute(weights,4));
 const a=new Bone(),b=new Bone();a.add(b);b.position.y=1;
 const mesh=new SkinnedMesh(geometry);mesh.add(a);mesh.bind(new Skeleton([a,b]));
 const root=new Group();root.add(mesh);return {mesh,root,a,b};
}
function contains(mesh){const p=new Vector3();for(let i=0;i<mesh.geometry.attributes.position.count;i++){mesh.getVertexPosition(i,p);assert.ok(mesh.boundingSphere.containsPoint(p));}}
test('bone envelopes contain blended vertices with zero, nonunit and positive weights under distant transformed roots',()=>{
 for(const weights of [undefined,[0,0,0,0,1.2,0,0,0,.3,.4,0,0]]){
  const {mesh,root,b}=rig(weights),envelope=prepareSkinEnvelope(mesh);assert.ok(envelope);
  root.position.set(4800,10,-7200);root.rotation.set(.2,.7,-.1);root.scale.set(1.2,.8,1.1);
  for(let i=0;i<20;i++){b.rotation.set(i*.1,i*.03,-i*.04);b.position.x=i*.05;root.updateMatrixWorld(true);assert.ok(updateSkinEnvelopeSphere(mesh,envelope));contains(mesh);}
 }
});
test('unit weight envelopes do not enclose world origin after moving an actor far away',()=>{
 const {mesh,root}=rig([.5,.5,0,0,1,0,0,0,0,1,0,0]),envelope=prepareSkinEnvelope(mesh);
 root.position.set(4800,10,-7200);root.updateMatrixWorld(true);
 assert.ok(updateSkinEnvelopeSphere(mesh,envelope));contains(mesh);assert.ok(mesh.boundingSphere.radius<5);
});
test('morphs, negative weights and changed geometry reject the envelope without overwriting existing bounds',()=>{
 const {mesh}=rig(),envelope=prepareSkinEnvelope(mesh);mesh.updateMatrixWorld(true);mesh.computeBoundingSphere();const before=mesh.boundingSphere.clone();
 mesh.geometry.attributes.position.needsUpdate=true;assert.equal(updateSkinEnvelopeSphere(mesh,envelope),false);assert.ok(mesh.boundingSphere.equals(before));
 mesh.geometry.morphAttributes.position=[mesh.geometry.attributes.position];assert.equal(prepareSkinEnvelope(mesh),null);
 delete mesh.geometry.morphAttributes.position;mesh.geometry.attributes.skinWeight.setX(0,-.1);assert.equal(prepareSkinEnvelope(mesh),null);
});

test('private cloned skeletons reuse immutable bind envelopes while producing independent pose bounds',()=>{
 const {mesh,root,b}=rig(),envelope=prepareSkinEnvelope(mesh),copyRoot=clone(root),copy=copyRoot.children[0];
 assert.notEqual(copy.skeleton,mesh.skeleton);assert.equal(copy.geometry,mesh.geometry);
 assert.equal(prepareSkinEnvelope(copy),envelope);
 const before=envelope.boxes.map(box=>[box.min.toArray(),box.max.toArray()]);
 b.rotation.z=.5;root.position.x=4800;root.updateMatrixWorld(true);
 copy.skeleton.bones[1].rotation.z=-.7;copyRoot.position.x=-7200;copyRoot.updateMatrixWorld(true);
 assert.ok(updateSkinEnvelopeSphere(mesh,envelope));assert.ok(updateSkinEnvelopeSphere(copy,envelope));contains(mesh);contains(copy);
 assert.deepEqual(envelope.boxes.map(box=>[box.min.toArray(),box.max.toArray()]),before);
 assert.notEqual(copy.boundingSphere,mesh.boundingSphere);
});

test('overflowing transforms leave the original sphere intact so the caller can fall back',()=>{
 const {mesh,b}=rig(),envelope=prepareSkinEnvelope(mesh);mesh.updateMatrixWorld(true);mesh.computeBoundingSphere();const before=mesh.boundingSphere.clone();
 b.scale.setScalar(1e308);mesh.updateMatrixWorld(true);
 assert.equal(updateSkinEnvelopeSphere(mesh,envelope),false);assert.ok(mesh.boundingSphere.equals(before));
});
