import test from 'node:test';
import assert from 'node:assert/strict';
import {compileLoadingPrograms} from '../src/rendering/loading-programs.js';
import {Vector4} from 'three';
function fixture(program){const material={},gl={isContextLost:()=>false};return {material,renderer:{compile:()=>new Set([material]),properties:{get:()=>({currentProgram:program})},getContext:()=>gl}};}
test('loading compilation snapshots programs before borrowed materials are restored',async()=>{let ready=false;const original={isReady:()=>ready},f=fixture(original);const pending=compileLoadingPrograms(f.renderer,{},{});f.renderer.properties.get=()=>({currentProgram:{isReady:()=>false}});ready=true;await pending;});
test('loading compilation cancellation releases a pending poll immediately',async()=>{const abort=new AbortController(),f=fixture({isReady:()=>false});const pending=compileLoadingPrograms(f.renderer,{},{},undefined,{signal:abort.signal});abort.abort();await assert.rejects(pending,/cancelled/);});
test('loading compilation reports timeout without an indefinite poll',async()=>{let clock=0;const f=fixture({isReady:()=>false});const pending=compileLoadingPrograms(f.renderer,{},{},undefined,{now:()=>clock,timeout:1});clock=2;await assert.rejects(pending,/timed out/);});
test('loading compilation rejects a destroyed owner before submitting programs',()=>{const f=fixture({isReady:()=>true});f.renderer.compile=()=>{throw Error('must not compile');};assert.throws(()=>compileLoadingPrograms(f.renderer,{},{},undefined,{cancelled:()=>true}),/cancelled/);});

test('explicit screen compilation restores target and viewport while its program is still pending',async()=>{
 let ready=false,target={depth:true};const previous=target,f=fixture({isReady:()=>ready}),viewport=new Vector4(1,2,3,4),scissor=new Vector4(4,3,2,1);let test=true;
 Object.assign(f.renderer,{getRenderTarget:()=>target,setRenderTarget:value=>{target=value;viewport.set(0,0,900,600);},getViewport:v=>v.copy(viewport),getScissor:v=>v.copy(scissor),getScissorTest:()=>test,setViewport:v=>viewport.copy(v),setScissor:v=>scissor.copy(v),setScissorTest:v=>{test=v;},compile:()=>{assert.equal(target,null);return new Set([f.material]);}});
 const pending=compileLoadingPrograms(f.renderer,{},{},undefined,{screen:true});assert.equal(target,previous);assert.deepEqual(viewport.toArray(),[1,2,3,4]);assert.deepEqual(scissor.toArray(),[4,3,2,1]);assert.equal(test,true);ready=true;await pending;
 f.renderer.compile=()=>{assert.equal(target,null);throw Error('compile fault');};assert.throws(()=>compileLoadingPrograms(f.renderer,{},{},undefined,{screen:true}),/compile fault/);assert.equal(target,previous);assert.deepEqual(viewport.toArray(),[1,2,3,4]);
});

import {compileLoadingProgramsBatched} from '../src/rendering/loading-programs.js';
test('bounded compiler retains original native objects and target-scene lighting without mutation',async()=>{
 const gl={isContextLost:()=>false};const objects=Array.from({length:7},(_,i)=>({isMesh:true,visible:i!==2,parent:{id:i},material:{id:i}}));
 const scene={traverse:fn=>objects.forEach(fn)},calls=[];let yields=0;
 const renderer={compile(view,camera,target){assert.equal(target,scene);const batch=[];view.traverse(object=>batch.push(object));view.traverseVisible(()=>assert.fail('light duplicated'));calls.push(batch);return new Set(batch.map(o=>o.material));},getContext:()=>gl,properties:{get:()=>({currentProgram:{isReady:()=>true}})}};
 const parents=objects.map(o=>o.parent);
 await compileLoadingProgramsBatched(renderer,scene,{},undefined,{batchSize:3,nextFrame:async()=>{yields++;assert.deepEqual(objects.map(o=>o.parent),parents);assert.equal(objects[2].visible,false);}});
 assert.deepEqual(calls.map(c=>c.length),[3,3,1]);assert.deepEqual(calls.flat(),objects);assert.equal(yields,3);
});
test('bounded compiler cancels before a later submission',async()=>{
 const gl={isContextLost:()=>false};let cancelled=false,calls=0;const scene={traverse:fn=>[1,2].forEach(()=>fn({isMesh:true}))};
 const renderer={compile:()=>{calls++;return new Set();},getContext:()=>gl,properties:{get:()=>({})}};
 await assert.rejects(compileLoadingProgramsBatched(renderer,scene,{},undefined,{batchSize:1,cancelled:()=>cancelled,nextFrame:async()=>{cancelled=true;}}),/cancelled/);assert.equal(calls,1);
});

test('compilation readiness includes every native variant of a shared material',async()=>{let ready=false;const f=fixture({isReady:()=>true});f.renderer.properties.get=()=>({currentProgram:{isReady:()=>true},programs:new Map([['instanced',{isReady:()=>ready}],['plain',{isReady:()=>true}]])});let resolved=false;const pending=compileLoadingPrograms(f.renderer,{},{}).then(()=>{resolved=true;});await Promise.resolve();assert.equal(resolved,false);ready=true;await pending;assert.equal(resolved,true);});


test('loading compilation latches loss and restoration before another program query',async()=>{
 const canvas=new EventTarget(),gl={canvas,isContextLost:()=>false};let queries=0,closed=false;
 const f=fixture({isReady:()=>{assert.equal(closed,false);queries++;return false;}});f.renderer.getContext=()=>gl;
 const pending=compileLoadingPrograms(f.renderer,{},{});canvas.dispatchEvent(new Event('webglcontextlost'));closed=true;
 await assert.rejects(pending,/cancelled/);const final=queries;await new Promise(resolve=>setTimeout(resolve,20));assert.equal(queries,final);
});

test('loading compilation rejects generation changes even without a loss event',async()=>{
 let epoch=0,queries=0;const f=fixture({isReady:()=>{assert.equal(epoch,0);queries++;return false;}});
 const pending=compileLoadingPrograms(f.renderer,{},{},undefined,{getEpoch:()=>epoch});epoch++;
 await assert.rejects(pending,/cancelled/);assert.equal(queries,1);
});

test('submission CPU witness is synchronous and does not include pending program readiness',async()=>{let clock=1;const rows=[],abort=new AbortController(),f=fixture({isReady:()=>false});f.renderer.compile=()=>{clock=9;return new Set([f.material]);};const pending=compileLoadingPrograms(f.renderer,{},{},undefined,{signal:abort.signal,now:()=>clock,onSubmit:row=>rows.push(row)});assert.equal(rows.length,1);assert.equal(rows[0].label,'loading-compile-submit');assert.equal(rows[0].duration,8);clock=30;assert.equal(rows[0].duration,8);abort.abort();await assert.rejects(pending,/cancelled/);});
test('optional compile diagnostic failure cannot change native readiness or original submission error',async()=>{const f=fixture({isReady:()=>true});await compileLoadingPrograms(f.renderer,{},{},undefined,{onSubmit:()=>{throw Error('diagnostic');}});f.renderer.compile=()=>{throw Error('native failure');};assert.throws(()=>compileLoadingPrograms(f.renderer,{},{},undefined,{onSubmit:()=>{throw Error('diagnostic');}}),/native failure/);});

test('optional program readiness witness reports waited wall time separately from submission CPU',async()=>{
 let clock=0,ready=false;const rows=[],f=fixture({isReady:()=>ready});f.renderer.compile=()=>{clock=3;return new Set([f.material]);};
 const pending=compileLoadingPrograms(f.renderer,{},{},undefined,{now:()=>clock,onSubmit:row=>rows.push(row)});clock=27;ready=true;await pending;
 assert.equal(rows[0].label,'loading-compile-submit');assert.equal(rows[0].duration,3);
 assert.equal(rows[1].label,'loading-compile-readiness-wait');assert.equal(rows[1].duration,24);assert.match(rows[1].scope,/not CPU or GPU/);
});


test('CPU-budget compiler retains every native object while an actual readiness wait already delivers presentation',async()=>{
 let frame=0,clock=0,yields=0,ready=false;const objects=Array.from({length:8},()=>({isMesh:true,material:{}})),scene={traverse:fn=>objects.forEach(fn)},calls=[];
 const gl={isContextLost:()=>false},program={isReady:()=>ready};const renderer={compile(view){const batch=[];view.traverse(o=>batch.push(o));calls.push(batch);clock+=3;return new Set(batch.map(o=>o.material));},getContext:()=>gl,properties:{get:()=>({currentProgram:program})}};
 const pending=compileLoadingProgramsBatched(renderer,scene,{},undefined,{batchSize:4,frameBudget:16,cpuBudget:true,getFrame:()=>frame,now:()=>clock,nextFrame:async()=>{yields++;frame++;}});
 setTimeout(()=>{clock+=50;frame++;ready=true;},1);await pending;
 assert.deepEqual(calls.flat(),objects);assert.equal(calls.length,2);assert.equal(yields,0);
});

test('a throwing optional CPU observer cannot remove the bounded compilation yield or readiness',async()=>{
 let clock=0,frames=0;const objects=[{isMesh:true,material:{}}],scene={traverse:fn=>objects.forEach(fn)},renderer={compile:()=>{clock+=20;return new Set(objects.map(o=>o.material));},getContext:()=>({isContextLost:()=>false}),properties:{get:()=>({currentProgram:{isReady:()=>true}})}};
 const gl={isContextLost:()=>false};renderer.getContext=()=>gl;
 await compileLoadingProgramsBatched(renderer,scene,{},undefined,{cpuBudget:true,frameBudget:16,now:()=>clock,onCpu:()=>{throw Error('diagnostic');},nextFrame:async()=>{frames++;}});assert.equal(frames,1);
});

import {EventDispatcher} from 'three';
function guardedScene(ready=false){
 const objects=Array.from({length:2},()=>({isMesh:true,geometry:new EventDispatcher(),material:new EventDispatcher()}));
 const scene={traverse:fn=>objects.forEach(fn)},gl={isContextLost:()=>false};let calls=0,queries=0;
 const renderer={compile(view){calls++;const materials=new Set();view.traverse(o=>materials.add(o.material));return materials;},getContext:()=>gl,properties:{get:()=>({currentProgram:{isReady:()=>{queries++;return ready;}}})}};
 return {objects,scene,renderer,counts:()=>({calls,queries}),clean:()=>objects.every(o=>[o.geometry,o.material].every(r=>!r._listeners?.dispose?.length))};
}
for(const resource of ['geometry','material'])test(`borrowed ${resource} disposal aborts readiness before another driver query`,async()=>{
 const f=guardedScene(),pending=compileLoadingProgramsBatched(f.renderer,f.scene,{},undefined,{batchSize:1,guardResourceDisposal:true});
 const count=f.counts();f.objects[1][resource].dispatchEvent({type:'dispose'});
 await assert.rejects(pending,/cancelled/);await new Promise(r=>setTimeout(r,25));assert.deepEqual(f.counts(),count);assert.equal(f.clean(),true);
});
test('borrowed disposal cancels a suspended frame and never submits the next batch',async()=>{
 const f=guardedScene(true);let entered;const entry=new Promise(r=>entered=r);
 const pending=compileLoadingProgramsBatched(f.renderer,f.scene,{},undefined,{batchSize:1,guardResourceDisposal:true,nextFrame:()=>{entered();return new Promise(()=>{});}});
 await entry;f.objects[1].geometry.dispatchEvent({type:'dispose'});await assert.rejects(pending,/cancelled/);assert.equal(f.counts().calls,1);assert.equal(f.clean(),true);
});
test('guarded compilation cleans listeners on success, submission failure and external abort',async()=>{
 for(const mode of ['success','failure','abort']){
  const f=guardedScene(mode==='success'),owner=new AbortController();
  if(mode==='failure')f.renderer.compile=()=>{throw Error('submission fault');};
  const pending=compileLoadingProgramsBatched(f.renderer,f.scene,{},undefined,{guardResourceDisposal:true,signal:owner.signal,nextFrame:async()=>{}});
  if(mode==='abort')owner.abort();
  if(mode==='success')await pending;else await assert.rejects(pending,mode==='failure'?/submission fault/:/cancelled/);
  assert.equal(f.clean(),true);
 }
});

test('guarded batched compilation cancels during a suspended frame on context loss',async()=>{
 const f=guardedScene(true),canvas=new EventTarget();f.renderer.getContext().canvas=canvas;
 let entered;const entry=new Promise(r=>entered=r);
 const pending=compileLoadingProgramsBatched(f.renderer,f.scene,{},undefined,{batchSize:1,guardResourceDisposal:true,nextFrame:()=>{entered();return new Promise(()=>{});}});
 await entry;canvas.dispatchEvent(new Event('webglcontextlost'));
 await assert.rejects(pending,/cancelled/);assert.equal(f.counts().calls,1);assert.equal(f.clean(),true);
});

import {GlobalFrameScheduler} from '../src/app/global-frame-scheduler.js';
test('scheduler admits submission but never charges readiness wait as synchronous work',async()=>{
 let clock=1000,ready=false,calls=0;const scheduler=new GlobalFrameScheduler({now:()=>clock}),f=fixture({isReady:()=>ready});
 f.renderer.compile=()=>{calls++;clock+=2;return new Set([f.material]);};
 const pending=compileLoadingPrograms(f.renderer,{},{},undefined,{scheduler,now:()=>clock});assert.equal(calls,0);
 clock+=300;scheduler.beginFrame(clock);clock+=1;await scheduler.endFrame();assert.equal(calls,1);assert.equal(scheduler.snapshot().workMs,2);assert.equal(scheduler.snapshot().pending,0);
 clock+=100;ready=true;await pending;assert.equal(scheduler.snapshot().workMs,2);
});
test('aborting queued compilation rejects without submitting or needing another frame',async()=>{
 const abort=new AbortController(),scheduler=new GlobalFrameScheduler(),f=fixture({isReady:()=>true});let calls=0;f.renderer.compile=()=>{calls++;return new Set();};
 const pending=compileLoadingPrograms(f.renderer,{},{},undefined,{scheduler,signal:abort.signal});abort.abort();await assert.rejects(pending,/cancelled/);assert.equal(calls,0);assert.equal(scheduler.snapshot().pending,0);
});
test('queued compilation latches context loss even if restored before admission',async()=>{
 const scheduler=new GlobalFrameScheduler(),f=fixture({isReady:()=>true}),canvas=new EventTarget();f.renderer.getContext().canvas=canvas;let calls=0;f.renderer.compile=()=>{calls++;return new Set();};
 const pending=compileLoadingPrograms(f.renderer,{},{},undefined,{scheduler});canvas.dispatchEvent(new Event('webglcontextlost'));await assert.rejects(pending,/cancelled/);assert.equal(calls,0);
});


test('compiler forwards the operation deadline and reports queue wait separately',async()=>{
 let clock=10,job,options;const rows=[],f=fixture({isReady:()=>true});
 const scheduler={submit(iterator,value){job=iterator;options=value;return new Promise(resolve=>{this.resolve=resolve;});}};
 const pending=compileLoadingPrograms(f.renderer,{},{},undefined,{scheduler,deadline:5,now:()=>clock,onSubmit:row=>rows.push(row)});
 assert.equal(options.deadline,5);clock=40;scheduler.resolve(job.next().value);await pending;
 assert.equal(rows[0].label,'loading-compile-admission-wait');assert.equal(rows[0].duration,30);
 assert.equal(rows[1].label,'loading-compile-submit');assert.equal(rows[1].duration,0);
});


test('batched scheduler deadline belongs to the operation, not each later batch',async()=>{
 for(const explicit of [undefined,75]){
  let clock=100;const deadlines=[],objects=Array.from({length:3},()=>({isMesh:true}));
  const gl={isContextLost:()=>false},scene={traverse:fn=>objects.forEach(fn)},renderer={getContext:()=>gl,properties:{get:()=>({})},compile:()=>{clock+=300;return new Set();}};
  const scheduler={submit(iterator,options){deadlines.push(options.deadline);return Promise.resolve(iterator.next().value);}};
  await compileLoadingProgramsBatched(renderer,scene,{},scene,{scheduler,batchSize:1,now:()=>clock,deadline:explicit,nextFrame:()=>assert.fail('global admission must replace the local yield budget')});
  assert.deepEqual(deadlines,Array(3).fill(explicit??350));
 }
});

test('initial loading overlaps bounded readiness waves but preserves every original object',async()=>{
 const objects=Array.from({length:5},()=>({isMesh:true,material:{}})),ready=objects.map(()=>false),calls=[];
 const scene={traverse:fn=>objects.forEach(fn)},gl={isContextLost:()=>false},scheduler={submit:async iterator=>iterator.next().value};
 const renderer={getContext:()=>gl,compile(view){const batch=[];view.traverse(o=>batch.push(o));calls.push(...batch);return new Set(batch.map(o=>o.material));},properties:{get:material=>({currentProgram:{isReady:()=>ready[objects.findIndex(o=>o.material===material)]}})}};
 const pending=compileLoadingProgramsBatched(renderer,scene,{},scene,{scheduler,batchSize:1,concurrency:2});
 await Promise.resolve();assert.equal(calls.length,2);ready[0]=ready[1]=true;
 await new Promise(resolve=>setTimeout(resolve,25));assert.equal(calls.length,4);
 ready.fill(true);await pending;assert.deepEqual(calls,objects);
});
test('failed loading wave drains already-submitted readiness and never submits a later wave',async()=>{
 const objects=Array.from({length:3},()=>({isMesh:true,material:{}})),scene={traverse:fn=>objects.forEach(fn)},gl={isContextLost:()=>false};let ready=false,calls=0,finished=false;
 const renderer={getContext:()=>gl,compile(view){calls++;if(calls===2)throw Error('second submission failed');return new Set([objects[0].material]);},properties:{get:()=>({currentProgram:{isReady:()=>ready}})}};
 const pending=compileLoadingProgramsBatched(renderer,scene,{},scene,{scheduler:{submit:async iterator=>iterator.next().value},batchSize:1,concurrency:2});
 const failure=assert.rejects(pending,/second submission failed/).then(()=>{finished=true;});await new Promise(resolve=>setTimeout(resolve,15));assert.equal(finished,false);assert.equal(calls,2);
 ready=true;await failure;assert.equal(calls,2);
});
test('parallel initial compilation rejects unbounded waves and missing global admission',async()=>{
 for(const concurrency of [0,9,1.5,2])await assert.rejects(compileLoadingProgramsBatched({}, {}, {}, {}, {concurrency}),/global admission/);
});

test('cancelling an initial readiness wave releases every waiter without submitting later objects',async()=>{
 const owner=new AbortController(),objects=Array.from({length:5},()=>({isMesh:true,material:{}}));
 const scene={traverse:fn=>objects.forEach(fn)},gl={isContextLost:()=>false};let submissions=0;
 const renderer={getContext:()=>gl,compile(view){submissions++;const materials=new Set();view.traverse(o=>materials.add(o.material));return materials;},properties:{get:()=>({currentProgram:{isReady:()=>false}})}};
 const pending=compileLoadingProgramsBatched(renderer,scene,{},scene,{scheduler:{submit:async iterator=>iterator.next().value},signal:owner.signal,batchSize:1,concurrency:2});
 await Promise.resolve();assert.equal(submissions,2);owner.abort();
 await assert.rejects(pending,/cancelled|abort/i);assert.equal(submissions,2);
});
