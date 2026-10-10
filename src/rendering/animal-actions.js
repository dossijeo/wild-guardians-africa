import {sampleFixedPose} from './fixed-pose.js';
import {LoopOnce,LoopRepeat,Vector3,Matrix4} from 'three';
import {ANIMAL_ACTIONS} from '../simulation/animal-actions-data.js';

export function prepareAnimalModel(model,species){
  model.scale.setScalar(ANIMAL_ACTIONS.animals[species].presentation.scale);
  model.position.y=0;
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
  sampleFixedPose(data,pose.time,restart);groundAnimal(data);return pose;
}
export function animalGroundSamples(model){
  const samples=[];
  model.traverse(mesh=>{
    if(!mesh.isSkinnedMesh)return;
    const positions=mesh.geometry.getAttribute('position');
    for(let i=0;i<positions.count;i+=2)if(positions.getY(i)<.45)samples.push({mesh,index:i});
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
