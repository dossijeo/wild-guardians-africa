import test from 'node:test';
import assert from 'node:assert/strict';
import {Bone,BufferGeometry,Float32BufferAttribute,Uint16BufferAttribute} from 'three';
import {isTailContactVertex} from '../src/rendering/beast-ground-contact.js';
import {BeastRecovery} from '../src/rendering/beast-recovery.js';
test('tail exemption keeps pelvis and mixed body contacts and accepts explicit unrigged masks',()=>{
 const hips=new Bone(),tail=new Bone(),tip=new Bone();hips.name='Hips';tail.name='Tail_01';tip.name='Tip';hips.add(tail);tail.add(tip);
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute([0,0,0,0,-2,0,0,-3,0,0,-4,0],3));
 geometry.setAttribute('skinIndex',new Uint16BufferAttribute([0,1,0,0,1,0,0,0,2,0,0,0,0,1,0,0],4));
 geometry.setAttribute('skinWeight',new Float32BufferAttribute([.8,.2,0,0,1,0,0,0,1,0,0,0,.5,.5,0,0],4));
 const mesh={isSkinnedMesh:true,geometry,skeleton:{bones:[hips,tail,tip]}},model={traverse:fn=>fn(mesh)};
 assert.deepEqual([0,1,2,3].map(i=>isTailContactVertex(mesh,i)),[false,true,true,false]);
 assert.deepEqual(BeastRecovery.contactSamples(model).map(s=>s.index).sort(),[0,3]);
 geometry.setAttribute('tailContactExempt',new Float32BufferAttribute([0,0,0,1],1));
 assert.equal(isTailContactVertex(mesh,3),true);assert.equal(isTailContactVertex(mesh,0),false);
});


test('reviewed warthog tail mask excludes misweighted tail without excluding the actual hand',async()=>{
 const {actorGeometry}=await import('./helpers/actor-geometry.js');
 const {ANIMAL_ACTIONS}=await import('../src/simulation/animal-actions-data.js');
 const model=await actorGeometry(new URL('../public'+ANIMAL_ACTIONS.animals.warthog.url,import.meta.url)),mesh=model.getObjectByName('Mesh_0_1');
 assert.equal(isTailContactVertex(mesh,15050),true,'Known tail tip formerly supporting the hand collider');
 let count=0,retainedHand=0;const {position:p,skinIndex:ix,skinWeight:w}=mesh.geometry.attributes;
 for(let i=0;i<p.count;i++){const excluded=isTailContactVertex(mesh,i);if(excluded)count++;for(let k=0;k<4;k++)if(mesh.skeleton.bones[ix.getComponent(i,k)].name==='RightHand'&&w.getComponent(i,k)>.25&&p.getX(i)<-.9&&p.getY(i)>1.05&&p.getZ(i)>-.5&&!excluded)retainedHand++;}
 assert.equal(count,1193);assert.ok(retainedHand>20,'Actual hand contacts must remain');
 const changed={...mesh,geometry:mesh.geometry.clone()};changed.geometry.deleteAttribute('tailContactExempt');changed.geometry.attributes.position.setX(0,p.getX(0)+.01);
 assert.equal(isTailContactVertex(changed,15050),false,'Changed rest geometry must not inherit an old mask');
});
