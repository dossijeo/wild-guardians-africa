import test from 'node:test';
import assert from 'node:assert/strict';
import {AnimationMixer,Bone,BufferGeometry,Float32BufferAttribute,Group,Matrix4,MeshBasicMaterial,Skeleton,SkinnedMesh,Uint16BufferAttribute,Vector3} from 'three';
import {actorAsset} from './helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {prepareAnimalModel,prepareAnimalClips,animalGroundSamples,applyAnimalPose} from '../src/rendering/animal-actions.js';
import {animalFootSamples,supportAnimalOnTerrain} from '../src/rendering/animal-terrain-support.js';
import {GroundSkinSampler} from '../src/rendering/ground-skin-sampler.js';

for(const species of ['hyena','lion','warthog','buffalo','rhino'])test(`${species} cached skinning matches Three and both grounding passes across poses`,async()=>{
 const asset=await actorAsset(new URL('../public'+ANIMAL_ACTIONS.animals[species].url,import.meta.url)),model=prepareAnimalModel(asset.scene,species),root=new Group();root.add(model);root.position.set(4,0,3);
 const data={model,mixer:new AnimationMixer(model),clips:prepareAnimalClips(asset.animations),groundSamples:animalGroundSamples(model)},sampler=new GroundSkinSampler(),a=new Vector3(),inverse=new Matrix4(),relative=new Matrix4(),surface=(x,z)=>.2*(x-4)-.1*(z-3);
 let worst=0,checked=0;
 for(const clip of data.clips)for(let frame=0;frame<=6;frame++){
  root.rotation.y=frame%2?.7:-.7;root.updateMatrixWorld(true);const time=clip.duration*frame/6,animal={species,status:clip.name==='Walking'?'walking':clip.name==='Running'?'retreating':'attacking',animation:clip.name,motionPhase:time,attackDuration:clip.duration,attackRemaining:clip.duration-time,attackId:clip.name};
  data.cachedSkinning=false;applyAnimalPose(data,animal,time);supportAnimalOnTerrain(data,surface);const expected=model.position.y;
  data.cachedSkinning=2;applyAnimalPose(data,animal,time);supportAnimalOnTerrain(data,surface);assert.ok(Math.abs(expected-model.position.y)<1e-9,`${clip.name} frame ${frame} height`);
  model.updateWorldMatrix(true,true);inverse.copy(model.parent.matrixWorld).invert();let previous=null;for(const {mesh,index} of animalFootSamples(model)){if(mesh!==previous){relative.multiplyMatrices(inverse,mesh.matrixWorld);sampler.bind(mesh,relative);previous=mesh;}mesh.getVertexPosition(index,a);const e=relative.elements,height=e[1]*a.x+e[5]*a.y+e[9]*a.z+e[13];worst=Math.max(worst,Math.abs(height-sampler.height(index)));checked++;}
 }
 assert.ok(checked>100);assert.ok(worst<1e-10,`largest vertex error ${worst}`);
});

test('height-only skinning preserves morphs, unnormalized weights and nonaffine fallback',()=>{
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute([.5,.2,-.3],3));geometry.setAttribute('skinIndex',new Uint16BufferAttribute([0,1,0,0],4));geometry.setAttribute('skinWeight',new Float32BufferAttribute([.2,.3,0,0],4));geometry.morphAttributes.position=[new Float32BufferAttribute([.7,.4,-.1],3)];
 const mesh=new SkinnedMesh(geometry,new MeshBasicMaterial()),root=new Group(),a=new Bone(),b=new Bone();a.position.set(1,2,0);b.position.set(-1,0,2);root.add(mesh,a,b);mesh.updateMorphTargets();mesh.morphTargetInfluences[0]=.4;root.updateMatrixWorld(true);mesh.bind(new Skeleton([a,b]),new Matrix4().makeTranslation(.3,.2,.1));a.rotation.z=.3;b.position.y=.4;root.rotation.set(.2,.8,-.15);root.scale.set(.7,1.4,1.2);root.updateMatrixWorld(true);
 const sampler=new GroundSkinSampler(),relative=mesh.matrixWorld.clone(),point=new Vector3();
 for(const nonaffine of [false,true]){if(nonaffine)mesh.bindMatrixInverse.elements[3]=.02;sampler.bind(mesh,relative);mesh.getVertexPosition(0,point);const e=relative.elements,expected=e[1]*point.x+e[5]*point.y+e[9]*point.z+e[13];assert.ok(Math.abs(sampler.height(0)-expected)<1e-10);if(nonaffine)assert.equal(sampler.fast,false);}
 geometry.dispose();mesh.material.dispose();
});
