import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Vector3} from 'three';
import {actorGeometry} from './helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {SkinContactBounds} from '../src/rendering/skin-contact-bounds.js';
import {isTailContactVertex} from '../src/rendering/beast-ground-contact.js';
for(const species of ['hyena','lion','warthog','buffalo','rhino'])test(`${species} optimized skin bounds match Three including transforms and morphs`,async()=>{
 const model=await actorGeometry(new URL('../public'+ANIMAL_ACTIONS.animals[species].url,import.meta.url));model.position.set(12,3,-7);model.rotation.set(.1,.7,-.2);model.scale.setScalar(.83);
 const bounds=new SkinContactBounds(model),p=new Vector3();
 for(const morphed of [false,true]){
  model.traverse(o=>{if(o.isBone&&/Arm|Leg|Head/.test(o.name))o.rotation.z+=.23;if(morphed&&o.morphTargetInfluences)o.morphTargetInfluences.fill(.3);});model.updateMatrixWorld(true);
  const expected=new Box3(),actual=bounds.expand(new Box3());
  model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;for(let i=0;i<mesh.geometry.attributes.position.count;i++){if(isTailContactVertex(mesh,i))continue;mesh.getVertexPosition(i,p).applyMatrix4(mesh.matrixWorld);expected.expandByPoint(p);}});
  assert.ok(actual.min.distanceTo(expected.min)<1e-6);assert.ok(actual.max.distanceTo(expected.max)<1e-6);
 }
});
