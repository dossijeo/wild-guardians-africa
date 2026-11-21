import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AnimationClip,AnimationMixer,Vector3} from 'three';
import {actorGeometry} from './helpers/actor-geometry.js';
import {BeastRagdollBinding} from '../src/rendering/beast-ragdoll-binding.js';
import {BeastRecovery} from '../src/rendering/beast-recovery.js';
import {RecoveryClothContacts} from '../src/rendering/recovery-cloth-contacts.js';

test('lion recovery cloth bends above terrain without lifting hips, stretching bones or animating tail',async()=>{
 const model=await actorGeometry(new URL('../content/source/actors/lion/expressive-candidate.glb',import.meta.url)),binding=new BeastRagdollBinding(model);
 const clip=AnimationClip.parse(JSON.parse(fs.readFileSync(new URL('../content/source/animations/stand-up/lion-candidate.json',import.meta.url))).clip),mixer=new AnimationMixer(model);mixer.clipAction(clip).play();mixer.setTime(4);
 const hip=binding.bones.get('Hips');hip.position.y-=.12;model.updateMatrixWorld(true);
 const support=new RecoveryClothContacts(binding,BeastRecovery.contactSamples(model)),p=new Vector3(),bones=[];model.traverse(b=>{if(b.isBone)bones.push({bone:b,position:b.position.clone(),q:b.quaternion.clone()});});
 const minimum=()=>{let value=Infinity;for(const {mesh,index}of support.clothSamples){mesh.getVertexPosition(index,p).applyMatrix4(mesh.matrixWorld);value=Math.min(value,p.y);}return value;};
 const before=minimum();support.resolve(()=>0,1);const after=minimum();
 assert.ok(after>before+.025,`Cloth did not lift independently: ${before} -> ${after}`);
 for(const {bone,position,q}of bones){assert.ok(bone.position.distanceTo(position)<1e-8,`Translated ${bone.name}`);if(!/^ClothRear_/.test(bone.name))assert.deepEqual(bone.quaternion.toArray(),q.toArray(),`Changed non-cloth ${bone.name}`);assert.ok(Math.abs(bone.quaternion.length()-1)<1e-6);}
});
