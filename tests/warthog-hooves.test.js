import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AnimationMixer,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {rigForSampling} from '../tools/prepare_watering_emitters.mjs';
import {prepareAnimalModel,prepareAnimalClips,applyAnimalPose,animalGroundSamples} from '../src/rendering/animal-actions.js';

test('actual warthog: planted sole is level, swing is retained and repeated samples do not drift',async()=>{
 const library=JSON.parse(fs.readFileSync('public/content/animal-actions.json')).animals.warthog;
 const gltf=await new GLTFLoader().parseAsync(rigForSampling(fs.readFileSync('public'+library.url)),'');
 const model=prepareAnimalModel(gltf.scene,'warthog'),mesh=model.getObjectByName('Mesh_0_1');
 const data={model,mixer:new AnimationMixer(model),clips:prepareAnimalClips(gltf.animations),groundSamples:animalGroundSamples(model)};
 const animal={species:'warthog',status:'walking',motionPhase:0};
 const angle=ids=>{const p=ids.map(i=>mesh.getVertexPosition(i,new Vector3()).applyMatrix4(mesh.matrixWorld));return new Vector3().subVectors(p[1],p[0]).cross(new Vector3().subVectors(p[2],p[0])).normalize().angleTo(new Vector3(0,-1,0));};
 let swing=false;
 for(let frame=0;frame<120;frame++){
  animal.motionPhase=frame/120*library.clips.Walking.duration;applyAnimalPose(data,animal,0);
  const angles=[[15863,9505,1863],[10770,12498,9770]].map(angle);
  assert.ok(Math.min(...angles)<.001,'at least the supporting hoof must be level');
  swing ||= Math.max(...angles)>.3;
  const before=['LeftFoot','RightFoot'].map(n=>model.getObjectByName(n).quaternion.toArray());
  for(let i=0;i<3;i++)applyAnimalPose(data,animal,0);
  assert.deepEqual(['LeftFoot','RightFoot'].map(n=>model.getObjectByName(n).quaternion.toArray()),before);
 }
 assert.ok(swing,'lifted hoof must retain ankle articulation');
 animal.status='attacking';animal.animation='Right_Hand_Sword_Slash';animal.attackId=1;animal.attackDuration=library.clips[animal.animation].duration;animal.attackRemaining=animal.attackDuration;
 applyAnimalPose(data,animal,0);
 assert.ok(angle([15863,9505,1863])>.1,'attack pose is not flattened');
});
