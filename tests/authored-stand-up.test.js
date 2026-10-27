import test from 'node:test';
import {isTailContactVertex} from '../src/rendering/beast-ground-contact.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AnimationClip,AnimationMixer,LoopOnce,Vector3} from 'three';
import {actorGeometry} from './helpers/actor-geometry.js';

for(const species of ['hyena','lion'])test(`authored ${species} get-up preserves limb lengths and clears all non-tail skin`,async()=>{
 const data=JSON.parse(fs.readFileSync(new URL(`../content/source/animations/stand-up/${species}-candidate.json`,import.meta.url))),model=await actorGeometry(new URL(`../content/source/actors/${species}/expressive-candidate.glb`,import.meta.url)),clip=AnimationClip.parse(data.clip),mixer=new AnimationMixer(model),action=mixer.clipAction(clip).setLoop(LoopOnce,1);
 action.clampWhenFinished=true;action.play();const bones=[],meshes=[];model.traverse(o=>{if(o.isBone)bones.push({bone:o,length:o.position.length()});if(o.isSkinnedMesh)meshes.push(o);});
 assert.equal(data.mappedBones.length,species==='hyena'?21:23);assert.ok(clip.duration>8&&clip.duration<8.3);
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
 assert.ok(maxHipStep<.08,`Hip discontinuity ${maxHipStep}m/frame`);
});
