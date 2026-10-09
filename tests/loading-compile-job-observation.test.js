import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {compileGpuPreparation} from '../tools/experiments/compile-gpu-preparation.js';
import {compileLoadingProgramsBatched} from '../src/rendering/loading-programs.js';
import {createLoadingCompileJobTracker,installLoadingReadinessObservation} from '../src/rendering/loading-readiness-snapshot.js';

async function equivalent(onProgress){
 const order=[],counts=new Map(),materials=[{id:1,uuid:'a',type:'MeshBasicMaterial'},{id:2,uuid:'b',type:'MeshBasicMaterial'}];
 const program=(id,after)=>({id,name:'Basic',cacheKey:'variant-'+id,isReady(){order.push(id);const n=(counts.get(id)??0)+1;counts.set(id,n);return n>=after;}}),a=program(20,1),b=program(23,3);
 const props=[{currentProgram:a,programs:new Map([['resident',a],['clipped',b]])},{currentProgram:b,programs:new Map([['clipped',b]])}];let compiles=0,lookups=0;
 await compileGpuPreparation({compile(){compiles++;return new Set(materials);},properties:{get:m=>{lookups++;return props[materials.indexOf(m)];}}},{},{},{},{check(){},pollIntervalMs:1,selectPrograms:p=>p.programs.values(),onProgress,now:onProgress?()=>99:()=>assert.fail('OFF clock read')});
 return {order,compiles,lookups};
}

test('observed and OFF pipeline retain exact original readiness call order/count/selection',async()=>{
 const off=await equivalent(),events=[];const on=await equivalent(row=>events.push(row));assert.deepEqual(on,off);assert.deepEqual(on,{order:[20,23,23,23],compiles:1,lookups:2});
 assert.equal(events[0].selectedCount,2);assert.equal(events[0].associations.length,3);assert.deepEqual(events[1].pendingIds,[23]);assert.equal(events.at(-1).event,'finished');assert.equal(events.at(-1).outcome,'resolved');assert.equal(events.at(-1).pendingCount,0);
});

test('observer and identity getter failures never alter real readiness or original failure',async()=>{
 assert.deepEqual(await equivalent(()=>{throw Error('observer');}),await equivalent());
 let queries=0;const material={get type(){throw Error('identity');}},program={id:4,isReady(){queries++;return true;}};
 const events=[];await compileGpuPreparation({compile:()=>new Set([material]),properties:{get:()=>({currentProgram:program})}},{},{},{},{check(){},onProgress:row=>events.push(row)});assert.equal(queries,1);assert.equal(events[0].associationCount,1);assert.equal(events[0].associationOmitted,1);
 const failure=Error('selected');const rows=[];await assert.rejects(compileGpuPreparation({compile:()=>new Set([{}]),properties:{get(){throw failure;}}},{},{},{},{check(){},onProgress:row=>rows.push(row)}),error=>error===failure);assert.equal(rows.at(-1).outcome,'rejected');assert.equal(rows.at(-1).polls,0);
});

test('batch observer identifies actual groups without changing objects/target or readiness',async()=>{
 const objects=Array.from({length:10},(_,i)=>({isMesh:true,isInstancedMesh:i===1,type:'Mesh',name:'object'+i,uuid:String(i),material:{id:i,uuid:'m'+i,type:'MeshBasicMaterial'}})),target={lighting:true},scene={traverse:cb=>objects.forEach(cb)},gl={isContextLost:()=>false},jobs=[],program={id:23,isReady:()=>true};
 const renderer={getContext:()=>gl,compile(view,camera,to){assert.equal(to,target);const selected=[];view.traverse(o=>selected.push(o));return new Set(selected.map(o=>o.material));},properties:{get:()=>({currentProgram:program})}};
 await compileLoadingProgramsBatched(renderer,scene,{},target,{batchSize:8,cpuBudget:true,frameBudget:16,nextFrame:()=>assert.fail('extra RAF'),onJob:context=>{const events=[];jobs.push({context,events});return row=>events.push(row);}});
 assert.equal(jobs.length,2);assert.equal(jobs[0].context.batch.ordinal,1);assert.equal(jobs[1].context.batch.ordinal,2);assert.equal(jobs[0].context.batch.categories.instanced,1);assert.equal(jobs[1].context.batch.end,10);assert.equal(jobs[0].events[0].associationCount,8);assert.equal(objects[1].parent,undefined);
});

test('collector bounds summaries independently and labels first observation rather than creation',()=>{
 let at=10;const collector=createLoadingCompileJobTracker(()=> 'warm-compile-world',{now:()=>at}),context={start:1,batch:{names:Array.from({length:20},()=>({name:'n'.repeat(1000)})),namesOmitted:4}};
 const report=collector.create(context);report({event:'selected',at:2,selectedCount:50,associationCount:50,associationOmitted:5,associations:Array.from({length:40},(_,id)=>({programId:id,cacheKey:'x'.repeat(4000)}))});
 for(let i=0;i<10000;i++)report({event:'poll',at:3,polls:i,pendingCount:50,pendingIds:Array.from({length:40},(_,id)=>id),pendingIdsOmitted:5});
 const snapshot=collector.snapshot(),row=snapshot.active[0];assert.equal(row.associations.length,32);assert.equal(row.associationOmitted,13);assert.equal(row.associations[0].cacheKey.length,2048);assert.equal(row.associations[0].cacheKeyTruncated,true);assert.equal(row.pendingIds.length,32);assert.equal(row.pendingIdsOmitted,13);assert.equal(row.context.batch.names.length,8);assert.equal(row.context.batch.namesOmitted,16);assert.equal(row.polls,9999);assert.equal(row.associations[0].firstObservedSelection.phase,'warm-compile-world');assert.equal(JSON.stringify(snapshot).includes('10000'),false);
 report({event:'finished',at:9,polls:10000,outcome:'resolved',pendingCount:0,pendingIds:[]});assert.equal(collector.snapshot().active.length,0);assert.equal(collector.snapshot().completed,1);
});

test('cancel/replacement clears owned job summaries without deleting the next owner',async()=>{
 const scope={__desktopSmokeStarted:true},old={loading:new AbortController()},bridge=installLoadingReadinessObservation(old,{scope});old.loadingReadinessObservation=bridge;
 const gl={isContextLost:()=>false},program={id:23,isReady:()=>false};const rows=[];const reporter=old.onLoadingCompileJob({start:1});const pending=compileGpuPreparation({compile:()=>new Set([{}]),properties:{get:()=>({currentProgram:program})}},{},{},{},{check(){if(old.loading.signal.aborted)throw Error('cancelled');},signal:old.loading.signal,onProgress:row=>{rows.push(row);reporter(row);},pollIntervalMs:1});
 const next={loading:new AbortController()},other=installLoadingReadinessObservation(next,{scope}),callable=scope.__desktopSmokeLoadingReadiness;old.loading.abort();await assert.rejects(pending,/cancelled/);assert.equal(scope.__desktopSmokeLoadingReadiness,callable);assert.equal(bridge.compilationSnapshot().active.length,0);assert.equal(old.onLoadingCompileJob,undefined);assert.equal(rows.at(-1).outcome,'rejected');other.release();
});

test('source proves OFF diagnostic allocations/clock/query path and existing poll cadence',async()=>{
 const source=await readFile(new URL('../tools/experiments/compile-gpu-preparation.js',import.meta.url),'utf8');assert.match(source,/const associations=observe\?\[\]:null/);assert.match(source,/pollIntervalMs=10/);assert.equal(source.match(/program\.isReady\(\)/g)?.length,1);assert.equal(source.includes('getProgramParameter'),false);assert.equal(source.includes('createQuery'),false);
 const helper=await readFile(new URL('../src/rendering/loading-readiness-snapshot.js',import.meta.url),'utf8');assert.equal(helper.includes('program.isReady'),false);assert.equal(helper.includes('getProgramParameter'),false);
});


test('bridge chains previous factory/progress hooks, contains faults and restores by identity',()=>{
 const calls=[],scope={__desktopSmokeStarted:true},factoryReceiver={},eventReceiver={};function prior(...args){calls.push({kind:'factory',receiver:this,args});return function(...rows){calls.push({kind:'progress',receiver:this,args:rows});return 42;};}
 const world={loading:new AbortController(),onLoadingCompileJob:prior},bridge=installLoadingReadinessObservation(world,{scope}),factory=world.onLoadingCompileJob,context={start:1};const progress=factory.call(factoryReceiver,context,'tail');const selected={event:'selected',at:2,selectedCount:0,associations:[]};assert.equal(progress.call(eventReceiver,selected,'tail'),42);assert.equal(calls[0].receiver,factoryReceiver);assert.deepEqual(calls[0].args,[context,'tail']);assert.equal(calls[1].receiver,eventReceiver);assert.deepEqual(calls[1].args,[selected,'tail']);
 bridge.release();assert.equal(world.onLoadingCompileJob,prior);progress(selected);assert.equal(calls.length,2);assert.equal(factory(context),null);assert.equal(bridge.compilationSnapshot().active.length,0);
 const replacement=()=>{};const next=installLoadingReadinessObservation(world,{scope});world.onLoadingCompileJob=replacement;next.release();assert.equal(world.onLoadingCompileJob,replacement);
 const failing={loading:new AbortController(),onLoadingCompileJob:()=>{throw Error('factory');}},faultBridge=installLoadingReadinessObservation(failing,{scope});assert.doesNotThrow(()=>failing.onLoadingCompileJob(context)({event:'finished',outcome:'resolved'}));faultBridge.release();
 const progressFail={loading:new AbortController(),onLoadingCompileJob:()=>()=>{throw Error('progress');}},last=installLoadingReadinessObservation(progressFail,{scope});assert.doesNotThrow(()=>progressFail.onLoadingCompileJob(context)({event:'finished',outcome:'resolved'}));last.release();
});

test('clear is terminal for old collector: late events and future jobs cannot repopulate',()=>{
 const collector=createLoadingCompileJobTracker(),event=collector.create({start:1});collector.clear();event({event:'selected',selectedCount:1,associations:[{programId:23}]});collector.create({start:2})({event:'selected',selectedCount:1,associations:[{programId:20}]});assert.equal(collector.snapshot().active.length,0);assert.equal(collector.snapshot().started,1);
});
