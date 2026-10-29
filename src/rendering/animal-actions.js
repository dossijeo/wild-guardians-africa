import {animalFootSamples} from './animal-terrain-support.js';
import {sampleFixedPose} from './fixed-pose.js';
import {LoopOnce,LoopRepeat,Vector3,Matrix4} from 'three';
import {prepareWarthogHooves,plantWarthogHooves} from './warthog-hooves.js';
import {ANIMAL_ACTIONS} from '../simulation/animal-actions-data.js';

export function prepareAnimalModel(model,species){
  model.userData.beastSpecies=species;
  model.scale.setScalar(ANIMAL_ACTIONS.animals[species].presentation.scale);
  model.position.y=0;
  model.traverse(mesh=>{
    if(mesh.isMesh)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
      material.userData.beastSurface=true;
      material.userData.furLightingMask=species==='buffalo'&&!!mesh.geometry.getAttribute('_fur_light');
      if(species==='warthog')material.userData.warthogSurface=true;
    }
  });
  if(species==='warthog')prepareWarthogHooves(model);
  animalFootSamples(model); // Build contact indices during asset preparation, not its first visible frame.
  return model;
}

// Mirror native bestiary import: normalize timestamps and remove horizontal hip drift.
export function prepareAnimalClips(clips){
  return clips.map(original=>{
    const clip=original.clone(),start=Math.min(...clip.tracks.map(t=>t.times[0]));
    for(const track of clip.tracks){
      track.times=Float32Array.from(track.times,t=>t-start);
      if(/hips\.position$/i.test(track.name)){
        const x=track.values[0],z=track.values[2];let drift=0;
        for(let i=0;i<track.values.length;i+=3)drift=Math.max(drift,Math.hypot(track.values[i]-x,track.values[i+2]-z));
        if(drift>.04)for(let i=0;i<track.values.length;i+=3){track.values[i]=x;track.values[i+2]=z;}
      }
    }
    clip.resetDuration();return clip;
  });
}
export function animalPose(animal,elapsed){
  const attacking=animal.status==='attacking';
  const name=attacking?animal.animation:['entering','retreating'].includes(animal.status)?'Running':'Walking';
  const spec=ANIMAL_ACTIONS.animals[animal.species].clips[name];
  const time=attacking?Math.max(0,(animal.attackDuration??spec.duration)-animal.attackRemaining):animal.status==='waiting'&&!animal.path?0:(animal.motionPhase??elapsed);
  return {name,time:attacking?Math.min(time,spec.duration):time%spec.duration,loop:!attacking,key:attacking?animal.attackId:name};
}
export function applyAnimalPose(data,animal,elapsed){
  const pose=animalPose(animal,elapsed),clip=data.clips.find(c=>c.name===pose.name);
  if(!clip)throw new Error(`Falta la acción original ${animal.species}/${pose.name}`);
  const restart=data.key!==pose.key;
  if(restart){
    data.action?.stop();data.action=data.mixer.clipAction(clip);
    data.action.reset().setLoop(pose.loop?LoopRepeat:LoopOnce,pose.loop?Infinity:1).play();
    data.action.paused=true;data.action.clampWhenFinished=true;data.key=pose.key;data.name=pose.name;
  }
  const sampled=sampleFixedPose(data,pose.time,restart);if(sampled&&pose.name==='Walking')plantWarthogHooves(data.model);groundAnimal(data);return pose;
}
export function animalGroundSamples(model){
  const samples=[];
  model.traverse(mesh=>{
    if(!mesh.isSkinnedMesh)return;
    const positions=mesh.geometry.getAttribute('position');
    const indices=mesh.geometry.getAttribute('skinIndex'),weights=mesh.geometry.getAttribute('skinWeight');
    for(let i=0;i<positions.count;i+=2)if(positions.getY(i)<.45){
      let flexible=false;
      for(let j=0;j<4;j++)if(weights.getComponent(i,j)>.01&&/^(Tail_|ClothRear_)/.test(mesh.skeleton.bones[indices.getComponent(i,j)].name)){flexible=true;break;}
      // Loose cloth and tails may approach the floor; they never lift the body.
      if(!flexible)samples.push({mesh,index:i});
    }
  });
  return samples;
}
const vertex=new Vector3(),rootInverse=new Matrix4(),meshToRoot=new Matrix4();
function groundAnimal(data){
  const model=data.model;if(!model||!data.groundSamples?.length)return;
  model.position.y=0;model.parent?.updateWorldMatrix(true,false);model.updateMatrixWorld(true);
  if(model.parent)rootInverse.copy(model.parent.matrixWorld).invert();else rootInverse.identity();
  let min=Infinity,previousMesh=null;
  for(const {mesh,index} of data.groundSamples){
    // Samples are grouped by mesh. Compose its parent-relative transform once,
    // rather than taking every skinned vertex through world space and back.
    // Recompute if a caller supplies interleaved samples; no frame cache can
    // outlive a changed pose, parent transform, model scale or floating origin.
    if(mesh!==previousMesh){meshToRoot.multiplyMatrices(rootInverse,mesh.matrixWorld);previousMesh=mesh;}
    mesh.getVertexPosition(index,vertex);
    // Object transforms are affine, and grounding only needs local height.
    // Do not compute the unused X/Z coordinates or a homogeneous division.
    const e=meshToRoot.elements;min=Math.min(min,e[1]*vertex.x+e[5]*vertex.y+e[9]*vertex.z+e[13]);
  }
  if(min<.022*model.scale.y){model.position.y=.022*model.scale.y-min;model.updateMatrixWorld(true);}
}
