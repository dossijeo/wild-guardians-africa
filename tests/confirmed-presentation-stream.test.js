import * as THREE from 'three';
import {createWebGpuGuardianAttack} from '../src/rendering/webgpu-guardian-attack.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {emit,observePresentationGameEvents} from '../src/simulation/game.js';
import {createConfirmedPresentationStream} from '../src/rendering/confirmed-presentation-stream.js';
import {createConfirmedMotionFeed} from '../src/rendering/confirmed-motion-feed.js';
import {serializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
const fixture=()=>deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString());
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
