import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {MessageChannel} from 'node:worker_threads';
import {Scene} from 'three';
import {createConfirmedHistoricalClock} from '../src/rendering/confirmed-historical-clock.js';
import {createConfirmedTimelinePump} from '../src/rendering/confirmed-timeline-pump.js';
import {createWebGpuAnimalRoster} from '../src/rendering/webgpu-animal-roster.js';
import {createWebGpuGuardianAttack} from '../src/rendering/webgpu-guardian-attack.js';
import {beginWebGpuGuardianImpact} from '../src/rendering/webgpu-guardian-impact.js';
import {createConfirmedPresentationClock} from '../src/rendering/confirmed-presentation-clock.js';
import {createConfirmedPresentationStream} from '../src/rendering/confirmed-presentation-stream.js';
import {openVisualStream} from '../src/simulation/visual-publication-stream.js';
import {deserialize,serialize} from '../src/persistence/snapshots.js';

// Run the actual Worker message branch without a browser or WebGPU device.
// Only the surface bootstrap is substituted; dispatch and its imported impact
// coordinator are the production source. No historical certificate is enabled.
function workerMessage(surface,messages){
 let source=readFileSync(new URL('../src/rendering/webgpu-world-worker.js',import.meta.url),'utf8');
 source=source.replace(/^import .*;\r?\n/gm,'').replaceAll('import.meta.env.DEV','false');
 source=source.replace("function fail(error){", "phase='running';surface=testSurface;function fail(error){");
 const worker={};new Function('self','testSurface','createWebGpuSurfaceOwner','beginWebGpuGuardianImpact','postMessage',source)(worker,surface,()=>({close:async()=>{}}),beginWebGpuGuardianImpact,message=>messages.push(message));return worker.onmessage;
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function setup({onCommit=()=>{}}={}){
 let now=0,sequence=0,lastElapsed=0,commits=0,resolveInput=null,rejectInput=null;const inputs=[],messages=[];
 const segments={version:1,start:0,end:1,startPauses:[],endPauses:[],complete:true,segments:[{start:0,end:1,realDuration:1,rate:1}]};
 const stream={status:()=>({closed:false,sequence,lastElapsed}),timelineStatus:()=>({receivedElapsed:1}),lastConfirmedClockSegments:()=>segments,nextTimelineBoundary:()=>sequence===0?{sequence:1,elapsed:1}:null,advanceNextTimelineBoundary(){sequence=1;lastElapsed=1;commits++;onCommit();return true;},previewNextMotionBoundary:()=>({sequence:1,start:0,end:1,reasons:[],safeForAutonomousPlayback:true,clockSegments:segments})};
 stream.submitInput=(id,command)=>{inputs.push({id,command});return new Promise((resolve,reject)=>{resolveInput=resolve;rejectInput=reject;});};
 const clock=createConfirmedHistoricalClock({initialElapsed:0,now:()=>now}),pump=createConfirmedTimelinePump({stream,historicalPlayback:{clock,now:()=>now,certify:value=>value,start:()=>true,finish(){},abort(){},isCurrent:()=>true}});
 const state={elapsed:0,events:[],raid:{animals:[{id:'a',species:'hyena',status:'walking',x:0,z:0,radius:.7}]}},scene=new Scene(),bank={tick(){},dispose(){}},roster=createWebGpuAnimalRoster({scene,residency:{get:()=>null},state,assetBank:bank,createAnimal:()=>({update(){},dispose(){}})}),guardian=createWebGpuGuardianAttack({scene,state,renderer:{backend:{isWebGPUBackend:true}},clock:()=>now,loadModel:()=>new Promise(()=>{})});
 roster.sync();await flush();pump.advance();const surface={timelinePump:pump,animalRoster:roster,guardianAttack:guardian,stream};
 return {state,clock,pump,roster,guardian,inputs,messages,send:workerMessage(surface,messages),resolveInput:value=>resolveInput(value),rejectInput:error=>rejectInput(error),setNow:value=>{now=value;},get commits(){return commits;},dispose(){pump.dispose();clock.dispose();roster.dispose();guardian.dispose();}};
}
const command={kind:'castAttack',id:'hit',targetId:'a',selection:{origin:{x:0,y:2,z:0},contact:{x:0,y:1,z:0}}};
test('support invalidation closes the real stream without acknowledging its pending boundary',async()=>{
 const state=deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString()),start=state.elapsed,end=start+1,channel=new MessageChannel(),wire=[];let now=0,valid=true,notifications=0;
 channel.port1.on('message',message=>wire.push(message));const segments={version:1,start,end,startPauses:[],endPauses:[],complete:true,segments:[{start,end,realDuration:1,rate:1}]},clock=createConfirmedHistoricalClock({initialElapsed:start,now:()=>now});
 const visual=openVisualStream(channel.port1,'s',()=>{},{receiptAcknowledgements:true,onPresentationInput:()=>{}}),terrain={ready:()=>true,confirm(){}},stream=createConfirmedPresentationStream({port:channel.port2,session:'s',state,terrain,presentationClock:clock,allowPresentationInputs:true,timeline:{manualBoundaries:true,maxPublications:8,maxBytes:100000000}});
 stream.previewNextMotionBoundary=()=>({sequence:1,start,end,reasons:[],safeForAutonomousPlayback:true,clockSegments:segments});const pump=createConfirmedTimelinePump({stream,historicalPlayback:{clock,now:()=>now,certify:value=>value,start:()=>true,finish(){},abort(){},isCurrent:()=>valid,onInvalidated(_preview,reason){notifications++;const error=Error(reason);error.code='historical-playback-invalidated';throw error;}}});
 try{const next=deserialize(serialize(state));next.elapsed=end;visual.publish({session:'s',sequence:1,snapshot:serialize(next),elapsed:end,events:[],physicsPose:null},true);await new Promise(resolve=>setTimeout(resolve,20));assert.equal(pump.advance(),0);const pending=stream.submitInput(3,command);const rejected=assert.rejects(pending,/disposed/);await flush();valid=false;now=250;assert.throws(()=>pump.advance(),error=>error.code==='historical-playback-invalidated');assert.equal(notifications,1);assert.equal(stream.status().sequence,0);assert.equal(clock.elapsed,start+.25);pump.dispose();stream.dispose();await rejected;await flush();assert.equal(wire.some(message=>message.kind==='publicationAck'&&message.sequence===1),false);}finally{pump.dispose();stream.dispose();clock.dispose();visual.close();}
});
test('Worker rejects an unavailable impact before suspending an active boundary',async()=>{
 const f=await setup();try{f.state.raid.animals[0].magicDown={phase:'rolling'};f.setNow(250);await f.send({data:{kind:'guardianBegin',command}});assert.equal(f.pump.status().historicalHold,null);assert.equal(f.guardian.status().active,null);f.setNow(1000);assert.equal(f.pump.advance(),1);assert.equal(f.commits,1);}finally{f.dispose();}
});
test('a visually rejected attack still reaches authority without retaining the earlier boundary',async()=>{
 const f=await setup();try{f.state.raid.animals[0].magicDown={phase:'rolling'};f.setNow(250);await f.send({data:{kind:'guardianBegin',command}});const pending=f.send({data:{kind:'presentation-input',id:12,inputId:3,command}});await flush();assert.deepEqual(f.inputs,[{id:3,command}]);assert.equal(f.pump.status().historicalHold,null);assert.deepEqual(f.messages,[],'the Worker does not invent an early authority result');f.setNow(1000);assert.equal(f.pump.advance(),1);f.resolveInput({sequence:2,value:false,rejection:'unavailable'});await pending;assert.deepEqual(f.messages,[{kind:'presentation-result',id:12,result:{sequence:2,value:false,rejection:'unavailable'}}]);}finally{f.dispose();}
});
test('an active provisional gesture does not suspend the preceding history',async()=>{
 const f=await setup();try{f.setNow(250);await f.send({data:{kind:'guardianBegin',command}});const pending=f.send({data:{kind:'presentation-input',id:12,inputId:3,command}});await flush();assert.equal(f.pump.status().historicalHold,null);assert.equal(f.commits,0);assert.equal(f.guardian.status().active?.id,'hit');assert.equal(f.roster.status().provisionalImpacts,0);f.setNow(1000);assert.equal(f.pump.advance(),1);assert.equal(f.roster.status().provisionalImpacts,1);f.resolveInput({sequence:2,value:true});await pending;}finally{f.dispose();}
});
test('Worker rejects a malformed visual gesture without holding its boundary',async()=>{
 const f=await setup();try{f.setNow(250);await f.send({data:{kind:'guardianBegin',command:{...command,selection:{origin:null,contact:null}}}});assert.equal(f.pump.status().historicalHold,null);assert.equal(f.guardian.status().active,null);f.setNow(1000);assert.equal(f.pump.advance(),1);}finally{f.dispose();}
});
test('Worker starts the gesture and defers body feedback to the previous endpoint',async()=>{
 const f=await setup();try{f.setNow(250);await f.send({data:{kind:'guardianBegin',command}});assert.equal(f.pump.status().historicalHold,null);assert.equal(f.guardian.status().active?.id,'hit');assert.equal(f.roster.status().provisionalImpacts,0);assert.equal(f.commits,0);f.setNow(1000);assert.equal(f.pump.advance(),1);assert.equal(f.roster.status().provisionalImpacts,1);}finally{f.dispose();}
});
test('Worker rechecks the target if suspension commits a boundary',async()=>{
 let f;f=await setup({onCommit:()=>{f.state.raid.animals[0].magicDown={phase:'falling'};}});try{f.setNow(250);await f.send({data:{kind:'guardianBegin',command}});f.setNow(1000);assert.equal(f.pump.advance(),1);assert.equal(f.commits,1);assert.equal(f.guardian.status().active,null);assert.equal(f.roster.status().provisionalImpacts,0);assert.equal(f.pump.status().historicalPending,null);}finally{f.dispose();}
});
test('confirmed physical pose at the boundary prevents duplicate provisional impact',async()=>{
 let f;f=await setup({onCommit:()=>{f.roster.setPoses(new Map([['a',{actorId:'a',active:true}]]));}});try{f.setNow(250);await f.send({data:{kind:'guardianBegin',command}});f.setNow(1000);assert.equal(f.pump.advance(),1);assert.equal(f.roster.status().provisionalImpacts,0);assert.equal(f.guardian.status().active,null);}finally{f.dispose();}
});
test('early rejected gesture cancels the deferred body impact',async()=>{
 const f=await setup();try{f.setNow(250);await f.send({data:{kind:'guardianBegin',command}});await f.send({data:{kind:'guardianResolve',id:'hit',accepted:false}});f.setNow(1000);assert.equal(f.pump.advance(),1);assert.equal(f.guardian.status().active,null);assert.equal(f.roster.status().provisionalImpacts,0);}finally{f.dispose();}
});
test('a hidden or stalled interval does not start a late provisional fall',async()=>{
 const f=await setup();try{f.setNow(250);await f.send({data:{kind:'guardianBegin',command}});const pending=f.send({data:{kind:'presentation-input',id:12,inputId:3,command}});await flush();f.pump.setHistoricalVisibility(true);await new Promise(resolve=>setTimeout(resolve,270));f.pump.setHistoricalVisibility(false);f.setNow(1000);assert.equal(f.pump.advance(),1);assert.equal(f.roster.status().provisionalImpacts,0);assert.equal(f.guardian.status().active?.id,'hit');assert.deepEqual(f.messages,[]);f.resolveInput({sequence:2,value:true});await pending;assert.deepEqual(f.messages,[{kind:'presentation-result',id:12,result:{sequence:2,value:true}}]);}finally{f.dispose();}
});
test('an input transport failure cancels deferred feedback without holding the boundary',async()=>{
 const f=await setup();try{f.setNow(250);await f.send({data:{kind:'guardianBegin',command}});const pending=f.send({data:{kind:'presentation-input',id:12,inputId:3,command}});await flush();f.rejectInput(Error('input failed'));await pending;assert.equal(f.guardian.status().active,null);f.setNow(1000);assert.equal(f.pump.advance(),1);assert.equal(f.roster.status().provisionalImpacts,0);assert.deepEqual(f.messages,[{kind:'presentation-error',id:12,message:'input failed'}]);}finally{f.dispose();}
});
for(const accepted of [false,true])test(`real ordered visual stream applies an ${accepted?'accepted':'unavailable'} attack after the earlier moving boundary`,async()=>{
 const state=deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString()),animal=state.raid.animals[0],start=state.elapsed,end=start+1,channel=new MessageChannel(),messages=[],order=[];if(!accepted)animal.magicStunUntil=end+1;
 let now=0;const segments={version:1,start,end,startPauses:[],endPauses:[],complete:true,segments:[{start,end,realDuration:1,rate:1}]},historicalClock=createConfirmedHistoricalClock({initialElapsed:start,now:()=>now}),presentationClock=createConfirmedPresentationClock(start),terrain={ready:()=>true,confirm:sequence=>order.push(['terrain',sequence])};
 let visual;visual=openVisualStream(channel.port1,'s',()=>{},{receiptAcknowledgements:true,onPresentationInput:input=>{order.push(['input',input.id]);const next=deserialize(serialize(state));next.elapsed=end;visual.publish({session:'s',sequence:2,snapshot:serialize(next),elapsed:end,events:[],physicsPose:null,presentationInput:input.id,value:accepted,...(accepted?{}:{rejection:'unavailable'})},false);}});
 const stream=createConfirmedPresentationStream({port:channel.port2,session:'s',state,terrain,presentationClock,allowPresentationInputs:true,timeline:{manualBoundaries:true,maxPublications:8,maxBytes:100000000},onConfirmed:message=>{order.push(['confirmed',message.sequence]);roster.sync();}});
 const preview={sequence:1,start,end,reasons:[],safeForAutonomousPlayback:true,clockSegments:segments};stream.previewNextMotionBoundary=()=>stream.status().sequence===0?preview:null;
 const pump=createConfirmedTimelinePump({stream,historicalPlayback:{clock:historicalClock,now:()=>now,certify:value=>value,start:()=>true,finish(){},abort(){},isCurrent:()=>true}}),scene=new Scene(),roster=createWebGpuAnimalRoster({scene,residency:{get:()=>null},state,assetBank:{tick(){},dispose(){}},createAnimal:()=>({update(){},dispose(){}})}),guardian=createWebGpuGuardianAttack({scene,state,renderer:{backend:{isWebGPUBackend:true}},clock:()=>now,loadModel:()=>new Promise(()=>{})}),send=workerMessage({timelinePump:pump,animalRoster:roster,guardianAttack:guardian,stream},messages);
 try{
  roster.sync();await flush();const next=deserialize(serialize(state));next.elapsed=end;visual.publish({session:'s',sequence:1,snapshot:serialize(next),elapsed:end,events:[],physicsPose:null},true);await new Promise(resolve=>setTimeout(resolve,20));assert.equal(pump.advance(),0);
  const attack={...command,targetId:animal.id};now=250;await send({data:{kind:'guardianBegin',command:attack}});const pending=send({data:{kind:'presentation-input',id:12,inputId:3,command:attack}});await new Promise(resolve=>setTimeout(resolve,20));assert.equal(pump.status().historicalHold,null);assert.equal(stream.status().sequence,0);assert.equal(roster.status().provisionalImpacts,0);assert.equal(guardian.status().active?.id??null,accepted?'hit':null);assert.deepEqual(messages,[]);
  now=1000;assert.equal(pump.advance(1),1);assert.equal(stream.status().sequence,1);assert.equal(roster.status().provisionalImpacts,accepted?1:0);await new Promise(resolve=>setTimeout(resolve,20));assert.equal(pump.advance(1),1);await pending;assert.equal(stream.status().sequence,2);assert.deepEqual(messages,[{kind:'presentation-result',id:12,result:{sequence:2,value:accepted,...(accepted?{}:{rejection:'unavailable'})}}]);assert.ok(order.findIndex(item=>item[0]==='confirmed'&&item[1]===1)<order.findIndex(item=>item[0]==='confirmed'&&item[1]===2));
 }finally{pump.dispose();historicalClock.dispose();presentationClock.dispose();stream.dispose();visual.close();roster.dispose();guardian.dispose();}
});
