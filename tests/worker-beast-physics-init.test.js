import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BufferGeometry,Material,Skeleton} from 'three';
import {ANIMAL_ACTIONS} from '../src/simulation/animal-actions-data.js';
import {createWorkerBeastPhysics} from '../src/simulation/worker-beast-physics.js';
import {BeastRecoveryExit} from '../src/rendering/beast-recovery-exit.js';

test('failed worker physics initialization releases each rig resource once',async()=>{
 const originalFetch=globalThis.fetch,types=[BufferGeometry,Material,Skeleton],originalDispose=types.map(type=>type.prototype.dispose),disposals=new Map();
 for(const [i,type] of types.entries())type.prototype.dispose=function(){disposals.set(this,(disposals.get(this)??0)+1);return originalDispose[i].call(this);};
 try{
  for(const shareSpeciesRigs of [false,true])for(const shareAdmissionSource of [false,true])for(const failClips of [false,true]){
   disposals.clear();let animalRequests=0;
   globalThis.fetch=async path=>{
    const bytes=await readFile(new URL('../public'+path,import.meta.url));
    if(path===ANIMAL_ACTIONS.animals.hyena.url){animalRequests++;if(failClips){const marker=Buffer.from('"path":"translation"'),offset=bytes.indexOf(marker);assert.notEqual(offset,-1);bytes.write('badproperty',offset+'"path":"'.length,'ascii');}}
    return new Response(bytes);
   };
   const game={raid:{animals:[{id:'hyena-test',species:'hyena'}]},elapsed:0,structures:[]};
   await assert.rejects(createWorkerBeastPhysics(game,{}, {actorIds:['hyena-test'],structureTemplates:[],shareSpeciesRigs,shareAdmissionSource}),failClips?/Unsupported animation channel/:/Invalid structure templates/);
   assert.equal(animalRequests,!shareSpeciesRigs&&shareAdmissionSource?1:2);
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

test('a recovery exit is published as visual pose until its existing blend ends',async()=>{
 const originalFetch=globalThis.fetch,animal={id:'hyena-test',species:'hyena',status:'walking',x:2,z:3,heading:0},game={raid:{animals:[animal]},elapsed:10,structures:[]};
 globalThis.fetch=async path=>new Response(await readFile(new URL('../public'+path,import.meta.url)));
 let physics;
 try{
  physics=await createWorkerBeastPhysics(game,{actorSurface:()=>0},{actorIds:[animal.id]});
  const rig=physics.manager.world.mixers.get(animal.id),root=physics.manager.world.objects.get(animal.id);root.position.set(animal.x,0,animal.z);root.updateMatrixWorld(true);
  rig.recoveryExit=new BeastRecoveryExit(rig.model,game.elapsed);
  const initial=physics.poses({activeOnly:true});assert.equal(initial.length,1);assert.equal(initial[0].actorId,animal.id);assert.equal(initial[0].active,true);assert.equal(initial[0].visualTransition,'recovery-exit');assert.equal(initial[0].root[0],animal.x);assert.equal(initial[0].root[2],animal.z);
  game.elapsed+=.31;assert.deepEqual(physics.poses({activeOnly:true}),[]);assert.equal(rig.recoveryExit,undefined);
 }finally{physics?.dispose();globalThis.fetch=originalFetch;}
});
