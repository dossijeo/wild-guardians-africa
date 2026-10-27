import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AnimationClip,Vector3} from 'three';
import {actorGeometry} from './helpers/actor-geometry.js';
import {BeastRagdollBinding} from '../src/rendering/beast-ragdoll-binding.js';
import {AuthoredBeastRecovery} from '../src/rendering/authored-beast-recovery.js';
import {isTailContactVertex} from '../src/rendering/beast-ground-contact.js';

for(const species of ['hyena','lion'])test(`${species} supine recovery supports feet on inclined terrain`,async()=>{
 const model=await actorGeometry(new URL(`../content/source/actors/${species}/expressive-candidate.glb`,import.meta.url)),clip=AnimationClip.parse(JSON.parse(fs.readFileSync(new URL(`../content/source/animations/stand-up/${species}-candidate.json`,import.meta.url))).clip);
 const binding=new BeastRagdollBinding(model);binding.capture();const snapshot=new Float32Array(98);binding.physicalSnapshot(snapshot);
 const meshes=[],bones=[];model.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);if(o.isBone)bones.push({bone:o,length:o.position.length()});});const p=new Vector3();
 for(const [dx,dz,yaw]of [[.15,0,0],[-.12,.08,1.3],[0,-.18,2.1]]){
  model.rotation.y=yaw;model.updateMatrixWorld(true);const surface=(x,z)=>dx*x+dz*z,recovery=new AuthoredBeastRecovery(binding,snapshot,{clip,surface});
  for(const age of [.65,.95,1.25]){
   recovery.age=0;recovery.apply(age);let feet=Infinity,body=Infinity;
   for(const mesh of meshes)for(let i=0;i<mesh.geometry.attributes.position.count;i++){
    if(isTailContactVertex(mesh,i))continue;mesh.getVertexPosition(i,p).applyMatrix4(mesh.matrixWorld);const gap=p.y-surface(p.x,p.z);body=Math.min(body,gap);
    const {skinIndex:indices,skinWeight:weights}=mesh.geometry.attributes;let best=0;for(let k=1;k<4;k++)if(weights.getComponent(i,k)>weights.getComponent(i,best))best=k;
    if(/Foot|Toe/.test(mesh.skeleton.bones[indices.getComponent(i,best)].name))feet=Math.min(feet,gap);
   }
   assert.ok(feet<.05,`Feet suspended ${feet} m at age ${age}, slope ${dx}/${dz}`);
   assert.ok(body>-.025,`Skin penetrates ${body} m`);
   for(const {bone,length}of bones)if(bone!==recovery.hip)assert.ok(Math.abs(bone.position.length()-length)<1e-6,'Bone stretched');
  }
  recovery.restore();
 }
});
