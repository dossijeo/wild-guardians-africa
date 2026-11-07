import test from 'node:test';
import assert from 'node:assert/strict';
import {BoxGeometry,Group,Mesh,MeshBasicMaterial} from 'three';
import {prepareCharacterPreload} from '../src/rendering/character-preload.js';

function model(){const root=new Group();root.add(new Mesh(new BoxGeometry(),new MeshBasicMaterial()));return root;}
test('character primer removes temporary rigs while keeping warmed LOD materials independently owned',async()=>{
 const staging=new Group(),animal=model();animal.userData.beastSpecies='hyena';staging.add(animal);
 const assets={model:async()=>({scene:model()})};
 const primer=await prepareCharacterPreload({assets,staging,animalRigs:[{model:animal}],workerLibraries:{youngMale:{url:'/worker.glb'}},nextFrame:async()=>{}});
 assert.equal(primer.actors,2);assert.equal(primer.lods,2);assert.equal(staging.children.length,4);
 primer.release(true);assert.equal(staging.children.length,1);assert.equal(staging.children[0],animal);assert.equal(primer.materials.length,2);
 let disposed=0;for(const material of primer.materials){material.addEventListener('dispose',()=>disposed++);material.dispose();}assert.equal(disposed,2);primer.release(true);assert.equal(staging.children.length,1);
});
test('character primer releases partial work on cancellation',async()=>{
 const staging=new Group();let stopped=false;
 await assert.rejects(prepareCharacterPreload({assets:{model:async()=>({scene:model()})},staging,animalRigs:[],workerLibraries:{youngMale:{url:'/worker.glb'},olderMale:{url:'/other.glb'}},nextFrame:async()=>{if(staging.children.length)stopped=true;},cancelled:()=>stopped}),/cancelled/);
 assert.equal(staging.children.length,0);
});
