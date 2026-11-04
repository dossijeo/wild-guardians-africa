import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Group,Vector3} from 'three';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {loadWorkerPhysicsRig} from '../src/simulation/worker-physics-rig.js';
import {createWorkerPhysicsRigBank} from '../src/simulation/worker-physics-rig-bank.js';
import {prepareAnimalModel,animalGroundSamples} from '../src/rendering/animal-actions.js';

test('real hyena rig shares geometry but isolates skeleton, pose and material lifetime',async()=>{
 const bytes=await readFile(new URL('../public'+ANIMAL_ACTIONS.animals.hyena.url,import.meta.url));const oldFetch=globalThis.fetch;let requests=0;
 globalThis.fetch=async()=>{requests++;return new Response(bytes);};
 try{
  const original=await loadWorkerPhysicsRig('hyena'),bank=createWorkerPhysicsRigBank(),[a,b]=await Promise.all([bank.acquire('hyena'),bank.acquire('hyena')]);
  assert.equal(requests,2);const mesh=root=>{let result;root.traverse(o=>{if(o.isSkinnedMesh&&!result)result=o;});return result;},reference=mesh(original),left=mesh(a.model),right=mesh(b.model);
  assert.ok(reference&&left&&right);assert.equal(left.geometry,right.geometry);assert.notEqual(left.skeleton,right.skeleton);assert.notEqual(left.material,right.material);assert.deepEqual([...left.geometry.attributes.position.array],[...reference.geometry.attributes.position.array]);assert.deepEqual([...left.geometry.attributes.skinWeight.array],[...reference.geometry.attributes.skinWeight.array]);
  const v=new Vector3(),w=new Vector3();original.updateMatrixWorld(true);a.model.updateMatrixWorld(true);reference.getVertexPosition(10,v);left.getVertexPosition(10,w);assert.ok(v.distanceTo(w)<1e-6);
  const before=right.skeleton.bones[0].quaternion.clone();left.skeleton.bones[0].rotation.x+=.4;reference.skeleton.bones[0].rotation.x+=.4;assert.ok(right.skeleton.bones[0].quaternion.equals(before));original.updateMatrixWorld(true);a.model.updateMatrixWorld(true);reference.skeleton.update();left.skeleton.update();for(let i=0;i<100;i++){reference.getVertexPosition(i,v);left.getVertexPosition(i,w);assert.ok(v.distanceTo(w)<1e-6);}
  let disposed=0;left.geometry.addEventListener('dispose',()=>disposed++);bank.dispose();assert.equal(disposed,0);a.release();a.release();assert.equal(disposed,0);b.release();assert.equal(disposed,1);await assert.rejects(bank.acquire('hyena'),/disposed/);
 }finally{globalThis.fetch=oldFetch;}
});

test('disposing while loading rejects pending and later acquisitions',async()=>{
 let resolve;const bank=createWorkerPhysicsRigBank({load:()=>new Promise(r=>{resolve=r;})}),pending=bank.acquire('hyena');
 await Promise.resolve();bank.dispose();resolve(new Group());await assert.rejects(pending,/disposed/);await assert.rejects(bank.acquire('hyena'),/disposed/);
});

test('failed source is retried without poisoning the bank',async()=>{
 let calls=0;const bank=createWorkerPhysicsRigBank({load:async()=>{if(++calls===1)throw Error('temporary');return new Group();}});
 await assert.rejects(bank.acquire('hyena'),/temporary/);const lease=await bank.acquire('hyena');assert.equal(calls,2);lease.release();bank.dispose();
});

test('real warthog rigs retain independent hoof preparation and matching ground samples',async()=>{
 const bytes=await readFile(new URL('../public'+ANIMAL_ACTIONS.animals.warthog.url,import.meta.url)),oldFetch=globalThis.fetch;let requests=0;globalThis.fetch=async()=>{requests++;return new Response(bytes);};
 try{const original=await loadWorkerPhysicsRig('warthog'),bank=createWorkerPhysicsRigBank(),[a,b]=await Promise.all([bank.acquire('warthog'),bank.acquire('warthog')]);prepareAnimalModel(original,'warthog');prepareAnimalModel(a.model,'warthog');prepareAnimalModel(b.model,'warthog');const project=model=>animalGroundSamples(model).map(({mesh,index})=>[mesh.name,index]);assert.deepEqual(project(a.model),project(original));assert.deepEqual(project(b.model),project(original));assert.equal(requests,2);a.release();b.release();bank.dispose();}finally{globalThis.fetch=oldFetch;}
});
