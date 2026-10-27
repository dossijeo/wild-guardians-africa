import {BeastRecovery} from '../src/rendering/beast-recovery.js';
import {beastSkin} from './helpers/beast-skin.js';
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
function pose(species){return new BeastRagdollBinding(rig(species)).capture();}
test('actual five rigs fall with finite articulated bodies, bounded launch and ground contacts',()=>{
 const distances=[];
 for(const [species,mass] of [['hyena',.7],['warthog',1],['lion',1.5],['buffalo',3],['rhino',5]]){
  const s=new BeastRagdollSolver(R);s.box({x:0,y:-.1,z:0},{x:20,y:.1,z:20});const binding=new BeastRagdollBinding(beastSkin(species)),p=binding.capture(),a=s.add(species,{pose:p,colliders:binding.colliders(),mass,direction:{x:1,y:-.2,z:.2}}),start=a.pose[0];
  let maxSpeed=0,settled=false;
  for(let i=0;i<360;i++){s.step();assert.ok(a.pose.every(Number.isFinite));for(const {body} of a.parts){const v=body.linvel();maxSpeed=Math.max(maxSpeed,Math.hypot(v.x,v.y,v.z));assert.ok(body.translation().y>-.05,'body center beneath ground');}settled||=a.settled;}
  assert.ok(maxSpeed<15,species+' explosive solver '+maxSpeed);assert.ok(settled,species+' never settled');
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
  const binding=new BeastRagdollBinding(model),p=binding.capture(),before=binding.entries.map(e=>({q:e.bone.getWorldQuaternion(new THREE.Quaternion()).normalize(),position:e.bone.position.clone()}));
  const s=new BeastRagdollSolver(R),a=s.add(species,{pose:p});binding.apply(a.pose);
  for(let i=0;i<before.length;i++){assert.ok(before[i].q.angleTo(binding.entries[i].bone.getWorldQuaternion(new THREE.Quaternion()).normalize())<1e-5);assert.ok(before[i].position.distanceTo(binding.entries[i].bone.position)<1e-5);}
  for(let i=0;i<20;i++)s.step();binding.apply(a.pose);
  for(let i=1;i<before.length;i++)assert.ok(before[i].position.distanceTo(binding.entries[i].bone.position)<1e-8,'bone length changed');s.dispose();
 }
});

test('skin-derived convex colliders settle and support the actual deformed mesh',()=>{const failures=[];
 for(const [species,mass] of [['hyena',1],['warthog',1],['lion',1.5],['buffalo',3],['rhino',5]]){
  const model=beastSkin(species);model.position.y=.15;const binding=new BeastRagdollBinding(model),p=binding.capture(),colliders=binding.colliders();
  const s=new BeastRagdollSolver(R);s.box({x:0,y:-.1,z:0},{x:20,y:.1,z:20});const a=s.add(species,{pose:p,colliders,mass,direction:{x:1,y:-.2,z:.2}});
  for(let i=0;i<480;i++)s.step();binding.apply(a.pose);model.updateMatrixWorld(true);const v=new THREE.Vector3();let penetration=0,worst=null;
  model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;for(let i=0;i<mesh.geometry.attributes.position.count;i+=3){mesh.getVertexPosition(i,v).applyMatrix4(mesh.matrixWorld);if(-v.y>penetration){penetration=-v.y;const idx=mesh.geometry.attributes.skinIndex,w=mesh.geometry.attributes.skinWeight;worst=[0,1,2,3].map(k=>[mesh.skeleton.bones[idx.getComponent(i,k)].name,w.getComponent(i,k)]);}}});
  const gaps=binding.entries.map((e,i)=>{const j=i*7,p=new THREE.Vector3(0,-e.length/2,0).applyQuaternion(new THREE.Quaternion().fromArray(a.pose,j+3).normalize()).add(new THREE.Vector3().fromArray(a.pose,j));return [e.bone.name,p.distanceTo(e.bone.getWorldPosition(new THREE.Vector3()))];});console.log('skin contact',species,{settled:a.settled,penetration,worst,gaps:gaps.filter(g=>g[1]>.04)});if(!a.settled||penetration>=.03)failures.push(species+': '+penetration);s.dispose();
 }assert.deepEqual(failures,[]);
});

test('invalid fitted collider leaves an existing simulation intact',()=>{const s=new BeastRagdollSolver(R),p=pose('hyena'),a=s.add('one',{pose:p});assert.throws(()=>s.add('one',{pose:p,colliders:[{radius:NaN}]}));assert.equal(s.actors.get('one'),a);assert.equal(s.world.bodies.len(),14);s.dispose();});

test('get-up starts at the physical pose, retains displaced root and releases control',()=>{
 for(const species of ['hyena','warthog','lion','buffalo','rhino']){
  const model=beastSkin(species);model.position.y=.15;const b=new BeastRagdollBinding(model),p=b.capture(),s=new BeastRagdollSolver(R);s.box({x:0,y:-.1,z:0},{x:20,y:.1,z:20});const a=s.add(species,{pose:p,colliders:b.colliders()});for(let i=0;i<480;i++)s.step();b.apply(a.pose);
  const fallen=b.entries[0].bone.getWorldPosition(new THREE.Vector3());b.restore();const standing=b.entries[0].bone.getWorldPosition(new THREE.Vector3());model.position.x+=fallen.x-standing.x;model.position.z+=fallen.z-standing.z;model.updateMatrixWorld(true);
  const root=model.position.clone(),r=new BeastRecovery(b,a.pose,{surface:()=>0});r.apply(0);assert.ok(fallen.distanceTo(b.entries[0].bone.getWorldPosition(new THREE.Vector3()))<.03,species+' start pose jumps '+fallen.distanceTo(b.entries[0].bone.getWorldPosition(new THREE.Vector3())));let maxStep=0,maxPenetration=0;const point=new THREE.Vector3();const last=b.entries[0].bone.getWorldPosition(new THREE.Vector3());
  for(let i=0;i<100;i++){r.restore();r.apply(1/60);const hip=b.entries[0].bone.getWorldPosition(new THREE.Vector3());maxStep=Math.max(maxStep,hip.distanceTo(last));last.copy(hip);assert.ok(Number.isFinite(hip.y));assert.deepEqual(model.position.toArray(),root.toArray());if(i%10===0)model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;for(let j=0;j<mesh.geometry.attributes.position.count;j+=3){mesh.getVertexPosition(j,point).applyMatrix4(mesh.matrixWorld);maxPenetration=Math.max(maxPenetration,-point.y);}});}
  assert.ok(r.done);assert.ok(maxStep<.08,species+' recovery step '+maxStep);console.log('get-up',species,{maxStep,maxPenetration,lift:r.lift});assert.ok(maxPenetration<.04,species+' recovery penetrates '+maxPenetration);r.restore();s.dispose();
 }
});


test('solver iteration experiments are explicit and production retains twelve iterations',()=>{
 const solver=new BeastRagdollSolver(R);assert.equal(solver.world.numSolverIterations,12);solver.dispose();
 const trial=new BeastRagdollSolver(R,{solverIterations:24});assert.equal(trial.world.numSolverIterations,24);trial.dispose();
 for(const solverIterations of [0,33,1.5,NaN])assert.throws(()=>new BeastRagdollSolver(R,{solverIterations}),/Invalid solver iterations/);
});


test('all fitted species sustain rest after horizontal, downward and lateral impacts',()=>{
 for(const [species,mass] of [['hyena',.7],['warthog',1],['lion',1.5],['buffalo',3],['rhino',5]]){
  const binding=new BeastRagdollBinding(beastSkin(species)),pose=binding.capture(),colliders=binding.colliders();
  for(const direction of [{x:1,y:0,z:0},{x:1,y:-.8,z:0},{x:0,y:0,z:1}]){
   const solver=new BeastRagdollSolver(R);solver.box({x:0,y:-.1,z:0},{x:20,y:.1,z:20});
   const actor=solver.add(species,{pose,colliders,mass,direction});let quiet=0,sustained=false;
   for(let i=0;i<360;i++){solver.step();quiet=actor.settled?quiet+1:0;if(quiet>=18)sustained=true;}
   assert.ok(sustained,species+' failed sustained rest '+JSON.stringify(direction));solver.dispose();
  }
 }
});


test('recovery prewarm leaves geometry, pose and subsequent recovery unchanged',()=>{
 const model=beastSkin('hyena'),binding=new BeastRagdollBinding(model),before=binding.capture();
 const attributes=[];model.traverse(o=>{if(o.isMesh)attributes.push([o.geometry,o.geometry.attributes.position.array.slice()]);});
 BeastRecovery.prewarm(model);BeastRecovery.prewarm(model);
 assert.deepEqual(binding.capture(),before);
 for(const [geometry,positions] of attributes)assert.deepEqual(geometry.attributes.position.array,positions);
 const solver=new BeastRagdollSolver(R);solver.box({x:0,y:-.1,z:0},{x:20,y:.1,z:20});
 const actor=solver.add('warm',{pose:before,colliders:binding.colliders()});for(let i=0;i<360;i++)solver.step();
 const recovery=new BeastRecovery(binding,actor.pose,{surface:()=>0});assert.equal(recovery.apply(0),false);assert.equal(recovery.apply(recovery.duration),true);recovery.restore();solver.dispose();
});
