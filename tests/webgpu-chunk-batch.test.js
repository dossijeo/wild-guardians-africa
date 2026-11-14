import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Scene,Mesh} from 'three';
import {createChunkPublicationCoordinator} from '../src/rendering/webgpu-chunk-publication.js';

function fixture(){
 const calls=[],errors=[],scene=new Scene();let valid=true,validations=0;const admission={prepareManyAndPublish(){throw Error('unexpected');},async prepareTicket(){return {valid:()=>{validations++;return valid;}};}},coordinator=createChunkPublicationCoordinator({admission,onError:error=>errors.push(error.message)});
 function part(key,side,extra={}){const controller=new AbortController(),name=key+':'+side,object=new Group();return {key,side,epoch:'e',revision:1,publicationOrder:1,object,signal:controller.signal,eventRoots(){return [object];},activate(){calls.push('activate '+name);return true;},attach(){calls.push('attach '+name);},rollback(){calls.push('rollback '+name);},finalize(){calls.push('finalize '+name);return {retire:()=>calls.push('retire '+name),notify:()=>calls.push('notify '+name)};},rollbackFinalized(){calls.push('undo '+name);},cancel(){calls.push('cancel '+name);},...extra};}
 return {coordinator,calls,errors,scene,part,get validations(){return validations;},invalidate(){valid=false;}};
}
test('batch prepares all chunks before ordered publication and notifications',async()=>{
 const f=fixture(),parts=['0,0','1,0'].flatMap(key=>['terrain','biome'].map(side=>f.part(key,side))),batch=await f.coordinator.prepareBatch(parts,{scene:f.scene});assert.deepEqual(f.calls,[]);assert.equal(batch.commit(),true);assert.deepEqual(f.calls.map(call=>call.split(' ')[0]),['activate','activate','activate','activate','attach','attach','attach','attach','finalize','finalize','finalize','finalize','retire','retire','retire','retire','notify','notify','notify','notify']);assert.deepEqual(f.errors,[]);f.coordinator.dispose();
});
test('batch rolls back all finalizations and attachments before cancelling on failure',async()=>{
 const f=fixture(),parts=['0,0','1,0'].flatMap(key=>['terrain','biome'].map(side=>f.part(key,side)));parts[3].finalize=()=>{f.calls.push('failed finalize');throw Error('failed');};const batch=await f.coordinator.prepareBatch(parts,{scene:f.scene});assert.throws(()=>batch.commit(),/failed/);assert.equal(f.calls.some(call=>call.startsWith('notify')),false);assert.deepEqual(f.calls.filter(call=>call.startsWith('undo ')),['undo 1,0:biome','undo 1,0:terrain','undo 0,0:biome','undo 0,0:terrain']);assert.deepEqual(f.calls.filter(call=>call.startsWith('rollback ')),['rollback 1,0:biome','rollback 1,0:terrain','rollback 0,0:biome','rollback 0,0:terrain']);assert.equal(f.calls.filter(call=>call.startsWith('cancel ')).length,4);f.coordinator.dispose();
});
test('newer offer cancels a prepared batch without publishing it',async()=>{
 const f=fixture(),parts=['terrain','biome'].map(side=>f.part('0,0',side)),batch=await f.coordinator.prepareBatch(parts,{scene:f.scene}),next=f.part('0,0','terrain',{revision:2,publicationOrder:2,onError(){}});f.coordinator.offer(next);assert.throws(()=>batch.commit(),/stale/);assert.deepEqual(f.calls,['cancel 0,0:biome','cancel 0,0:terrain']);f.coordinator.dispose();
});
test('stale admission tickets cancel all participants before activation',async()=>{
 const f=fixture(),parts=['terrain','biome'].map(side=>f.part('0,0',side)),batch=await f.coordinator.prepareBatch(parts,{scene:f.scene});f.invalidate();assert.throws(()=>batch.commit(),/stale/);assert.deepEqual(f.calls,['cancel 0,0:biome','cancel 0,0:terrain']);f.coordinator.dispose();
});
test('a ticket invalidated during attachment rolls back before notifications',async()=>{
 const f=fixture(),parts=['terrain','biome'].map(side=>f.part('0,0',side));parts[0].attach=()=>{f.calls.push('attach terrain');f.invalidate();};const batch=await f.coordinator.prepareBatch(parts,{scene:f.scene});assert.throws(()=>batch.commit(),/stale/);assert.ok(f.calls.includes('rollback 0,0:terrain'));assert.equal(f.calls.some(call=>call.startsWith('notify')),false);assert.equal(f.calls.filter(call=>call.startsWith('cancel ')).length,2);f.coordinator.dispose();
});
test('listeners registered after admission reject the batch before activation',async()=>{
 const f=fixture(),parts=['terrain','biome'].map(side=>f.part('0,0',side)),batch=await f.coordinator.prepareBatch(parts,{scene:f.scene});let observed=0;f.scene.addEventListener('childadded',()=>observed++);assert.throws(()=>batch.commit(),/synchronous childadded observer/);assert.equal(observed,0);assert.equal(f.calls.some(call=>call.startsWith('activate')),false);assert.equal(f.calls.filter(call=>call.startsWith('cancel ')).length,2);f.coordinator.dispose();
});
test('an observer on a retiring tree blocks the batch, unrelated trees do not',async()=>{
 const f=fixture(),old=new Group(),child=new Mesh(),unrelated=new Group(),parts=['terrain','biome'].map(side=>f.part('0,0',side));old.add(child);f.scene.add(old,unrelated);unrelated.addEventListener('removed',()=>{});parts[0].eventRoots=()=>[parts[0].object,old];const batch=await f.coordinator.prepareBatch(parts,{scene:f.scene});child.addEventListener('removed',()=>{});assert.throws(()=>batch.commit(),/synchronous removed observer/);assert.equal(f.calls.some(call=>call.startsWith('activate')),false);f.coordinator.dispose();child.geometry.dispose();child.material.dispose();
});

test('prepared batch validity observes the actual admission tickets and ownership lifetime',async()=>{
 const f=fixture(),parts=['terrain','biome'].map(side=>f.part('0,0',side)),batch=await f.coordinator.prepareBatch(parts,{scene:f.scene});
 assert.equal(batch.valid(),true);assert.deepEqual(f.calls,[]);f.invalidate();assert.equal(batch.valid(),false);batch.abort();assert.equal(batch.valid(),false);f.coordinator.dispose();
 const g=fixture(),committed=await g.coordinator.prepareBatch(['terrain','biome'].map(side=>g.part('0,0',side)),{scene:g.scene});assert.equal(committed.valid(),true);assert.equal(committed.commit(),true);assert.equal(committed.valid(),false);g.coordinator.dispose();
});

test('complete ticket validation scales with the batch size across reversible commit phases',async()=>{
 for(const size of [2,20]){const f=fixture(),parts=Array.from({length:size},(_,index)=>['terrain','biome'].map(side=>f.part(index+',0',side))).flat();try{
  const batch=await f.coordinator.prepareBatch(parts,{scene:f.scene}),before=f.validations;
  assert.equal(batch.commit(),true);
  assert(f.validations-before<=4*parts.length,'a commit must not rescan the full ticket set after each participant');
  assert.equal(f.calls.filter(call=>call.startsWith('retire ')).length,parts.length);
  assert.equal(f.calls.filter(call=>call.startsWith('notify ')).length,parts.length);
 }finally{f.coordinator.dispose();}}
});

for(const phase of ['activate','attach','finalize'])test(`cross-participant ticket invalidation in ${phase} rolls back before the next phase or retirement`,async()=>{
 const f=fixture(),parts=['0,0','1,0'].flatMap(key=>['terrain','biome'].map(side=>f.part(key,side)));try{
  const run=parts[0][phase];parts[0][phase]=()=>{const result=run();f.invalidate();return result;};
  const batch=await f.coordinator.prepareBatch(parts,{scene:f.scene});assert.throws(()=>batch.commit(),/stale/);
  const next=phase==='activate'?'attach ':phase==='attach'?'finalize ':'retire ';
  assert.equal(f.calls.some(call=>call.startsWith(next)),false);
  assert.equal(f.calls.some(call=>call.startsWith('notify ')),false);
  assert.equal(f.calls.filter(call=>call.startsWith('cancel ')).length,parts.length);
  if(phase==='finalize')assert.equal(f.calls.filter(call=>call.startsWith('undo ')).length,parts.length);
  if(phase!=='activate')assert.equal(f.calls.filter(call=>call.startsWith('rollback ')).length,parts.length);
  assert.deepEqual(f.errors,[]);
 }finally{f.coordinator.dispose();}
});

test('cancellation during a reversible phase stops before calling another participant',async()=>{
 const f=fixture(),controller=new AbortController(),parts=['terrain','biome'].map(side=>f.part('0,0',side));try{
  parts[0].activate=()=>{f.calls.push('activate terrain');controller.abort();return true;};
  const batch=await f.coordinator.prepareBatch(parts,{scene:f.scene,signal:controller.signal});assert.throws(()=>batch.commit(),/stale/);
  assert.deepEqual(f.calls,['activate terrain','cancel 0,0:biome','cancel 0,0:terrain']);
 }finally{f.coordinator.dispose();}
});
