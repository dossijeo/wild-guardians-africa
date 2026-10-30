import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import test from 'node:test';
import {isTailContactVertex} from '../src/rendering/beast-ground-contact.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AnimationClip,AnimationMixer,LoopOnce,Vector3,Quaternion} from 'three';
import {actorGeometry} from './helpers/actor-geometry.js';

for(const species of ['hyena','lion','warthog','buffalo','rhino'])test(`authored ${species} get-up preserves limb lengths and clears all non-tail skin`,async()=>{
 const data=JSON.parse(fs.readFileSync(new URL(`../content/source/animations/stand-up/${species}-candidate.json`,import.meta.url))),model=await actorGeometry(new URL(['hyena','lion'].includes(species)?`../content/source/actors/${species}/expressive-candidate.glb`:'../public'+ANIMAL_ACTIONS.animals[species].url,import.meta.url)),clip=AnimationClip.parse(data.clip),mixer=new AnimationMixer(model),action=mixer.clipAction(clip).setLoop(LoopOnce,1);
 action.clampWhenFinished=true;action.play();const bones=[],meshes=[];model.traverse(o=>{if(o.isBone)bones.push({bone:o,length:o.position.length()});if(o.isSkinnedMesh)meshes.push(o);});
 const qa=new Quaternion(),qb=new Quaternion();let maxArmStep=0,armChannel='';
 for(const track of clip.tracks)if(/(?:Arm|Hand)\.quaternion$/.test(track.name))for(let i=4;i<track.values.length;i+=4){qa.fromArray(track.values,i-4).normalize();qb.fromArray(track.values,i).normalize();const step=qa.angleTo(qb);if(step>maxArmStep){maxArmStep=step;armChannel=track.name;}}
 if(species==='warthog')for(const track of clip.tracks)if(/(?:UpLeg|Leg)\.quaternion$/.test(track.name))for(let i=4;i<track.values.length;i+=4){qa.fromArray(track.values,i-4).normalize();qb.fromArray(track.values,i).normalize();assert.ok(qa.angleTo(qb)<.20001,'Unbounded warthog knee transition');}
 // A 20-degree source-frame ceiling rejects the former 94/140-degree pole flips.

 assert.equal(data.mappedBones.length,['hyena','warthog'].includes(species)?21:23);assert.ok(clip.duration>8&&clip.duration<8.3);
 const point=new Vector3(),hip=model.getObjectByName('Hips'),previous=new Vector3();let worstFloor=0,maxHipStep=0,standingFootGap=0,supineFootGap=0;
 for(let frame=0;frame<=Math.ceil(clip.duration*60);frame++){
  action.paused=false;mixer.setTime(Math.min(clip.duration,frame/60));model.updateMatrixWorld(true);
  for(const {bone,length}of bones){if(bone!==hip)assert.ok(Math.abs(bone.position.length()-length)<1e-6,`Stretched ${bone.name}`);assert.ok(Math.abs(bone.quaternion.length()-1)<1e-5,`Invalid rotation ${bone.name}`);}
  hip.getWorldPosition(point);if(frame)maxHipStep=Math.max(maxHipStep,point.distanceTo(previous));previous.copy(point);
  // Full vertices, not the author's reduced contact set; catch omitted surface.
  if(frame%12===0){let feet=Infinity;for(const mesh of meshes)for(let i=0;i<mesh.geometry.attributes.position.count;i++){if(isTailContactVertex(mesh,i))continue;mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld);worstFloor=Math.min(worstFloor,point.y);const {skinIndex:indices,skinWeight:weights}=mesh.geometry.attributes;let best=0;for(let k=1;k<4;k++)if(weights.getComponent(i,k)>weights.getComponent(i,best))best=k;if(/Foot|Toe/.test(mesh.skeleton.bones[indices.getComponent(i,best)].name))feet=Math.min(feet,point.y);}if(frame/60>=6)standingFootGap=Math.max(standingFootGap,feet);if(frame/60<=2)supineFootGap=Math.max(supineFootGap,feet);}
 }
 assert.ok(worstFloor>-.025,`Skin penetration ${worstFloor}m`);
 assert.ok(supineFootGap<.04,`Supine feet hover ${supineFootGap}m`);
 assert.ok(standingFootGap<.025,`Standing feet hover ${standingFootGap}m`);
 assert.ok(maxArmStep<Math.PI/9,`Abrupt support rotation ${armChannel}: ${maxArmStep}rad/frame`);
 assert.ok(maxHipStep<.08,`Hip discontinuity ${maxHipStep}m/frame`);
});
