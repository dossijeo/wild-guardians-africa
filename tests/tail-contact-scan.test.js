import test from 'node:test';
import assert from 'node:assert/strict';
import {actorGeometry} from './helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {isTailContactVertex,tailContactPredicate} from '../src/rendering/beast-ground-contact.js';
for(const species of ['hyena','lion','warthog','buffalo','rhino'])test(`${species} batched tail classification matches every original skin vertex`,async()=>{
 const model=await actorGeometry(new URL('../public'+ANIMAL_ACTIONS.animals[species].url,import.meta.url));
 model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const predicate=tailContactPredicate(mesh);
  for(let i=0;i<mesh.geometry.attributes.position.count;i++)assert.equal(predicate(i),isTailContactVertex(mesh,i),`${mesh.name} vertex ${i}`);
 });
});
