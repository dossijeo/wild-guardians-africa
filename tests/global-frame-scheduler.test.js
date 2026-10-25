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

test('ready promise continuations share one presentation budget without another frame',async()=>{
 let time=1000;const scheduler=new GlobalFrameScheduler({now:()=>time});let calls=0;
 const work=async()=>{for(let i=0;i<5;i++)await scheduler.submit((function*(){calls++;time+=.1;return i;})(),{deadline:0});};
 const pending=work();scheduler.beginFrame(time);time+=2;await scheduler.endFrame();await pending;
 assert.equal(calls,5);assert.equal(scheduler.snapshot().completed,5);assert.ok(scheduler.snapshot().continuationTurns>0);
});

test('aging measures time without service rather than privileging an old endless job',async()=>{
 let time=1000;const scheduler=new GlobalFrameScheduler({now:()=>time});const order=[];
 const older=scheduler.submit((function*(){for(let i=0;i<20;i++){order.push('old');time+=1;yield;}})(),{key:'old',deadline:0});
 time+=100;const newer=scheduler.submit((function*(){order.push('new');return 1;})(),{deadline:0});
 scheduler.beginFrame(time);time+=2;await scheduler.endFrame();assert.ok(order.indexOf('new')>=0&&order.indexOf('new')<3);assert.equal(await newer,1);scheduler.cancel('old');await older;
});
test('a failing cost estimator closes only its job and leaves other work executable',async()=>{
 let time=1000;const scheduler=new GlobalFrameScheduler({now:()=>time});let closed=false,ran=false;
 const iterator={next:()=>({done:false}),return:()=>{closed=true;}};
 const bad=scheduler.submit(iterator,{estimate:()=>{throw Error('estimate fault');},deadline:0});const rejection=assert.rejects(bad,/estimate fault/);
 const good=scheduler.submit((function*(){ran=true;return 1;})(),{deadline:0});scheduler.beginFrame(time);time+=2;await scheduler.endFrame();await rejection;await good;
 assert.equal(closed,true);assert.equal(ran,true);assert.equal(scheduler.snapshot().failed,1);assert.equal(scheduler.snapshot().pending,0);
});


test('admission diagnostics are optional and distinguish late callbacks from CPU work',async()=>{
 let time=100;const scheduler=new GlobalFrameScheduler({now:()=>time,diagnostics:true});
 const result=scheduler.submit((function*(){return 1;})(),{key:'job'});
 scheduler.beginFrame(70);time+=2;await scheduler.endFrame();const d=scheduler.snapshot().admissionDiagnostics;
 assert.equal(d.idlePendingFrames,1);assert.equal(d.noHeadroom,1);assert.equal(d.mandatoryPressure,0);assert.equal(d.latenessSum,30);assert.equal(d.cpuSum,2);
 scheduler.cancel('job');await result;assert.equal(new GlobalFrameScheduler().snapshot().admissionDiagnostics,undefined);
});


test('historical oversized estimates recover without permanent starvation or dropping CPU guards',async()=>{
 let time=1000;const scheduler=new GlobalFrameScheduler({now:()=>time});let calls=0;
 const task=key=>scheduler.submit((function*(){calls++;time+=.2;return key;})(),{key,deadline:1000,estimate:()=>14});
 const a=task('a'),b=task('b');
 const frame=async(cpu)=>{scheduler.beginFrame(time);time+=cpu;await scheduler.endFrame();};
 await frame(4);assert.equal(calls,0);
 time=3100;await frame(17);assert.equal(calls,0);
 time=3200;await frame(4);assert.equal(calls,1);assert.equal(await a,'a');assert.equal(scheduler.snapshot().oversizeRecoveries,1);
 time=3300;await frame(4);assert.equal(calls,1);
 time=5300;await frame(4);assert.equal(await b,'b');assert.equal(calls,2);assert.equal(scheduler.snapshot().pending,0);
});


test('required streamed terrain starts without a fresh grace period on late presentation',async()=>{
 let time=1000,started=false;const scheduler=new GlobalFrameScheduler({now:()=>time});
 const group={},slices=[];
 const world={quality:'baja',onTerrainPreparationSlice:row=>slices.push(row),*prepareTerrainSteps(){started=true;time+=.1;yield 'finish';return group;}};
 const result=prepareTerrainChunk(world,{cx:1,cz:2},()=>true,{scheduler,now:()=>time});
 scheduler.beginFrame(time-16);time+=4;await scheduler.endFrame();
 assert.equal(started,true);assert.equal(slices[0].waitMs,4);assert.ok(slices[0].ms<.11);
 time+=17;scheduler.beginFrame(time);time+=4;await scheduler.endFrame();
 assert.equal((await result).preparedGroup,group);assert.equal(scheduler.snapshot().pending,0);
});


test('dependency wait frees presentation capacity and resumes only on an admitted frame',async()=>{
 const r=rig();r.warm();let resolve,ran=0;const dependency=new Promise(done=>resolve=done);
 const pending=r.scheduler.submit((function*(){const value=yield {waitFor:dependency};ran++;return value;})());
 r.frame();assert.equal(r.scheduler.snapshot().waiting,1);
 const other=r.scheduler.submit((function*(){return 3;})());r.frame();assert.equal(await other,3);assert.equal(ran,0);
 resolve(17);await Promise.resolve();assert.equal(ran,0);r.frame();assert.equal(await pending,17);
});
test('cancelled dependency cannot resume or remove its replacement',async()=>{
 const r=rig();r.warm();let resolve,closed=0;const dependency=new Promise(done=>resolve=done);
 const old=r.scheduler.submit((function*(){try{yield {waitFor:dependency};assert.fail('stale resume');}finally{closed++;}})(),{key:'chunk'});
 r.frame();const next=r.scheduler.submit((function*(){return 9;})(),{key:'chunk'});assert.equal(await old,null);
 resolve(1);await Promise.resolve();r.frame();assert.equal(await next,9);assert.equal(closed,1);
});
test('failed dependency releases only its job and runs cleanup',async()=>{
 const r=rig();r.warm();let reject,closed=0;const dependency=new Promise((_,fail)=>reject=fail);
 const pending=r.scheduler.submit((function*(){try{yield {waitFor:dependency};}finally{closed++;}})());
 r.frame();const assertion=assert.rejects(pending,/worker failed/);reject(Error('worker failed'));await assertion;
 assert.equal(closed,1);assert.equal(r.scheduler.snapshot().waiting,0);assert.equal(r.scheduler.snapshot().failed,1);
});
test('terrain wrapper forwards dependency output but rejects a stale revision before publication',async()=>{
 for(const stale of [false,true]){const r=rig();r.warm();let resolve,closed=0;const dependency=new Promise(done=>resolve=done),group={};
 const world={quality:'media',*prepareTerrainSteps(){try{assert.equal(yield {label:'worker',waitFor:dependency},group);return group;}finally{closed++;}}};
 const pending=prepareTerrainChunk(world,{cx:0,cz:0},()=>true,{scheduler:r.scheduler});r.frame();if(stale)world.quality='baja';resolve(group);await Promise.resolve();r.frame();const result=await pending;assert.equal(stale?result:result.preparedGroup,stale?null:group);assert.equal(closed,1);}
});

test('required opt-in recovers a poisoned shared estimate without admitting optional work',async()=>{
 let time=1000,calls=0;const scheduler=new GlobalFrameScheduler({now:()=>time});
 const task=(key,allowBlockingRecovery)=>scheduler.submit((function*(){calls++;time+=4;return key;})(),{key,deadline:1000,estimate:()=>55.55,allowBlockingRecovery});
 const optional=task('optional',false),a=task('required-a',true),b=task('required-b',true);
 const frame=async(t,cpu)=>{time=t;scheduler.beginFrame(time);time+=cpu;await scheduler.endFrame();};
 await frame(4000,4);assert.equal(calls,0);
 await frame(6100,12);assert.equal(calls,0);
 await frame(6200,4);assert.equal(calls,1);assert.equal(await a,'required-a');
 await frame(6300,4);assert.equal(calls,1);
 await frame(11300,4);assert.equal(await b,'required-b');assert.equal(calls,2);
 assert.equal(scheduler.snapshot().blockingRecoveries,2);
 assert.equal(scheduler.snapshot().pending,1);scheduler.cancel('optional');await optional;
});

test('exceptional recovery never runs cancelled or invalidated required work',async()=>{
 let time=0,valid=true,calls=0,closed=0;const scheduler=new GlobalFrameScheduler({now:()=>time});
 const iterator=()=>({next(){calls++;return {done:true};},return(){closed++;return {done:true};}});
 const owner=new AbortController();
 const cancelled=scheduler.submit(iterator(),{deadline:0,estimate:()=>60,allowBlockingRecovery:true,signal:owner.signal});
 const invalidated=scheduler.submit(iterator(),{deadline:0,estimate:()=>60,allowBlockingRecovery:true,valid:()=>valid});
 owner.abort();valid=false;time=6000;scheduler.beginFrame(time);time+=2;await scheduler.endFrame();
 await Promise.all([cancelled,invalidated]);assert.equal(calls,0);assert.equal(closed,2);
 assert.equal(scheduler.snapshot().blockingRecoveries,0);assert.equal(scheduler.snapshot().pending,0);
});
