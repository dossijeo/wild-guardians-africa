import test from 'node:test';
import assert from 'node:assert/strict';
import {actorGeometry} from './helpers/actor-geometry.js';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {studySmoothBodyNormals} from './browser/beast-normal-study.js';
test('buffalo normal study preserves geometry, UV, skin, morphs and restores original',async()=>{
 const model=await actorGeometry(new URL('../public'+ANIMAL_ACTIONS.animals.buffalo.url,import.meta.url)),mesh=model.getObjectByName('Mesh_0'),original=mesh.geometry;
 studySmoothBodyNormals(model);const changed=mesh.geometry;assert.notEqual(changed,original);
 assert.deepEqual(changed.index?.array,original.index?.array);
 for(const [name,attribute]of Object.entries(original.attributes))if(name!=='normal')assert.deepEqual(changed.attributes[name].array,attribute.array,name);
 for(const [name,attributes]of Object.entries(original.morphAttributes))for(let i=0;i<attributes.length;i++)assert.deepEqual(changed.morphAttributes[name][i].array,attributes[i].array,`morph ${name}/${i}`);
 assert.notDeepEqual(changed.attributes.normal.array,original.attributes.normal.array);
 studySmoothBodyNormals(model,true);assert.equal(mesh.geometry,original);
});
