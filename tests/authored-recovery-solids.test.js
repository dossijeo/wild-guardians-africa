import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AnimationClip,Box3,Vector3} from 'three';
import {actorGeometry} from './helpers/actor-geometry.js';
import {BeastRagdollBinding} from '../src/rendering/beast-ragdoll-binding.js';
import {AuthoredBeastRecovery} from '../src/rendering/authored-beast-recovery.js';
import {BakedSolidContacts} from '../src/rendering/baked-solid-contacts.js';
import {isTailContactVertex} from '../src/rendering/beast-ground-contact.js';
for(const species of ['hyena','lion'])test(`${species} get-up clears a wall and an open corner without stretching`,async()=>{
 const model=await actorGeometry(new URL(`../content/source/actors/${species}/expressive-candidate.glb`,import.meta.url)),binding=new BeastRagdollBinding(model),clip=AnimationClip.parse(JSON.parse(fs.readFileSync(new URL(`../content/source/animations/stand-up/${species}-candidate.json`,import.meta.url))).clip);
 binding.capture();const snapshot=new Float32Array(98);binding.physicalSnapshot(snapshot);const meshes=[],lengths=[];model.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);if(o.isBone)lengths.push([o,o.position.length()]);});const p=new Vector3(),initial=new Box3();for(const mesh of meshes)for(let i=0;i<mesh.geometry.attributes.position.count;i++){if(isTailContactVertex(mesh,i))continue;mesh.getVertexPosition(i,p).applyMatrix4(mesh.matrixWorld);initial.expandByPoint(p);}
 const wall=new Box3(new Vector3(-10,0,initial.max.z+.05),new Vector3(10,3,initial.max.z+.35)),side=new Box3(new Vector3(initial.max.x+.05,0,-10),new Vector3(initial.max.x+.35,3,10));
 for(const boxes of [[wall],[wall,side]]){
  const contacts=new BakedSolidContacts(binding,boxes),recovery=new AuthoredBeastRecovery(binding,snapshot,{clip,surface:()=>0,solidContacts:contacts});let maxShift=0;
  for(let age=.1;age<=recovery.duration;age+=.1){recovery.age=0;recovery.apply(age);maxShift=Math.max(maxShift,recovery.horizontalCorrection.length());for(const mesh of meshes)for(let i=0;i<mesh.geometry.attributes.position.count;i++){if(isTailContactVertex(mesh,i))continue;mesh.getVertexPosition(i,p).applyMatrix4(mesh.matrixWorld);for(const box of boxes)assert.ok(!box.containsPoint(p),`Skin inside solid at ${age}s: ${p.toArray()} box ${box.min.toArray()} / ${box.max.toArray()} shift ${recovery.horizontalCorrection.toArray()} envelope ${contacts.bounds.max.toArray()} index ${i}`);}for(const [bone,length]of lengths)if(bone!==recovery.hip)assert.ok(Math.abs(bone.position.length()-length)<1e-6);}
  assert.ok(maxShift>.01,'Fixture did not exercise solid correction');recovery.restore();
 }
});
