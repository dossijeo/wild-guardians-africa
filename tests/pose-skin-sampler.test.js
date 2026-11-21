import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3,Group} from 'three';
import {actorGeometry} from './helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {poseSkinSampler} from '../src/rendering/pose-skin-sampler.js';
for(const species of ['hyena','lion','warthog','buffalo','rhino'])test(`${species} one-pose sampler matches Three skin with morphs and transformed parent`,async()=>{
 const model=await actorGeometry(new URL('../public'+ANIMAL_ACTIONS.animals[species].url,import.meta.url));
 const parent=new Group();parent.position.set(91,7,-6);parent.rotation.set(.1,.4,-.2);parent.scale.set(1.1,.9,1.2);parent.add(model);
 model.traverse(n=>{if(n.isBone&&n.name==='Head')n.rotation.x+=.2;if(n.morphTargetInfluences)n.morphTargetInfluences.fill(.2);});
 parent.updateMatrixWorld(true);const expected=new Vector3(),actual=new Vector3();
 model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const sample=poseSkinSampler(mesh);
  for(let i=0;i<mesh.geometry.attributes.position.count;i++){mesh.getVertexPosition(i,expected).applyMatrix4(mesh.matrixWorld);sample(i,actual);assert.ok(actual.distanceTo(expected)<1e-9,`${mesh.name}:${i}`);}
 });
});
