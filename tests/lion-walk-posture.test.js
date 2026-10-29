import test from 'node:test';
import assert from 'node:assert/strict';
import {AnimationMixer,Vector3,Quaternion,Group} from 'three';
import {actorAsset} from './helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {prepareAnimalModel,prepareAnimalClips,applyAnimalPose} from '../src/rendering/animal-actions.js';

test('lion walking shifts upper torso forward without moving feet, accumulating, or altering running',async()=>{
 const rigs=[];
 for(let i=0;i<2;i++){
  const asset=await actorAsset(new URL('../public'+ANIMAL_ACTIONS.animals.lion.url,import.meta.url)),model=prepareAnimalModel(asset.scene,'lion'),root=new Group();root.rotation.y=.7;root.add(model);
  if(i===0)model.userData.beastSpecies='reference';
  rigs.push({model,mixer:new AnimationMixer(model),clips:prepareAnimalClips(asset.animations)});
 }
 const positions=(d,n)=>d.model.getObjectByName(n).getWorldPosition(new Vector3()),q=new Quaternion();
 for(let i=0;i<13;i++){
  const animal={species:'lion',status:'walking',motionPhase:i*.1};
  for(const d of rigs){applyAnimalPose(d,animal,0);d.model.updateWorldMatrix(true,true);}
  for(const name of ['Hips','LeftFoot','RightFoot'])assert.ok(positions(rigs[0],name).distanceTo(positions(rigs[1],name))<1e-7,name);
  const forward=new Vector3(0,0,1).applyQuaternion(rigs[1].model.getWorldQuaternion(q));
  assert.ok(positions(rigs[1],'Neck').sub(positions(rigs[0],'Neck')).dot(forward)>.01,'Neck must move forward');
  const before=positions(rigs[1],'Head');applyAnimalPose(rigs[1],animal,0);assert.ok(before.distanceTo(positions(rigs[1],'Head'))<1e-7,'Repeated frame accumulates');
 }
 for(const clip of rigs[0].clips.filter(c=>c.name!=='Walking')){
  const spec=ANIMAL_ACTIONS.animals.lion.clips[clip.name],animal=clip.name==='Running'?{species:'lion',status:'retreating',motionPhase:.4}:{species:'lion',status:'attacking',animation:clip.name,attackId:clip.name,attackRemaining:spec.duration-.4};
  for(const d of rigs){applyAnimalPose(d,animal,0);d.model.updateWorldMatrix(true,true);}
  for(const name of ['Hips','Spine','Neck','Head','LeftFoot','RightFoot'])assert.ok(positions(rigs[0],name).distanceTo(positions(rigs[1],name))<1e-7,clip.name+' changed '+name);
 }
});

import {balanceLionWalk,LION_WALK_LEAN} from '../src/rendering/lion-walk-posture.js';
test('local walking correction matches world-space reference without full-rig matrix updates',async()=>{
 const asset=await actorAsset(new URL('../public'+ANIMAL_ACTIONS.animals.lion.url,import.meta.url)),model=prepareAnimalModel(asset.scene,'lion'),root=new Group();root.add(model);
 const d={model,mixer:new AnimationMixer(model),clips:prepareAnimalClips(asset.animations)},spine=model.getObjectByName('Spine1'),axis=new Vector3(),mq=new Quaternion(),pq=new Quaternion(),expected=new Quaternion(),rotation=new Quaternion();
 for(let i=0;i<13;i++){
  model.userData.beastSpecies='reference';root.rotation.set(.1,i*.4,-.07);applyAnimalPose(d,{species:'lion',status:'walking',motionPhase:i*.1},0);root.updateMatrixWorld(true);
  model.getWorldQuaternion(mq);spine.parent.getWorldQuaternion(pq).invert();axis.set(1,0,0).applyQuaternion(mq).applyQuaternion(pq).normalize();expected.copy(spine.quaternion).premultiply(rotation.setFromAxisAngle(axis,LION_WALK_LEAN));
  let updates=0;const update=model.updateMatrixWorld,worldUpdate=model.updateWorldMatrix;
  model.updateMatrixWorld=function(...args){updates++;return update.apply(this,args);};model.updateWorldMatrix=function(...args){updates++;return worldUpdate.apply(this,args);};
  model.userData.beastSpecies='lion';balanceLionWalk(model);
  model.updateMatrixWorld=update;model.updateWorldMatrix=worldUpdate;
  assert.ok(spine.quaternion.clone().normalize().angleTo(expected.clone().normalize())<1e-7,'Different corrected orientation '+spine.quaternion.clone().normalize().angleTo(expected.clone().normalize()));assert.equal(updates,0,'Correction traversed the full rig');
 }
});


