import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Scene,Mesh,PerspectiveCamera} from 'three';
import {createWebGpuPipelineAdmission} from '../src/rendering/webgpu-pipeline-admission.js';
import {createChunkPublicationCoordinator} from '../src/rendering/webgpu-chunk-publication.js';

function fixture({admission:providedAdmission,scene:providedScene}={}){
 const calls=[],errors=[],scene=providedScene??new Scene();let valid=true,validations=0;const admission=providedAdmission??{prepareManyAndPublish(){throw Error('unexpected');},async prepareTicket(){return {valid:()=>{validations++;return valid;}};}},coordinator=createChunkPublicationCoordinator({admission,onError:error=>errors.push(error.message)});
 function part(key,side,extra={}){const controller=new AbortController(),name=key+':'+side,object=new Group();return {key,side,epoch:'e',revision:1,publicationOrder:1,object,signal:controller.signal,eventRoots(){return [object];},activate(){calls.push('activate '+name);return true;},attach(){calls.push('attach '+name);},rollback(){calls.push('rollback '+name);},finalize(){calls.push('finalize '+name);return {retire:()=>calls.push('retire '+name),notify:()=>calls.push('notify '+name)};},rollbackFinalized(){calls.push('undo '+name);},cancel(){calls.push('cancel '+name);},...extra};}
 return {coordinator,calls,errors,scene,part,get validations(){return validations;},invalidate(){valid=false;}};
}

function presentationFixture(){
 const f=fixture(),old=new Group(),unchanged=new Group();f.scene.add(old,unchanged);
 const parts=['terrain','biome'].map(side=>f.part('0,0',side));
 for(const part of parts){part.eventRoots=()=>[part.object,old];part.presentation=()=>({show:[part.object],hide:[old]});}
 return {...f,parts,old,unchanged};
}

test('prepared recording selects only the candidate graph and restores it before logical commit',async()=>{
 const f=presentationFixture();try{const before=[...f.scene.children],batch=await f.coordinator.prepareBatch(f.parts,{scene:f.scene});
  assert.equal(batch.capturePresentation(()=>{assert.equal(f.old.visible,false);assert.equal(f.unchanged.visible,true);assert.ok(f.parts.every(part=>part.object.parent===f.scene));assert.deepEqual(f.calls,[]);return 42;}),42);
  assert.deepEqual(f.scene.children,before);assert.equal(f.old.visible,true);assert.ok(f.parts.every(part=>part.object.parent===null));assert.equal(batch.valid(),true);assert.equal(batch.commit(),true);assert.equal(f.calls.filter(call=>call.startsWith('activate')).length,2);
 }finally{f.coordinator.dispose();}
});

for(const outcome of ['throw','promise','abort','commit'])test(`prepared recording restores visibility and parents on ${outcome}`,async()=>{
 const f=presentationFixture(),controller=new AbortController();try{const batch=await f.coordinator.prepareBatch(f.parts,{scene:f.scene,signal:controller.signal}),before=[...f.scene.children];
  assert.throws(()=>batch.capturePresentation(()=>{if(outcome==='throw')throw Error('recording failed');if(outcome==='promise')return Promise.resolve();if(outcome==='commit')return batch.commit();controller.abort();}),/recording failed|synchronous|changed|stale/);
  assert.deepEqual(f.scene.children,before);assert.equal(f.old.visible,true);assert.ok(f.parts.every(part=>part.object.parent===null));assert.equal(batch.valid(),false);assert.equal(f.calls.some(call=>call.startsWith('activate')),false);assert.equal(f.calls.filter(call=>call.startsWith('cancel')).length,2);
 }finally{f.coordinator.dispose();}
});

test('prepared recording rejects missing owner selection, outside objects and synchronous observers',async()=>{
 for(const kind of ['missing','outside','observer']){const f=presentationFixture();try{if(kind==='missing')delete f.parts[0].presentation;if(kind==='outside')f.parts[0].presentation=()=>({show:[new Group()],hide:[]});if(kind==='observer')f.old.addEventListener('removed',()=>{});const before=[...f.scene.children],batch=await f.coordinator.prepareBatch(f.parts,{scene:f.scene});assert.throws(()=>batch.capturePresentation(()=>assert.fail('must not record')),/no prepared|Conflicting|synchronous/);assert.deepEqual(f.scene.children,before);assert.equal(f.old.visible,true);assert.deepEqual(f.calls,[]);}finally{f.coordinator.dispose();}}
});
test('dependent owners join the same reversible phases without inventing chunk revisions',async()=>{
 const f=fixture(),parts=['terrain','biome'].map(side=>f.part('0,0',side)),dependent=f.part('village','dependent',{valid:()=>true});try{const batch=await f.coordinator.prepareBatch(parts,{scene:f.scene,dependents:[dependent]});assert.equal(batch.valid(),true);batch.commit();assert.deepEqual(f.calls.filter(call=>call.startsWith('finalize ')),['finalize 0,0:terrain','finalize 0,0:biome','finalize village:dependent']);assert.equal(f.calls.filter(call=>call.startsWith('notify ')).length,3);assert.deepEqual(f.errors,[]);}finally{f.coordinator.dispose();}
});

for(const phase of ['before','attach','finalize'])test(`a dependent read set changed ${phase} rolls the whole terrain batch back`,async()=>{
 const f=fixture(),parts=['terrain','biome'].map(side=>f.part('0,0',side));let current=true;const dependent=f.part('village','dependent',{valid:()=>current});try{if(phase!=='before'){const run=dependent[phase];dependent[phase]=()=>{const result=run();current=false;return result;};}const batch=await f.coordinator.prepareBatch(parts,{scene:f.scene,dependents:[dependent]});if(phase==='before')current=false;assert.equal(phase==='before'?batch.valid():true,phase!=='before');assert.throws(()=>batch.commit(),/stale/);assert.equal(f.calls.some(call=>/^(retire|notify) /.test(call)),false);assert.equal(f.calls.filter(call=>call.startsWith('cancel ')).length,3);if(phase==='finalize')assert.equal(f.calls.filter(call=>call.startsWith('undo ')).length,3);assert.deepEqual(f.errors,[]);}finally{f.coordinator.dispose();}
});

test('a dependent tree observer rejects publication before any owner activates',async()=>{
 const f=fixture(),parts=['terrain','biome'].map(side=>f.part('0,0',side)),dependent=f.part('village','dependent',{valid:()=>true});try{const batch=await f.coordinator.prepareBatch(parts,{scene:f.scene,dependents:[dependent]});dependent.object.addEventListener('removed',()=>{});assert.throws(()=>batch.commit(),/synchronous/);assert.equal(f.calls.some(call=>call.startsWith('activate ')),false);assert.equal(f.calls.filter(call=>call.startsWith('cancel ')).length,3);}finally{f.coordinator.dispose();}
});

for(const approval of [false,undefined,null,0])test(`a dependent requires explicit valid=true, rejecting ${String(approval)}`,async()=>{
 const f=fixture(),parts=['terrain','biome'].map(side=>f.part('0,0',side)),dependent=f.part('village','dependent',{valid:()=>approval});try{await assert.rejects(f.coordinator.prepareBatch(parts,{scene:f.scene,dependents:[dependent]}),/stale/);assert.equal(f.calls.some(call=>call.startsWith('activate ')),false);assert.equal(f.calls.filter(call=>call.startsWith('cancel ')).length,3);}finally{f.coordinator.dispose();}
});
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

for(const outcome of ['commit','abort'])test(`confirmed terrain batch bypasses queued ordinary preparation with bounded fairness and ${outcome}`,async()=>{
 const scene=new Scene(),camera=new PerspectiveCamera(),started=[],finishes=[],pending=[];
 const renderer={backend:{isWebGPUBackend:true},compileAsync(object){started.push(object.name);return new Promise(resolve=>finishes.push(resolve));}},admission=createWebGpuPipelineAdmission({renderer,scene,camera}),f=fixture({admission,scene}),controller=new AbortController(),turn=()=>new Promise(resolve=>setImmediate(resolve));
 const submit=(name)=>{const object=new Group();object.name=name;const promise=admission.prepare(object);promise.catch(()=>{});pending.push(promise);};
 let batchPromise,batch;
 try{
  submit('normal0');await turn();for(let i=1;i<12;i++)submit('normal'+i);
  const parts=['0,0','1,0'].flatMap(key=>['terrain','biome'].map(side=>f.part(key,side))),dependent=f.part('actor','dependent',{valid:()=>true});
  for(const p of [...parts,dependent]){p.object.name=p.key+':'+p.side;const attach=p.attach,rollback=p.rollback;p.attach=()=>{scene.add(p.object);attach();};p.rollback=()=>{p.object.removeFromParent();rollback();};}
  batchPromise=f.coordinator.prepareBatch(parts,{scene:f.scene,signal:controller.signal,dependents:[dependent]});batchPromise.catch(()=>{});
  await turn();assert.deepEqual(started,['normal0'],'the inflight compile is not interrupted');assert.deepEqual(f.calls,[]);
  finishes.shift()();await turn();assert.equal(started[1],'0,0:terrain','the required terrain must not wait behind the ordinary backlog');
  if(outcome==='abort'){controller.abort();await assert.rejects(batchPromise,{name:'AbortError'});assert.equal(f.calls.filter(c=>c.startsWith('cancel ')).length,5);assert.equal(f.calls.some(c=>c.startsWith('activate ')),false);}
  // Advance controlled compilations, not wall-clock deadlines or a fake GPU.
  for(let i=0;i<30&&(finishes.length||admission.status().queued);i++){finishes.shift()?.();await turn();}
  await Promise.all(pending);
  const normal=started.filter(n=>n.startsWith('normal'));assert.deepEqual(normal,Array.from({length:12},(_,i)=>'normal'+i));
  if(outcome==='commit'){
   batch=await batchPromise;assert.deepEqual(f.calls,[]);assert(batch.valid());batch.commit();assert.equal(f.calls.filter(c=>c.startsWith('finalize ')).length,5);
   assert.deepEqual(started.filter(n=>!n.startsWith('normal')),['0,0:terrain','0,0:biome','1,0:terrain','1,0:biome','actor:dependent']);
   assert(started.indexOf('1,0:biome')<started.indexOf('normal11'),'publication completes before the unrelated backlog drains');
   let burst=0;for(const name of started){if(name.startsWith('normal'))burst=0;else{burst++;assert(burst<=2,'ordinary jobs retain the existing fairness turn');}}
  }else assert.deepEqual(started.filter(n=>!n.startsWith('normal')),['0,0:terrain']);
  assert.deepEqual(f.errors,[]);
 }finally{controller.abort();finishes.forEach(finish=>finish());f.coordinator.dispose();admission.dispose();await Promise.allSettled([...pending,...(batchPromise?[batchPromise]:[])]);}
});
