import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Vector3} from 'three';
import {actorGeometry} from './helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {animalFootSamples,supportAnimalOnTerrain} from '../src/rendering/animal-terrain-support.js';
for(const species of ['hyena','lion','warthog','buffalo','rhino'])test(`${species} sampled feet clear a sloping plane without cumulative lifting`,async()=>{
 const model=await actorGeometry(new URL('../public'+ANIMAL_ACTIONS.animals[species].url,import.meta.url)),root=new Group();model.scale.setScalar(ANIMAL_ACTIONS.animals[species].presentation.scale);root.add(model);root.position.set(4,0,3);root.rotation.y=.7;root.updateMatrixWorld(true);
 const surface=(x,z)=>.2*(x-4)-.1*(z-3),samples=animalFootSamples(model),p=new Vector3();assert.ok(samples.length>0&&samples.length<600);
 const before=model.position.clone(),lift=supportAnimalOnTerrain({model},surface);assert.ok(lift>=0);
 let minimum=Infinity;for(const {mesh,index}of samples){mesh.getVertexPosition(index,p).applyMatrix4(mesh.matrixWorld);minimum=Math.min(minimum,p.y-surface(p.x,p.z));}assert.ok(minimum>=.01-1e-6);
 let allMinimum=Infinity;model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const a=mesh.geometry.attributes;for(let i=0;i<a.position.count;i++){let foot=0;for(let k=0;k<4;k++)if(/(?:Foot|ToeBase)$/.test(mesh.skeleton.bones[a.skinIndex.getComponent(i,k)].name))foot+=a.skinWeight.getComponent(i,k);if(foot<=.5)continue;mesh.getVertexPosition(i,p).applyMatrix4(mesh.matrixWorld);allMinimum=Math.min(allMinimum,p.y-surface(p.x,p.z));}});assert.ok(allMinimum>=-.005,`Unsampled foot penetration ${allMinimum}`);
 const supported=model.position.clone();assert.ok(supportAnimalOnTerrain({model},surface)<1e-6);assert.ok(model.position.distanceTo(supported)<1e-6);
 model.position.copy(before);model.updateMatrixWorld(true);assert.ok(Math.abs(supportAnimalOnTerrain({model},surface)-lift)<1e-6);
});
