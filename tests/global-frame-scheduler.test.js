import test from 'node:test';
import assert from 'node:assert/strict';
import {GlobalFrameScheduler} from '../src/app/global-frame-scheduler.js';
import {prepareTerrainChunk} from '../src/rendering/prepare-terrain-chunk.js';
function rig(){let time=0,timestamp=0;const scheduler=new GlobalFrameScheduler({now:()=>time});return {scheduler,spend:n=>time+=n,frame(cpu=4){timestamp+=1000/60;time=timestamp;scheduler.beginFrame(timestamp);time+=cpu;scheduler.endFrame();},warm(){for(let i=0;i<60;i++)this.frame();}};}
test('only presentation advances work; a complete private group is published',async()=>{
 const r=rig();r.warm();let units=0;const group={};
 const world={quality:'media',*prepareTerrainSteps(){for(let i=0;i<20;i++){units++;r.spend(1);yield;}return group;}};
 const result=prepareTerrainChunk(world,{cx:0,cz:0},()=>true,{scheduler:r.scheduler});
 assert.equal(units,0);r.frame();assert.ok(units>0&&units<20);
 for(let i=0;i<20;i++)r.frame();assert.equal((await result).preparedGroup,group);assert.equal(r.scheduler.snapshot().pending,0);
});
test('revision invalidation closes private resources without publishing',async()=>{
 const r=rig();r.warm();let valid=true,closed=0;
 function* work(){try{for(let i=0;i<20;i++){r.spend(1);yield;}}finally{closed++;}}
 const result=r.scheduler.submit(work(),{valid:()=>valid});r.frame();valid=false;r.frame();assert.equal(await result,null);assert.equal(closed,1);
});
test('replacement and abort settle cancelled jobs immediately',async()=>{
 const r=rig(),abort=new AbortController();function* work(){yield;return 1;}
 const a=r.scheduler.submit(work(),{key:'chunk'}),b=r.scheduler.submit(work(),{key:'chunk',signal:abort.signal});abort.abort();assert.equal(await a,null);assert.equal(await b,null);assert.equal(r.scheduler.snapshot().pending,0);
});
test('mandatory CPU has precedence even over overdue jobs',()=>{
 const r=rig();r.warm();let ran=false;r.scheduler.submit((function*(){ran=true;yield;})(),{deadline:0});r.frame(17);assert.equal(ran,false);r.frame(4);assert.equal(ran,true);
});
test('statistics expire after two seconds and do not label intervals GPU time',()=>{
 const r=rig();r.warm();r.frame(15);assert.ok(r.scheduler.snapshot().p99>0);for(let i=0;i<140;i++)r.frame();assert.ok(r.scheduler.samples.length<=121);assert.equal(r.scheduler.snapshot().cpu95,4);
});

test('slow presentation intervals alone do not permanently starve cheap work',async()=>{
 let time=0;const scheduler=new GlobalFrameScheduler({now:()=>time});
 const frame=()=>{time+=33.33;scheduler.beginFrame(time);time+=4;scheduler.endFrame();};
 for(let i=0;i<60;i++)frame();let ran=false;
 const result=scheduler.submit((function*(){ran=true;return 1;})());frame();assert.equal(ran,true);assert.equal(await result,1);
});

test('an expired deadline borrows one bounded unit instead of starving; mandatory overload still wins',async()=>{
 let time=1000;const scheduler=new GlobalFrameScheduler({now:()=>time});let units=0;
 const job=scheduler.submit((function*(){units++;time+=5;yield;units++;return 2;})(),{deadline:0,estimateMs:5});
 scheduler.beginFrame(time);time+=12;scheduler.endFrame();assert.equal(units,1);assert.equal(scheduler.snapshot().deadlineLoans,1);
 time+=30;scheduler.beginFrame(time);time+=18;scheduler.endFrame();assert.equal(units,1);
 time+=30;scheduler.beginFrame(time);time+=4;scheduler.endFrame();assert.equal(await job,2);
});
