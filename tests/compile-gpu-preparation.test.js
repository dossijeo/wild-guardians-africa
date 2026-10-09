import test from 'node:test';
import assert from 'node:assert/strict';
import {compileGpuPreparation} from '../tools/experiments/compile-gpu-preparation.js';

function fixture(programs){
 const materials=programs.map(()=>({})),selected=new Map(materials.map((material,index)=>[material,programs[index]]));
 let compilations=0,lookups=0;
 const root={},camera={},scene={};
 const renderer={
  compile:(r,c,s)=>{assert.equal(r,root);assert.equal(c,camera);assert.equal(s,scene);compilations++;return new Set(materials);},
  compileAsync:()=>assert.fail('uncancellable Three polling must not run'),
  properties:{get:material=>{lookups++;return {currentProgram:selected.get(material)};}}
 };
 return {renderer,root,camera,scene,selected,materials,counts:()=>({compilations,lookups}),run:options=>compileGpuPreparation(renderer,root,camera,scene,options)};
}

test('normal target recipe compiles once and accepts already-ready selected programs',async()=>{
 let queries=0;const f=fixture([{isReady:()=>{queries++;return true;}}]);
 await f.run({check:()=>assert.ok(true)});
 assert.deepEqual(f.counts(),{compilations:1,lookups:1});assert.equal(queries,1);
});

test('cancelled owner prevents even synchronous submission',async()=>{
 const f=fixture([{isReady:()=>assert.fail('query')}]),reason=Error('closed');
 await assert.rejects(f.run({check:()=>{throw reason;}}),error=>error===reason);
 assert.deepEqual(f.counts(),{compilations:0,lookups:0});
});

test('selected program is snapshotted once while borrowed material is restored',async()=>{
 let queries=0;const program={isReady:()=>++queries>=2},f=fixture([program]);
 const waiting=f.run({check:()=>{},pollIntervalMs:5});
 f.selected.delete(f.materials[0]);await waiting;
 assert.equal(queries,2);assert.equal(f.counts().lookups,1);
});

test('deduplicates shared programs and stops querying already completed variants',async()=>{
 let doneQueries=0,pendingQueries=0;
 const done={isReady:()=>{doneQueries++;return true;}},pending={isReady:()=>++pendingQueries>=3};
 const f=fixture([done,done,pending]);await f.run({check:()=>{},pollIntervalMs:5});
 assert.equal(doneQueries,1);assert.equal(pendingQueries,3);
});

test('an abort removes owned polling without querying disposed programs later',async()=>{
 const owner=new AbortController(),reason=Error('disposed');let queries=0,disposed=false;
 const f=fixture([{isReady:()=>{assert.equal(disposed,false);queries++;return false;}}]);
 const waiting=f.run({check:()=>{if(owner.signal.aborted)throw reason;},signal:owner.signal,pollIntervalMs:5});
 await new Promise(resolve=>setImmediate(resolve));owner.abort(reason);disposed=true;
 await assert.rejects(waiting,error=>error===reason);
 const finalQueries=queries;await new Promise(resolve=>setTimeout(resolve,20));assert.equal(queries,finalQueries);
});

test('context generation change rejects before querying a stale selected program',async()=>{
 let epoch=0,queries=0;
 const f=fixture([{isReady:()=>{assert.equal(epoch,0);queries++;return false;}}]);
 const waiting=f.run({check:()=>{if(epoch!==0)throw Error('context changed');},pollIntervalMs:5});
 epoch=2;await assert.rejects(waiting,/context changed/);
 const finalQueries=queries;await new Promise(resolve=>setTimeout(resolve,15));assert.equal(queries,finalQueries);
});

test('never-ready driver has a bounded caller deadline with no remaining poll',async()=>{
 const started=performance.now();let queries=0;
 const f=fixture([{isReady:()=>{queries++;return false;}}]);
 await assert.rejects(f.run({check:()=>{if(performance.now()-started>15)throw Error('deadline');},pollIntervalMs:5}),/deadline/);
 const finalQueries=queries;await new Promise(resolve=>setTimeout(resolve,15));assert.equal(queries,finalQueries);
});

test('readiness fault propagates intact and stops polling',async()=>{
 const failure=Error('GL query failed');let queries=0;
 const f=fixture([{isReady:()=>{if(++queries===2)throw failure;return false;}}]);
 await assert.rejects(f.run({check:()=>{},pollIntervalMs:5}),error=>error===failure);
 await new Promise(resolve=>setTimeout(resolve,15));assert.equal(queries,2);
});

test('missing readiness program fails rather than claiming completion',async()=>{
 const f=fixture([{}]);await assert.rejects(f.run({check:()=>{}}),/no selected readiness program/);
});

test('owner invalidation inside the final readiness query cannot produce acceptance',async()=>{
 let closed=false;const f=fixture([{isReady:()=>{closed=true;return true;}}]);
 await assert.rejects(f.run({check:()=>{if(closed)throw Error('closed');}}),/closed/);
});


test('explicit all-variant selection snapshots once and waits every borrowed recipe',async()=>{
 let allReady=false,selectedReady=true,lookups=0;
 const first={isReady:()=>selectedReady},second={isReady:()=>allReady},f=fixture([first]);
 const properties={currentProgram:first,programs:new Map([['instanced',first],['plain',second]])};f.renderer.properties.get=()=>{lookups++;return properties;};
 let selectors=0,completed=false;const pending=f.run({check:()=>{},pollIntervalMs:5,selectPrograms:(p,material)=>{selectors++;assert.equal(material,f.materials[0]);return p.programs.values();}}).then(()=>{completed=true;});
 properties.programs.clear();await Promise.resolve();assert.equal(completed,false);allReady=true;await pending;assert.equal(selectors,1);assert.equal(lookups,1);
});

test('default selector still ignores unrelated pending variants',async()=>{
 const current={isReady:()=>true},f=fixture([current]);f.renderer.properties.get=()=>({currentProgram:current,programs:new Map([['other',{isReady:()=>assert.fail('unselected variant')} ]])});
 await f.run({check:()=>{}});
});

test('invalid or empty explicit selection never claims material readiness',async()=>{
 const f=fixture([{isReady:()=>true}]);
 await assert.rejects(f.run({check:()=>{},selectPrograms:()=>[]}),/no selected readiness program/);
 await assert.rejects(f.run({check:()=>{},selectPrograms:()=>null}),/no selected readiness program/);
 await assert.rejects(f.run({check:()=>{},selectPrograms:42}),/Invalid GPU program selector/);assert.equal(f.counts().compilations,2);
});


import {waitGpuPrograms} from '../tools/experiments/compile-gpu-preparation.js';
test('readiness poll witness measures synchronous query cost and pending native IDs separately from awaited time',async()=>{
 let clock=0,ready=false;const rows=[],program={id:71,isReady:()=>{clock+=3;return ready;}};
 const pending=waitGpuPrograms(new Set([program]),{check:()=>{},pollIntervalMs:5,now:()=>clock,onPoll:row=>rows.push(row)});assert.equal(rows.length,1);assert.equal(rows[0].duration,3);assert.equal(rows[0].checkedProgramCount,1);assert.equal(rows[0].pendingProgramCount,1);assert.deepEqual(rows[0].pendingProgramIds,[71]);assert.match(rows[0].scope,/not GPU/);clock=100;ready=true;await pending;assert.equal(rows.at(-1).duration,3);assert.equal(rows.at(-1).pendingProgramCount,0);assert.equal(rows.at(-1).start,100);
});
test('poll witness off never calls the diagnostic clock and throwing diagnostics preserve driver errors',async()=>{
 await waitGpuPrograms(new Set([{isReady:()=>true}]),{check:()=>{},now:()=>assert.fail('diagnostic clock off')});const original=Error('driver query');await assert.rejects(waitGpuPrograms(new Set([{isReady:()=>{throw original;}}]),{check:()=>{},onPoll:()=>{throw Error('diagnostic');}}),error=>error===original);
});
