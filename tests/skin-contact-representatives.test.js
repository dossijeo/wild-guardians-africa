import test from 'node:test';import assert from 'node:assert/strict';
import {actorGeometry} from './helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {skinContactIndices,skinContactRepresentatives} from '../src/rendering/skin-contact-indices.js';
import {Uint8BufferAttribute} from 'three';
test('seam representatives share exact skin inputs and refresh after geometry or mask edits',async()=>{
 const model=await actorGeometry(new URL('../public'+ANIMAL_ACTIONS.animals.rhino.url,import.meta.url));let mesh;model.traverse(n=>{if(!mesh&&n.isSkinnedMesh)mesh=n;});
 const original=skinContactRepresentatives(mesh),unique=skinContactIndices(mesh);
 assert.equal(new Set([...original].filter(i=>i>=0)).size,unique.length);
 const attrs=mesh.geometry.attributes,inputs=[attrs.position,attrs.skinIndex,attrs.skinWeight,...(mesh.geometry.morphAttributes.position??[])];
 for(let i=0;i<original.length;i++)if(original[i]>=0)for(const a of inputs)for(let k=0;k<a.itemSize;k++)assert.equal(a.getComponent(i,k),a.getComponent(original[i],k));
 const duplicate=original.findIndex((r,i)=>r>=0&&r!==i);assert.ok(duplicate>=0);
 attrs.position.setX(duplicate,attrs.position.getX(duplicate)+.12345);attrs.position.needsUpdate=true;
 const updated=skinContactRepresentatives(mesh);assert.notEqual(updated,original);assert.equal(updated[duplicate],duplicate);
 const mask=new Uint8BufferAttribute(new Uint8Array(original.length),1);mask.setX(duplicate,1);mesh.geometry.setAttribute('tailContactExempt',mask);
 assert.equal(skinContactRepresentatives(mesh)[duplicate],-1);
});
