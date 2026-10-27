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
