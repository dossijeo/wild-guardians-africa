import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeTaskConsequenceGraphicsFixture} from './helpers/native-task-consequence-graphics.js';

test('Carry can prepare from the authored rig while rendering still retains the retired historical materials',async()=>{
 const f=await nativeTaskConsequenceGraphicsFixture({historicalSource:true});
 let part;
 try{
  const actor=f.roster.get(f.actor),retirement=f.historicalMaterials;
  assert(retirement.size>0);
  assert([...retirement.values()].every(count=>count===0));
  assert(f.historicalMeshes.every(({mesh,material})=>mesh.material!==material));
  // Reproduce an original source still showing a previously composed material
  // while the current scoped action owns only its baked meshes.
  const [{mesh,material}]=f.historicalMeshes,authored=mesh.material;
  mesh.material=material;
  part=await f.roster.prepareNativeTaskConsequenceProposal(f.support,{getPickTime:f.getPickTime});
  assert(part.valid());
  assert.equal(mesh.material,material);
  assert.equal(f.roster.get(f.actor),actor);
  assert.equal(f.state.crates.length,0);
  assert.equal(part.request.options.include.filter(mesh=>mesh._wgWalkAttachmentIndex!==undefined).length,9);
  assert([...retirement.values()].every(count=>count===0));
  part.activate();part.rollback();assert(part.valid());
  f.flush();
  assert([...retirement.values()].every(count=>count===1));
  assert.equal(mesh.material,authored);
  assert(part.valid());
 }finally{part?.cancel();f.close();}
});

test('the native consequence prepares original Carry and nine crate pieces on its resident action actor, and can roll back before commit',async()=>{
 const f=await nativeTaskConsequenceGraphicsFixture();let part;try{const actor=f.roster.get(f.actor),root=actor.root,oldRootMeshes=[];root.traverse(mesh=>{if(mesh.isMesh)oldRootMeshes.push({mesh,geometry:mesh.geometry,material:mesh.material,visible:mesh.visible});});assert.equal(f.carries,0);assert.equal(actor.hasBakedCarrying(),false);part=await f.roster.prepareNativeTaskConsequenceProposal(f.support,{getPickTime:f.getPickTime});assert.equal(f.carries,1);assert.equal(f.acquires,1);assert.equal(f.roster.get(f.actor),actor);assert.equal(actor.root,root);assert.equal(f.state.crates.length,0);assert(part.valid());
  const pieces=part.request.options.include.filter(mesh=>mesh._wgWalkAttachmentIndex!==undefined);assert.equal(pieces.length,9);assert(pieces.every(mesh=>!mesh.visible));part.activate();assert(actor.isBakedCarrying());assert(pieces.every(mesh=>mesh.visible));part.rollback();assert(part.valid());assert.equal(actor.isBakedCarrying(),false);assert(pieces.every(mesh=>!mesh.visible));for(const item of oldRootMeshes){assert.equal(item.mesh.geometry,item.geometry);assert.equal(item.mesh.material,item.material);assert.equal(item.mesh.visible,item.visible);}part.activate();const data=f.commit();part.finalize(data);f.flush();assert(actor.isBakedCarrying());assert.equal(f.roster.get(f.actor),actor);assert.equal(f.roster.status().nativePreparing,0);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});

test('a foreign consequence proof cannot finalize the Carry candidate and cancelling preserves its native action actor',async()=>{
 const f=await nativeTaskConsequenceGraphicsFixture();let part;try{const actor=f.roster.get(f.actor);part=await f.roster.prepareNativeTaskConsequenceProposal(f.support,{getPickTime:f.getPickTime});part.activate();const data=f.commit(),foreign=structuredClone(data);foreign.nativeTaskConsequenceBinding.reference.crateId++;foreign.nativeTaskConsequenceBinding.preparedReference.crateId++;assert.throws(()=>part.validateCommit(foreign),/committed resources/);assert(part.valid());part.rollback();assert(part.cancel());f.flush();assert.equal(f.roster.get(f.actor),actor);assert.equal(actor.isBakedCarrying(),false);assert.equal(f.roster.status().native,1);assert.deepEqual(f.errors,[]);}finally{part?.cancel();f.close();}
});

test('only a prepared Carry leaves its compiled materials resident while a fresh binding is admitted',async()=>{
 const f=await nativeTaskConsequenceGraphicsFixture();let early,ready,next;
 try{
  const actor=f.roster.get(f.actor),options={getPickTime:f.getPickTime};
  const observe=part=>{
   const seen=new Map();
   for(const {material} of part.request.options.materialAlternatives){
    for(const value of [material].flat()){
     if(seen.has(value))continue;
     seen.set(value,0);
     value.addEventListener('dispose',()=>seen.set(value,seen.get(value)+1));
    }
   }
   assert(seen.size>0);
   return seen;
  };
  early=await f.roster.prepareNativeTaskConsequenceProposal(f.support,options);
  const unprepared=observe(early);
  assert.throws(()=>early.markReady(),/Carry frame is unavailable/);
  assert(early.cancel());f.flush();
  assert([...unprepared.values()].every(count=>count===1));

  ready=await f.roster.prepareNativeTaskConsequenceProposal(f.support,options);
  const resident=observe(ready);
  ready.activate();ready.markReady();assert(ready.cancel());f.flush();
  assert([...resident.values()].every(count=>count===0));
  assert.equal(actor.isBakedCarrying(),false);
  assert.equal(ready.valid(),false);
  assert.equal(f.roster.get(f.actor),actor);

  next=await f.roster.prepareNativeTaskConsequenceProposal(f.support,options);
  assert([...observe(next).keys()].every(material=>!resident.has(material)));
  next.activate();next.markReady();next.finalize(f.commit());
  assert.equal(actor.isBakedCarrying(),true);
  assert([...resident.values()].every(count=>count===0));
  f.flush();
  assert([...resident.values()].every(count=>count===1));
  f.state.workers=[];f.roster.sync();f.flush();
  assert([...resident.values()].every(count=>count===1));
  assert.deepEqual(f.errors,[]);
 }finally{next?.cancel();ready?.cancel();early?.cancel();f.close();}
});
