import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector4} from 'three';
import {compileLoadingProgramsBatched,loadingCompileWindowEnabled} from '../src/rendering/loading-programs.js';
import {createLoadingCompileJobTracker} from '../src/rendering/loading-readiness-snapshot.js';
import {readFileSync} from 'node:fs';
const turn=()=>new Promise(resolve=>setImmediate(resolve));
async function until(check){for(let i=0;i<2000;i++){if(check())return;await new Promise(resolve=>setTimeout(resolve,1));}assert.fail('expected compilation boundary not reached');}
function setup(count=24){
 const canvas=new EventTarget(),gl={canvas,isContextLost:()=>false},ready=new Set(),queries=[],calls=[],rows=[];
 let clock=0,epoch=0,target={borrowed:true},view=new Vector4(1,2,3,4),scissor=new Vector4(4,3,2,1),scissorTest=true;
 const originalTarget=target,materials=Array.from({length:count},()=>({})),objects=materials.map((material,i)=>({isMesh:true,isInstancedMesh:i%2===0,material,id:i,parent:{i},visible:i%3!==0}));
 const scene={traverse:fn=>objects.forEach(fn)},programs=materials.map((material,i)=>({id:i,isReady(){queries.push(i);return ready.has(i);}}));
 const renderer={getContext:()=>gl,properties:{get:material=>({currentProgram:programs[materials.indexOf(material)],programs:new Map([['original',programs[materials.indexOf(material)]]])})},compile(root,camera,destination){assert.equal(destination,scene);assert.equal(target,null);const batch=[];root.traverse(o=>batch.push(o));calls.push(batch);clock+=3;return new Set(batch.map(o=>o.material));},getRenderTarget:()=>target,setRenderTarget:value=>{target=value;view.set(0,0,900,600);},getViewport:v=>v.copy(view),getScissor:v=>v.copy(scissor),getScissorTest:()=>scissorTest,setViewport:v=>view.copy(v),setScissor:v=>scissor.copy(v),setScissorTest:v=>{scissorTest=v;}};
 const options={readinessWindow:2,batchSize:8,screen:true,cpuBudget:true,frameBudget:16,now:()=>clock,getEpoch:()=>epoch,nextFrame:async()=>{},onJob:row=>{rows.push(row);}};
 return {renderer,scene,objects,materials,programs,ready,queries,calls,rows,canvas,gl,options,setClock:v=>{clock=v;},setEpoch:v=>{epoch=v;},restoreCheck(){assert.equal(target,originalTarget);assert.deepEqual(view.toArray(),[1,2,3,4]);assert.deepEqual(scissor.toArray(),[4,3,2,1]);assert.equal(scissorTest,true);},all(){programs.forEach(p=>ready.add(p.id));}};
}

test('strict two-job window uses original core/objects/allvariants and third submission waits for settlement',async()=>{
 const f=setup(),extra={id:999,isReady:()=>{f.queries.push(999);return f.ready.has(999);}};const originalGet=f.renderer.properties.get;f.renderer.properties.get=material=>{const p=originalGet(material);if(material===f.materials[0])p.programs.set('background',extra);return p;};
 const pending=compileLoadingProgramsBatched(f.renderer,f.scene,{},undefined,f.options);await until(()=>f.calls.length===2);f.restoreCheck();await turn();assert.equal(f.calls.length,2);
 for(let i=0;i<8;i++)f.ready.add(i);await new Promise(resolve=>setTimeout(resolve,15));assert.equal(f.calls.length,2,'background variant keeps first slot occupied');
 for(let i=8;i<16;i++)f.ready.add(i);await until(()=>f.calls.length===3);assert.deepEqual(f.calls.flat(),f.objects);f.restoreCheck();assert.deepEqual(f.rows.map(row=>row.batch.window.inFlight),[1,2,2]);
 f.all();f.ready.add(999);await pending;assert.equal(f.calls.length,3);assert.ok(f.queries.includes(999));assert.deepEqual(f.objects.map(o=>o.parent.i),Array.from({length:24},(_,i)=>i));
});

test('default OFF remains serial; ready jobs do not force RAF and strict guard requires both smoke booleans',async()=>{
 const f=setup();const pending=compileLoadingProgramsBatched(f.renderer,f.scene,{},undefined,{...f.options,readinessWindow:1});await turn();assert.equal(f.calls.length,1);f.all();await pending;
 assert.deepEqual(f.calls.flat(),f.objects);assert.ok(f.rows.every(row=>row.batch.window===undefined));
 const ready=setup();ready.all();let frames=0;await compileLoadingProgramsBatched(ready.renderer,ready.scene,{},undefined,{...ready.options,nextFrame:async()=>{frames++;}});assert.equal(frames,0);
 for(const scope of [{},{__desktopSmokeCompileWindow:true},{__desktopSmokeStarted:true},{__desktopSmokeStarted:1,__desktopSmokeCompileWindow:true}])assert.equal(loadingCompileWindowEnabled(scope),false);
 assert.equal(loadingCompileWindowEnabled({__desktopSmokeStarted:true,__desktopSmokeCompileWindow:true}),true);
});

test('external abort drains both pending core jobs with no late queries or extra submissions',async()=>{
 const f=setup(),abort=new AbortController();const pending=compileLoadingProgramsBatched(f.renderer,f.scene,{},undefined,{...f.options,signal:abort.signal});await until(()=>f.calls.length===2);abort.abort();await assert.rejects(pending,/cancelled/);f.restoreCheck();const count=f.queries.length;await new Promise(resolve=>setTimeout(resolve,25));assert.equal(f.queries.length,count);assert.equal(f.calls.length,2);
});

test('first real asynchronous program error aborts sibling and is preserved exactly',async()=>{
 const f=setup(),failure=Error('native readiness failure');let fail=false;f.programs[8].isReady=()=>{if(fail)throw failure;return false;};const pending=compileLoadingProgramsBatched(f.renderer,f.scene,{},undefined,f.options);await until(()=>f.calls.length===2);fail=true;await assert.rejects(pending,error=>error===failure);assert.equal(f.calls.length,2);f.restoreCheck();
});

test('synchronous second compile or selection fault aborts and drains original pending sibling',async()=>{
 for(const selection of [false,true]){
  const f=setup(),failure=Error('second submit fault'),compile=f.renderer.compile,get=f.renderer.properties.get;
  if(selection)f.renderer.properties.get=material=>{if(material===f.materials[8])throw failure;return get(material);};
  else f.renderer.compile=(...args)=>{if(f.calls.length===1)throw failure;return compile(...args);};
  await assert.rejects(compileLoadingProgramsBatched(f.renderer,f.scene,{},undefined,f.options),error=>error===failure);f.restoreCheck();const queries=f.queries.length;await new Promise(resolve=>setTimeout(resolve,20));assert.equal(f.queries.length,queries);
 }
});

test('epoch replacement and loss-restoration latch cannot permit queries or third batch',async()=>{
 for(const loss of [false,true]){const f=setup();const pending=compileLoadingProgramsBatched(f.renderer,f.scene,{},undefined,f.options);await until(()=>f.calls.length===2);if(loss)f.canvas.dispatchEvent(new Event('webglcontextlost'));else f.setEpoch(1);await assert.rejects(pending,/cancelled/);const count=f.queries.length;await new Promise(resolve=>setTimeout(resolve,20));assert.equal(f.queries.length,count);assert.equal(f.calls.length,2);f.restoreCheck();}
});

test('original per-job deadline and suspended budget RAF cancellation remain authoritative',async()=>{
 const f=setup();const pending=compileLoadingProgramsBatched(f.renderer,f.scene,{},undefined,f.options);await until(()=>f.calls.length===2);f.setClock(30001);await assert.rejects(pending,/timed out/);assert.equal(f.calls.length,2);
 const suspended=setup(),abort=new AbortController();let frames=0;const compile=suspended.renderer.compile;suspended.renderer.compile=(...args)=>{const result=compile(...args);suspended.setClock(20);return result;};
 const waiting=compileLoadingProgramsBatched(suspended.renderer,suspended.scene,{},undefined,{...suspended.options,signal:abort.signal,nextFrame:()=>{frames++;return new Promise(()=>{});}});await until(()=>frames===1);assert.equal(suspended.calls.length,1);abort.abort();await assert.rejects(waiting,/cancelled/);suspended.restoreCheck();
});

test('CPU16 budget and diagnostic faults preserve complete submissions/readiness',async()=>{
 const f=setup();f.all();let clock=0,frames=0;const compile=f.renderer.compile;f.renderer.compile=(...args)=>{const result=compile(...args);clock+=9;return result;};
 await compileLoadingProgramsBatched(f.renderer,f.scene,{},undefined,{...f.options,now:()=>clock,onCpu:()=>{throw Error('observer');},onJob:()=>{throw Error('observer');},nextFrame:async()=>{frames++;}});assert.equal(frames,1);assert.deepEqual(f.calls.flat(),f.objects);f.restoreCheck();
});

test('partial budget setup failure removes external ownership listener and preserves error',async()=>{
 const f=setup(),signal=new AbortController().signal;let listeners=0;const add=signal.addEventListener.bind(signal),remove=signal.removeEventListener.bind(signal);signal.addEventListener=(...args)=>{listeners++;return add(...args);};signal.removeEventListener=(...args)=>{listeners--;return remove(...args);};const failure=Error('clock fault');
 await assert.rejects(compileLoadingProgramsBatched(f.renderer,f.scene,{},undefined,{...f.options,signal,now:()=>{throw failure;}}),error=>error===failure);assert.equal(listeners,0);assert.equal(f.calls.length,0);
});

test('wiring is smoke-only opt-in and original gates remain exact',()=>{
 const rust=readFileSync(new URL('../src-tauri/src/main.rs',import.meta.url),'utf8'),smoke=readFileSync(new URL('../src-tauri/smoke.js',import.meta.url),'utf8'),workflow=readFileSync(new URL('../.github/workflows/windows.yml',import.meta.url),'utf8');
 assert.ok(rust.indexOf('--smoke-report')<rust.indexOf('--smoke-compile-window'));assert.match(smoke,/compileWindow:window\.__desktopSmokeCompileWindow===true/);assert.match(workflow,/compile_window:[\s\S]*?default: false/);assert.equal(workflow.split("$smokeArgs += '--smoke-compile-window'").length-1,2);assert.match(smoke,/90000/);assert.match(smoke,/await wait\(300000\)/);assert.match(workflow,/WaitForExit\(900000\)/);
});


test('abort drain releases all original poll timers/context listeners and external signal listener',async()=>{
 const saved={setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout,setInterval:globalThis.setInterval,clearInterval:globalThis.clearInterval},timeouts=new Set(),intervals=new Set();
 globalThis.setTimeout=(callback,delay,...args)=>{let handle;handle=saved.setTimeout(function(...values){timeouts.delete(handle);return callback.apply(this,values);},delay,...args);timeouts.add(handle);return handle;};
 globalThis.clearTimeout=handle=>{timeouts.delete(handle);return saved.clearTimeout(handle);};
 globalThis.setInterval=(...args)=>{const handle=saved.setInterval(...args);intervals.add(handle);return handle;};globalThis.clearInterval=handle=>{intervals.delete(handle);return saved.clearInterval(handle);};
 try{
  const f=setup(),abort=new AbortController(),lost=new Set(),external=new Set(),add=f.canvas.addEventListener.bind(f.canvas),remove=f.canvas.removeEventListener.bind(f.canvas),signalAdd=abort.signal.addEventListener.bind(abort.signal),signalRemove=abort.signal.removeEventListener.bind(abort.signal);
  f.canvas.addEventListener=(type,callback,...rest)=>{if(type==='webglcontextlost')lost.add(callback);return add(type,callback,...rest);};f.canvas.removeEventListener=(type,callback,...rest)=>{lost.delete(callback);return remove(type,callback,...rest);};
  abort.signal.addEventListener=(type,callback,...rest)=>{external.add(callback);return signalAdd(type,callback,...rest);};abort.signal.removeEventListener=(type,callback,...rest)=>{external.delete(callback);return signalRemove(type,callback,...rest);};
  const pending=compileLoadingProgramsBatched(f.renderer,f.scene,{},undefined,{...f.options,signal:abort.signal});await until(()=>f.calls.length===2);assert.equal(lost.size,2);assert.equal(external.size,1);assert.equal(intervals.size,2);abort.abort();await assert.rejects(pending,/cancelled/);assert.equal(timeouts.size,0);assert.equal(intervals.size,0);assert.equal(lost.size,0);assert.equal(external.size,0);f.restoreCheck();
 }finally{Object.assign(globalThis,saved);for(const timer of timeouts)saved.clearTimeout(timer);for(const timer of intervals)saved.clearInterval(timer);}
});


test('actual original per-job observation retains scalar window high-water and terminal clear',async()=>{
 const f=setup(),collector=createLoadingCompileJobTracker(()=> 'warm-compile-world');const pending=compileLoadingProgramsBatched(f.renderer,f.scene,{},undefined,{...f.options,onJob:collector.create});await until(()=>f.calls.length===2);
 const snapshot=collector.snapshot();assert.equal(snapshot.windowHighWater,2);assert.equal(snapshot.active.length,2);assert.deepEqual(snapshot.active.map(job=>job.context.batch.window),[{limit:2,inFlight:1},{limit:2,inFlight:2}]);
 f.all();await pending;assert.equal(collector.snapshot().completed,3);assert.equal(collector.snapshot().windowHighWater,2);collector.clear();assert.equal(collector.snapshot().windowHighWater,0);assert.equal(collector.snapshot().active.length,0);
});
