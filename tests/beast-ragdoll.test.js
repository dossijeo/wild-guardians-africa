import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {BeastRagdollBinding} from '../src/rendering/beast-ragdoll-binding.js';
import R from '@dimforge/rapier3d-compat';
import {BeastRagdollSolver} from '../src/simulation/beast-ragdoll.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
await R.init();
function rig(species){
 const bytes=fs.readFileSync(new URL('../public'+ANIMAL_ACTIONS.animals[species].url,import.meta.url)),g=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
 const joints=new Set(g.skins.flatMap(s=>s.joints));const nodes=g.nodes.map((n,i)=>{const o=joints.has(i)?new THREE.Bone():new THREE.Object3D();o.name=n.name??'';if(n.matrix){o.matrix.fromArray(n.matrix);o.matrix.decompose(o.position,o.quaternion,o.scale);}else{if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);}return o;});
 for(let i=0;i<nodes.length;i++)for(const j of g.nodes[i].children??[])nodes[i].add(nodes[j]);for(const i of g.scenes[g.scene??0].nodes)nodes[i].updateMatrixWorld(true);
 const root=new THREE.Group();for(const i of g.scenes[g.scene??0].nodes)root.add(nodes[i]);root.position.y=.15;root.updateMatrixWorld(true);return root;
}
function pose(species){const p={};rig(species).traverse(o=>{if(o.isBone)p[o.name.replace('mixamorig:','')]=o.getWorldPosition(new THREE.Vector3());});return p;}
test('actual five rigs fall with finite articulated bodies, bounded launch and ground contacts',()=>{
 const distances=[];
 for(const [species,mass] of [['hyena',.7],['warthog',1],['lion',1.5],['buffalo',3],['rhino',5]]){
  const s=new BeastRagdollSolver(R);s.box({x:0,y:-.1,z:0},{x:20,y:.1,z:20});const p=pose(species),a=s.add(species,{pose:p,mass,direction:{x:1,y:-.2,z:.2}}),start=a.pose[0];
  let maxSpeed=0,settled=false;
  for(let i=0;i<360;i++){s.step();assert.ok(a.pose.every(Number.isFinite));for(const {body} of a.parts){const v=body.linvel();maxSpeed=Math.max(maxSpeed,Math.hypot(v.x,v.y,v.z));assert.ok(body.translation().y>-.05,'body center beneath ground');}settled||=a.settled;}
  assert.ok(maxSpeed<15,'explosive solver');assert.ok(settled,species+' never settled');
  const distance=a.pose[0]-start;assert.ok(distance>.15&&distance<4,species+' launch '+distance);distances.push(distance);
  for(const joint of a.joints){const b1=joint.body1(),b2=joint.body2(),v1=new THREE.Vector3().copy(joint.anchor1()).applyQuaternion(b1.rotation()).add(b1.translation()),v2=new THREE.Vector3().copy(joint.anchor2()).applyQuaternion(b2.rotation()).add(b2.translation());assert.ok(v1.distanceTo(v2)<.06,'stretched articulation');}
  s.remove(species);assert.equal(s.world.bodies.len(),0);assert.equal(s.world.impulseJoints.len(),0);s.dispose();
 }
 assert.ok(distances[0]>distances[4],'rhino should resist launch more than hyena');
 console.log('actual-rig launch distances',distances);
});
test('solid wall blocks a launch and capacity rejection allocates no extra bodies',()=>{
 const s=new BeastRagdollSolver(R,{capacity:1});s.box({x:0,y:-.1,z:0},{x:20,y:.1,z:20});s.box({x:1.6,y:2,z:0},{x:.2,y:2,z:3});
 const a=s.add('one',{pose:pose('hyena'),direction:{x:1,y:0,z:0}});assert.equal(s.add('two',{pose:pose('lion')}),null);assert.equal(s.world.bodies.len(),14);
 for(let i=0;i<240;i++)s.step();assert.ok(a.pose[0]<1.6,'pelvis crossed wall');s.dispose();
});
test('invalid pose is rejected transactionally before allocating physics',()=>{const s=new BeastRagdollSolver(R);assert.throws(()=>s.add('bad',{pose:{}}));assert.equal(s.world.bodies.len(),0);assert.equal(s.actors.size,0);s.dispose();});

test('physical pose binding preserves the captured pose and authored bone lengths',()=>{
 for(const species of Object.keys(ANIMAL_ACTIONS.animals)){
  const model=rig(species);model.traverse(o=>o.name=o.name.replace(':',''));model.rotation.y=.7;model.position.x=120;model.position.z=-40;
  const binding=new BeastRagdollBinding(model),p=binding.capture(),before=binding.entries.map(e=>({q:e.bone.getWorldQuaternion(new THREE.Quaternion()),position:e.bone.position.clone()}));
  const s=new BeastRagdollSolver(R),a=s.add(species,{pose:p});binding.apply(a.pose);
  for(let i=0;i<before.length;i++){assert.ok(before[i].q.angleTo(binding.entries[i].bone.getWorldQuaternion(new THREE.Quaternion()))<1e-5);assert.ok(before[i].position.distanceTo(binding.entries[i].bone.position)<1e-5);}
  for(let i=0;i<20;i++)s.step();binding.apply(a.pose);
  for(let i=1;i<before.length;i++)assert.ok(before[i].position.distanceTo(binding.entries[i].bone.position)<1e-8,'bone length changed');s.dispose();
 }
});
