import * as THREE from 'three';
import {createWebGpuGuardianAttack} from '../src/rendering/webgpu-guardian-attack.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {emit,observePresentationGameEvents} from '../src/simulation/game.js';
import {createConfirmedPresentationStream} from '../src/rendering/confirmed-presentation-stream.js';
import {acceptLiveTerrainCheckpoint} from '../src/rendering/live-terrain-checkpoint.js';
import {createConfirmedMotionFeed} from '../src/rendering/confirmed-motion-feed.js';
import {serializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
const fixture=()=>deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString());
test('explicit recovery accepts ordered publications without emitting live acknowledgements',()=>{
 const state=fixture(),next=deserialize(serialize(state)),sent=[],confirmed=[],port={postMessage:value=>sent.push(value),close(){},start(){}};
 const stream=createConfirmedPresentationStream({port,session:'s',state,allowRecovery:true,terrain:{confirm:value=>confirmed.push(value)}});
 next.elapsed+=.05;stream.acceptRecovery({kind:'publication',session:'s',publication:{session:'s',sequence:1,snapshot:serialize(next),events:[],physicsPose:null},tick:true});
 assert.equal(state.elapsed,next.elapsed);assert.deepEqual(confirmed,[1]);assert.deepEqual(sent,[]);stream.dispose();
});
test('authority failure rejects pending visual input without manufacturing a result',async()=>{const state=fixture(),before=serialize(state),errors=[],port={postMessage(){},close(){},start(){}},stream=createConfirmedPresentationStream({port,session:'s',state,terrain:{confirm(){}},allowPresentationInputs:true,onError:error=>errors.push(error.message)}),pending=stream.submitInputForQa(1,{kind:'castAttack'});port.onmessage({data:{kind:'presentationFailure',session:'s',message:'authority lost'}});await assert.rejects(pending,/authority lost/);assert.deepEqual(errors,['authority lost']);assert.equal(serialize(state),before);assert.equal(stream.status().closed,true);});
test('work checkpoint acknowledgement waits for asynchronous preparation after state and terrain',async()=>{
 const state=fixture(),order=[],port={postMessage:m=>order.push(['ack',m]),close(){},start(){}},stream=createConfirmedPresentationStream({port,session:'s',state,terrain:{confirm:()=>order.push(['terrain'])},onConfirmed:()=>order.push(['confirmed']),prepareWorkCheckpoint:async message=>{order.push(['work']);return {version:1,sequence:message.sequence,effects:[]};}});port.onmessage({data:{kind:'publication',session:'s',publication:{session:'s',sequence:1,snapshot:serialize(state),events:[],physicsPose:null,terrainCheckpoint:{sequence:1,chunks:[]}}}});assert.deepEqual(order,[['terrain'],['confirmed']]);await new Promise(resolve=>setTimeout(resolve,0));assert.deepEqual(order.map(x=>x[0]),['terrain','confirmed','work','ack']);assert.equal(order[3][1].workCheckpoint.sequence,1);stream.dispose();
});
test('QA hold retains one confirmed publication without exposing events, terrain or its ACK',()=>{
 const state=fixture(),next=deserialize(serialize(state)),actor=state.raid.animals[0],before=serialize(state),order=[],port={postMessage:m=>order.push(['ack',m.sequence]),close(){},start(){}},stop=observePresentationGameEvents(state,event=>order.push(['event',event.id]));
 const stream=createConfirmedPresentationStream({port,session:'s',state,allowPresentationHold:true,terrain:{confirm:n=>order.push(['terrain',n])},onConfirmed:m=>order.push(['confirmed',m.sequence])});
 try{next.elapsed+=.05;next.raid.animals[0].x+=1;emit(next,'Test');const event=next.events.at(-1);stream.holdPresentation();port.onmessage({data:{kind:'publication',session:'s',publication:{session:'s',sequence:1,snapshot:serialize(next),events:[event]}}});
  assert.equal(serialize(state),before);assert.equal(state.raid.animals[0],actor);assert.deepEqual(order,[]);assert.equal(stream.status().sequence,0);assert.equal(stream.status().receivedSequence,1);assert.equal(stream.status().receivedElapsed,next.elapsed);assert.equal(stream.status().held,true);
  stream.releasePresentation();assert.equal(state.raid.animals[0],actor);assert.equal(serialize(state),serialize(next));assert.deepEqual(order,[['event',event.id],['terrain',1],['confirmed',1],['ack',1]]);assert.equal(stream.status().sequence,1);assert.equal(stream.status().held,false);
 }finally{stream.dispose();stop();}
});
test('QA hold cancellation before receipt resumes immediately; dispose with held state never acknowledges it',()=>{
 const state=fixture(),port={acks:[],postMessage(m){this.acks.push(m)},close(){this.closed=true},start(){}},stream=createConfirmedPresentationStream({port,session:'s',state,allowPresentationHold:true,terrain:{confirm(){}}});
 stream.holdPresentation();stream.releasePresentation();port.onmessage({data:{kind:'publication',session:'s',publication:{session:'s',sequence:1,snapshot:serialize(state),events:[]}}});assert.equal(port.acks.length,1);
 stream.holdPresentation();port.onmessage({data:{kind:'publication',session:'s',publication:{session:'s',sequence:2,snapshot:serialize(state),events:[]}}});stream.dispose();assert.equal(port.acks.length,1);assert.equal(port.closed,true);assert.throws(()=>stream.releasePresentation(),/not held/);
});
test('QA hold validates physical poses immediately but applies them only with their state',()=>{
 const state=fixture(),next=deserialize(serialize(state)),actor=next.raid.animals[0],order=[],port={postMessage:()=>order.push('ack'),close(){},start(){}},stop=observePresentationGameEvents(state,()=>order.push('event'));
 actor.magicDown={phase:'falling',since:next.elapsed,until:next.elapsed+2};emit(next,'Test');const transform=[0,0,0,0,0,0,1,1,1,1],pose={actorId:actor.id,active:true,root:transform,model:transform,bones:[]},stream=createConfirmedPresentationStream({port,session:'s',state,allowPresentationHold:true,terrain:{confirm:()=>order.push('terrain')},validatePhysics:()=>order.push('validate'),onPhysics:()=>order.push('physics')});
 try{stream.holdPresentation();port.onmessage({data:{kind:'publication',session:'s',publication:{session:'s',sequence:1,snapshot:serializeConfirmedState(next),events:[next.events.at(-1)],physicsPose:pose}}});assert.deepEqual(order,['validate']);stream.releasePresentation();assert.deepEqual(order,['validate','physics','event','terrain','ack']);}finally{stream.dispose();stop();}
});
test('QA hold fails closed on an unexpected second publication and never acknowledges either',()=>{
 const state=fixture(),errors=[],port={postMessage(){throw Error('unexpected ack')},close(){this.closed=true},start(){}},stream=createConfirmedPresentationStream({port,session:'s',state,allowPresentationHold:true,terrain:{confirm(){throw Error('unexpected terrain')}},onError:e=>errors.push(e)}),before=serialize(state);
 stream.holdPresentation();port.onmessage({data:{kind:'publication',session:'s',publication:{session:'s',sequence:1,snapshot:before,events:[]}}});port.onmessage({data:{kind:'publication',session:'s',publication:{session:'s',sequence:2,snapshot:before,events:[]}}});assert.match(errors[0].message,/Invalid presentation publication/);assert.equal(stream.status().closed,true);assert.equal(port.closed,true);assert.equal(serialize(state),before);
});
test('automatic checkpoint confirms terrain then acknowledges its exact sequence without rebuilding',()=>{
 const state=fixture(),order=[],port={postMessage:m=>order.push(['ack',m.sequence]),close(){},start(){}},stream=createConfirmedPresentationStream({port,session:'s',state,terrain:{confirm:n=>order.push(['terrain',n])},onConfirmed:m=>{const result=acceptLiveTerrainCheckpoint(m,'s',()=>{throw Error('unexpected rebuild');});order.push(['checkpoint',result.sequence]);}});
 port.onmessage({data:{kind:'publication',session:'s',publication:{session:'s',sequence:1,snapshot:serialize(state),events:[],physicsPose:null,terrainCheckpoint:{sequence:1,chunks:[],recoveryOnly:true}}}});
 assert.deepEqual(order,[['terrain',1],['checkpoint',1],['ack',1]]);stream.dispose();
});
test('reconciles state and events before releasing terrain and acknowledging',()=>{
 const state=fixture(),authority=deserialize(serialize(state)),order=[],port={postMessage:m=>order.push(['ack',m.sequence]),close(){},start(){}},stop=observePresentationGameEvents(state,e=>order.push(['event',e.id])),stream=createConfirmedPresentationStream({port,session:'s',state,terrain:{confirm:sequence=>order.push(['terrain',sequence])},onConfirmed:m=>order.push(['confirmed',m.sequence])});
 emit(authority,'Test');const event=authority.events.at(-1);port.onmessage({data:{kind:'publication',session:'s',tick:false,firstSequence:1,publication:{session:'s',sequence:1,snapshot:serialize(authority),events:[event]}}});
 assert.deepEqual(order,[['event',event.id],['terrain',1],['confirmed',1],['ack',1]]);assert.equal(stream.status().sequence,1);stream.dispose();stop();
});
test('invalid sequence closes only the presentation stream',()=>{
 const state=fixture();let failure;const port={postMessage(){throw Error('unexpected ack');},close(){this.closed=true;},start(){}},stream=createConfirmedPresentationStream({port,session:'s',state,terrain:{confirm(){throw Error('unexpected terrain');}},onError:error=>{failure=error;}});
 port.onmessage({data:{kind:'publication',session:'s',tick:true,firstSequence:2,publication:{session:'s',sequence:2,snapshot:serialize(state),events:[]}}});assert.match(failure.message,/gap/);assert.equal(stream.status().closed,true);assert.equal(port.closed,true);
});
test('validates movement against confirmed state before exposing it or releasing terrain',()=>{
 const state=fixture(),actor=state.raid.animals[0],seen=[],errors=[],port={postMessage:m=>seen.push(['ack',m.sequence]),close(){},start(){}},stream=createConfirmedPresentationStream({port,session:'s',state,terrain:{confirm:n=>seen.push(['terrain',n])},onMotion:e=>seen.push(['motion',e.trace.actorId]),onConfirmed:m=>seen.push(['trace',m.motionTrace?.actorId]),onError:e=>errors.push(e)});
 const point={at:state.elapsed,x:actor.x,z:actor.z},trace={actorId:actor.id,start:point,end:{...point},segments:[],continuous:true,timed:true},publication={session:'s',sequence:1,elapsed:state.elapsed,snapshot:serialize(state),events:[],physicsPose:null,motionTrace:trace};
 port.onmessage({data:{kind:'publication',session:'s',publication}});assert.deepEqual(seen,[['terrain',1],['motion',actor.id],['trace',actor.id],['ack',1]]);assert.equal(errors.length,0);stream.dispose();
});
test('rejects forged motion before presentation state or terrain changes',()=>{
 const state=fixture(),before=serialize(state),actor=state.raid.animals[0],errors=[],port={postMessage(){throw Error('unexpected ack');},close(){},start(){}},stream=createConfirmedPresentationStream({port,session:'s',state,terrain:{confirm(){throw Error('unexpected terrain');}},onError:e=>errors.push(e)});
 const point={at:state.elapsed,x:actor.x,z:actor.z},trace={actorId:actor.id,start:point,end:{...point,x:point.x+1},segments:[],continuous:true,timed:true};port.onmessage({data:{kind:'publication',session:'s',publication:{session:'s',sequence:1,elapsed:state.elapsed,snapshot:serialize(state),events:[],physicsPose:null,motionTrace:trace}}});assert.match(errors[0].message,/Invalid observed path motion/);assert.equal(serialize(state),before);assert.equal(stream.status().sequence,0);assert.equal(stream.status().closed,true);
});
test('delivers an invalidation in order and removes the previous track',()=>{
 const state=fixture(),actor=state.raid.animals[0],feed=createConfirmedMotionFeed(),errors=[],port={postMessage(){},close(){},start(){}},stream=createConfirmedPresentationStream({port,session:'s',state,terrain:{confirm(){}},onMotion:event=>feed.accept(event),onError:error=>errors.push(error)});
 const point={at:state.elapsed,x:actor.x,z:actor.z},trace={actorId:actor.id,start:point,end:{...point},segments:[],continuous:true,timed:true},packet={session:'s',sequence:1,elapsed:state.elapsed,snapshot:serialize(state),events:[],physicsPose:null,motionTrace:trace};
 port.onmessage({data:{kind:'publication',session:'s',publication:packet}});assert.equal(feed.get(actor.id).trace,trace);
 const invalidation={actorId:actor.id,...point,reason:'pause'};port.onmessage({data:{kind:'publication',session:'s',publication:{session:'s',sequence:2,elapsed:state.elapsed,snapshot:serialize(state),events:[],physicsPose:null,motionInvalidation:invalidation}}});assert.equal(feed.get(actor.id).trace,null);assert.equal(feed.get(actor.id).invalidation.reason,'pause');assert.equal(feed.status().lastSequence,2);assert.deepEqual(errors,[]);stream.dispose();feed.dispose();
});
test('forwards physical ownership even when the publication has no motion payload',()=>{
 const state=fixture(),actor=state.raid.animals[0],feed=createConfirmedMotionFeed(),errors=[],port={postMessage(){},close(){},start(){}},stream=createConfirmedPresentationStream({port,session:'s',state,terrain:{confirm(){}},onMotion:event=>feed.accept(event),onError:error=>errors.push(error)});
 const point={at:state.elapsed,x:actor.x,z:actor.z},trace={actorId:actor.id,start:point,end:{...point},segments:[],continuous:true,timed:true},packet={session:'s',sequence:1,elapsed:state.elapsed,snapshot:serialize(state),events:[],physicsPose:null,motionTrace:trace};port.onmessage({data:{kind:'publication',session:'s',publication:packet}});assert.ok(feed.get(actor.id).trace);
 port.onmessage({data:{kind:'publication',session:'s',publication:{session:'s',sequence:2,elapsed:state.elapsed,snapshot:serialize(state),events:[],physicsPose:{actorId:actor.id,active:true}}}});assert.equal(feed.get(actor.id).trace,null);assert.equal(feed.get(actor.id).physical,true);assert.equal(feed.get(actor.id).invalidation.reason,'physical-pose');assert.deepEqual(errors,[]);stream.dispose();feed.dispose();
});
test('validates all physical poses before reconciliation and installs them before confirmed events',()=>{
 const state=fixture(),next=deserialize(serialize(state)),actor=next.raid.animals[0],order=[],errors=[],port={postMessage:()=>order.push('ack'),close(){},start(){}},stop=observePresentationGameEvents(state,()=>order.push('event'));
 actor.magicDown={phase:'falling',since:next.elapsed,until:next.elapsed+2};emit(next,'Test');const transform=[0,0,0,0,0,0,1,1,1,1],pose={actorId:actor.id,active:true,root:transform,model:transform,bones:[]},stream=createConfirmedPresentationStream({port,session:'s',state,terrain:{confirm:()=>order.push('terrain')},validatePhysics:poses=>{assert.equal(poses.get(actor.id),pose);order.push('validate');},onPhysics:poses=>{assert.equal(poses.get(actor.id),pose);order.push('physics');},onError:error=>errors.push(error)});
 port.onmessage({data:{kind:'publication',session:'s',publication:{session:'s',sequence:1,snapshot:serializeConfirmedState(next),events:[next.events.at(-1)],physicsPose:pose}}});assert.deepEqual(order,['validate','physics','event','terrain','ack']);assert.equal(errors.length,0);stream.dispose();stop();
});
test('rejects a physical pose for an animal which is not down before mutating state',()=>{
 const state=fixture(),before=serialize(state),actor=state.raid.animals[0],errors=[],port={postMessage(){throw Error('unexpected ack');},close(){},start(){}},stream=createConfirmedPresentationStream({port,session:'s',state,terrain:{confirm(){throw Error('unexpected terrain');}},onPhysics(){throw Error('unexpected pose');},onError:error=>errors.push(error)}),transform=[0,0,0,0,0,0,1,1,1,1];
 port.onmessage({data:{kind:'publication',session:'s',publication:{session:'s',sequence:1,snapshot:serialize(state),events:[],physicsPose:{actorId:actor.id,active:true,root:transform,model:transform,bones:[]}}}});assert.match(errors[0].message,/lacks active animal/);assert.equal(serialize(state),before);assert.equal(stream.status().sequence,0);stream.dispose();
});

test('publication journal drives real WebGPU guardian after snapshot reconciliation and suppresses same-publication exit',()=>{
 const state=fixture(),authority=deserialize(serialize(state)),animal=authority.raid.animals[0],errors=[],acks=[],port={postMessage:m=>acks.push(m),close(){},start(){}},scene=new THREE.Scene();
 const guardian=createWebGpuGuardianAttack({scene,state,renderer:{backend:{isWebGPUBackend:true}},loadModel:()=>new Promise(()=>{})});
 const stream=createConfirmedPresentationStream({port,session:'s',state,terrain:{confirm(){}},onConfirmed:m=>guardian.sync(m.presentationJournal,m.events),onError:e=>errors.push(e)});
 const selection={origin:{x:0,y:2,z:0},contact:{x:1,y:1,z:0}};emit(authority,'SpellActivated',{kind:'attack',targetId:animal.id,commandId:'cast',presentation:{elapsed:authority.elapsed,...selection}});const event=authority.events.at(-1);animal.status='gone';
 port.onmessage({data:{kind:'publication',session:'s',tick:true,firstSequence:1,publication:{session:'s',sequence:1,snapshot:serialize(authority),events:[event],presentationJournal:[{kind:'event',eventId:event.id},{kind:'animalGone',actorId:animal.id}]}}});
 assert.deepEqual(errors,[]);assert.equal(guardian.status().active,null);assert.equal(acks[0].sequence,1);stream.dispose();guardian.dispose();
});

test('compacted quiet recovery ticks preserve final state and ordered event against reference replay',async()=>{
 const {createPresentationRecoveryJournal}=await import('../src/simulation/presentation-recovery-journal.js');
 const authority=fixture(),reference=deserialize(serialize(authority)),compacted=deserialize(serialize(authority)),eventsA=[],eventsB=[],errors=[];
 const stopA=observePresentationGameEvents(reference,e=>eventsA.push(e.id)),stopB=observePresentationGameEvents(compacted,e=>eventsB.push(e.id));
 const portA={postMessage(){},close(){},start(){}},portB={postMessage(){},close(){},start(){}};
 const a=createConfirmedPresentationStream({port:portA,session:'s',state:reference,initialSequence:1,terrain:{confirm(){}},onError:e=>errors.push(e)}),b=createConfirmedPresentationStream({port:portB,session:'s',state:compacted,initialSequence:1,terrain:{confirm(){}},onError:e=>errors.push(e)});
 const journal=createPresentationRecoveryJournal({compactTicks:true});journal.begin(1);journal.confirm(1);
 for(let n=2;n<=4;n++){authority.elapsed+=.01;authority.time+=.01;let events=[];if(n===4){emit(authority,'Test');events=[authority.events.at(-1)];}const p={session:'s',sequence:n,snapshot:serialize(authority),events,physicsPose:null,pauses:[...authority.pauses]};journal.append(p,true);portA.onmessage({data:{kind:'publication',session:'s',publication:p,tick:true,firstSequence:n}});}
 for(const item of journal.snapshot().entries)portB.onmessage({data:{kind:'publication',session:'s',publication:item.publication,tick:item.tick,firstSequence:item.firstSequence??item.sequence}});
 assert.deepEqual(errors,[]);assert.equal(serialize(compacted),serialize(reference));assert.deepEqual(eventsB,eventsA);assert.equal(b.status().sequence,4);a.dispose();b.dispose();stopA();stopB();
});

test('a forged world start is rejected before state, terrain or ACK mutate',()=>{const state=fixture(),before=serialize(state),errors=[],order=[],port={postMessage:m=>order.push(['ack',m.sequence]),close(){this.closed=true},start(){}},stream=createConfirmedPresentationStream({port,session:'s',state,terrain:{confirm:n=>order.push(['terrain',n])},onError:e=>errors.push(e)}),at=state.elapsed,actors=[...(state.raid?.animals??[]),...state.workers].map(actor=>({actorId:actor.id,start:{at,x:actor.x,z:actor.z},end:{at,x:actor.x,z:actor.z},startStatus:actor.status,endStatus:actor.status,radius:actor.radius??.28,segments:[],continuous:true,timed:true}));actors[0].startStatus='forged';port.onmessage({data:{kind:'publication',session:'s',publication:{session:'s',sequence:1,snapshot:serialize(state),elapsed:at,events:[],worldMotionTrace:{start:at,end:at,actors,rosterChanged:false,topologyChanged:false,chunkChanged:false,terrainChanged:false}}}});assert.equal(port.closed,true);assert.match(errors[0].message,/world actor start/);assert.equal(serialize(state),before);assert.deepEqual(order,[]);});

test('held world trace requires the same terrain epoch and generation at both boundaries',()=>{const state=fixture(),port={postMessage(){},close(){},start(){}},at=state.elapsed,actors=[...(state.raid?.animals??[]),...state.workers].map(actor=>({actorId:actor.id,start:{at,x:actor.x,z:actor.z},end:{at,x:actor.x,z:actor.z},startStatus:actor.status,endStatus:actor.status,radius:actor.radius??.28,segments:[],continuous:true,timed:true})),trace={start:at,end:at,actors,rosterChanged:false,topologyChanged:false,chunkChanged:false,terrainChanged:false,terrainManifest:{epoch:'a',chunks:[{cx:0,cz:0,revision:1}]}};let generation=1,epoch='a';const received=[],terrain={confirm(){},revisionGeneration:()=>generation,matchesManifest:m=>m?.epoch===epoch},stream=createConfirmedPresentationStream({port,session:'s',state,terrain,allowPresentationHold:true,onMotion:e=>received.push(e)}),send=sequence=>port.onmessage({data:{kind:'publication',session:'s',publication:{session:'s',sequence,snapshot:serialize(state),elapsed:at,events:[],physicsPose:null,worldMotionTrace:trace}}});stream.holdPresentation();send(1);generation++;stream.releasePresentation();assert.equal(received[0].terrainReady,false);send(2);assert.equal(received[1].terrainReady,true);stream.holdPresentation();send(3);epoch='b';stream.releasePresentation();assert.equal(received[2].terrainReady,false);stream.dispose();});
