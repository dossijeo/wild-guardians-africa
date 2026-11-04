import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BufferGeometry,Material,Skeleton} from 'three';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {createWorkerBeastPhysics} from '../src/simulation/worker-beast-physics.js';

test('failed worker physics initialization releases each rig resource once',async()=>{
 const originalFetch=globalThis.fetch,types=[BufferGeometry,Material,Skeleton],originalDispose=types.map(type=>type.prototype.dispose),disposals=new Map();
 for(const [i,type] of types.entries())type.prototype.dispose=function(){disposals.set(this,(disposals.get(this)??0)+1);return originalDispose[i].call(this);};
 try{
  for(const shareSpeciesRigs of [false,true])for(const failClips of [false,true]){
   disposals.clear();let animalRequests=0;
   globalThis.fetch=async path=>{
    if(path===ANIMAL_ACTIONS.animals.hyena.url&&++animalRequests===2&&failClips)return new Response('',{status:503});
    return new Response(await readFile(new URL('../public'+path,import.meta.url)));
   };
   const game={raid:{animals:[{id:'hyena-test',species:'hyena'}]},elapsed:0,structures:[]};
   await assert.rejects(createWorkerBeastPhysics(game,{}, {actorIds:['hyena-test'],structureTemplates:[],shareSpeciesRigs}),failClips?/Missing clip GLB/:/Invalid structure templates/);
   assert.ok(disposals.size>0,`no resources released: shared=${shareSpeciesRigs}, clips=${failClips}`);
   assert.ok([...disposals.values()].every(count=>count===1),`a resource was disposed more than once: shared=${shareSpeciesRigs}, clips=${failClips}`);
  }
 }finally{globalThis.fetch=originalFetch;for(const [i,type] of types.entries())type.prototype.dispose=originalDispose[i];}
});

test('disposal during admission releases the late rig once',async()=>{
 const originalFetch=globalThis.fetch,types=[BufferGeometry,Material,Skeleton],originalDispose=types.map(type=>type.prototype.dispose),disposals=new Map(),animalBytes=await readFile(new URL('../public'+ANIMAL_ACTIONS.animals.hyena.url,import.meta.url));
 for(const [i,type] of types.entries())type.prototype.dispose=function(){disposals.set(this,(disposals.get(this)??0)+1);return originalDispose[i].call(this);};
 try{
  for(const shareSpeciesRigs of [false,true]){
   disposals.clear();let releaseFetch,notifyStart,first=true;const started=new Promise(resolve=>{notifyStart=resolve;});
   globalThis.fetch=async path=>{
    if(path===ANIMAL_ACTIONS.animals.hyena.url&&first){first=false;notifyStart();return new Promise(resolve=>{releaseFetch=()=>resolve(new Response(animalBytes));});}
    return new Response(await readFile(new URL('../public'+path,import.meta.url)));
   };
   const game={raid:{animals:[{id:'hyena-test',species:'hyena'}]},elapsed:0,structures:[]},physics=await createWorkerBeastPhysics(game,{}, {actorIds:[],allowEmpty:true,shareSpeciesRigs});
   const admission=physics.admit('hyena-test');await started;physics.dispose();physics.dispose();releaseFetch();
   await assert.rejects(admission,/disposed/);assert.ok(disposals.size>0,`no resources released: shared=${shareSpeciesRigs}`);assert.ok([...disposals.values()].every(count=>count===1),`a resource was disposed more than once: shared=${shareSpeciesRigs}`);
  }
 }finally{globalThis.fetch=originalFetch;for(const [i,type] of types.entries())type.prototype.dispose=originalDispose[i];}
});
