import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Scene,Group,AnimationClip} from 'three';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {createConfirmedPresentationStream} from '../src/rendering/confirmed-presentation-stream.js';
import {createWebGpuConfirmedWorker} from '../src/rendering/webgpu-confirmed-worker.js';
import {createPresentationWorkerHeadingMap,assertPresentationWorkerHeadingCheckpoint} from '../src/simulation/presentation-worker-headings.js';
import {emit,observePresentationGameEvents} from '../src/simulation/game.js';
import {createPresentationRecoveryJournal} from '../src/simulation/presentation-recovery-journal.js';
import {createPresentationRecoveryReplay} from '../src/simulation/presentation-recovery-replay.js';

test('WebGPU worker uses the shared versioned visual yaw and falls back to state for untracked actors',async()=>{
 const state={workers:[{id:'worker',profile:'olderMale',status:'idle',x:0,z:0,heading:-.8}],tasks:[],elapsed:0},headings=new Map([['worker',1.2]]),scene=new Scene(),assetBank={acquire:async()=>({model:new Group(),clips:[new AnimationClip('Idle',1,[])],library:{actions:{Idle:{duration:1,loop:true}}},release(){}})};
 const actor=await createWebGpuConfirmedWorker({scene,residency:{get:()=>null},state,actorId:'worker',assetBank,presentationWorkerHeadings:headings});try{assert.equal(actor.root.rotation.y,1.2);headings.set('worker',.4);actor.update();assert.equal(actor.root.rotation.y,.4);headings.delete('worker');actor.update();assert.equal(actor.root.rotation.y,-.8);}finally{actor.dispose();}
});

test('graphics heading changes commit with state and can resume from a checkpoint baseline',()=>{
 const load=()=>deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString()),state=load(),nextState=deserialize(serialize(state)),headings=createPresentationWorkerHeadingMap([{id:'worker',yaw:1.2}]),acks=[],applied=[],eventHeadings=[],stop=observePresentationGameEvents(state,()=>eventHeadings.push(headings.get('worker'))),port={postMessage:m=>acks.push(m.sequence),close(){},start(){}},stream=createConfirmedPresentationStream({port,session:'s',state,terrain:{confirm(){}},presentationWorkerHeadings:headings,allowPresentationHold:true,onConfirmed:()=>applied.push(headings.get('worker'))}),checkpoint={sequence:1,chunks:[],workerHeadings:[{id:'worker',yaw:.4}]};emit(nextState,'TestHeading');const packet={session:'s',sequence:1,snapshot:serialize(nextState),events:[nextState.events.at(-1)],physicsPose:null,presentationWorkerHeadings:[{id:'worker',yaw:.4}],terrainCheckpoint:checkpoint};
 stream.holdPresentation();port.onmessage({data:{kind:'publication',session:'s',publication:packet}});assert.equal(headings.get('worker'),1.2);assert.deepEqual(acks,[]);stream.releasePresentation();assert.equal(headings.get('worker'),.4);assert.deepEqual(eventHeadings,[.4]);assert.deepEqual(applied,[.4]);assert.deepEqual(acks,[1]);assert.doesNotThrow(()=>assertPresentationWorkerHeadingCheckpoint(headings,checkpoint.workerHeadings));
 const recovered=createPresentationWorkerHeadingMap(checkpoint.workerHeadings),nextPort={postMessage(){},close(){},start(){}},next=createConfirmedPresentationStream({port:nextPort,session:'s',state:deserialize(serialize(state)),terrain:{confirm(){}},presentationWorkerHeadings:recovered,initialSequence:1});nextPort.onmessage({data:{kind:'publication',session:'s',publication:{session:'s',sequence:2,snapshot:serialize(state),events:[],physicsPose:null,presentationWorkerHeadings:[{id:'worker',yaw:.9}]}}});assert.equal(recovered.get('worker'),.9);assert.throws(()=>assertPresentationWorkerHeadingCheckpoint(recovered,checkpoint.workerHeadings),/mismatch/);next.dispose();stream.dispose();stop();
});

test('a malformed heading checkpoint fails closed without acknowledging it',()=>{
 const state=deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString()),headings=new Map([['worker',1]]),acks=[],errors=[],port={postMessage:m=>acks.push(m),close(){},start(){}},stream=createConfirmedPresentationStream({port,session:'s',state,terrain:{confirm(){}},presentationWorkerHeadings:headings,onError:error=>errors.push(error.message)});
 port.onmessage({data:{kind:'publication',session:'s',publication:{session:'s',sequence:1,snapshot:serialize(state),events:[],physicsPose:null,terrainCheckpoint:{sequence:1,chunks:[],workerHeadings:[{id:'worker',yaw:2}]}}}});assert.deepEqual(acks,[]);assert.match(errors[0],/checkpoint mismatch/);assert.equal(stream.status().closed,true);
});

test('recovery replays heading deltas across compacted quiet ticks',()=>{
 const state=deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString()),snapshot=serialize(state),journal=createPresentationRecoveryJournal({compactTicks:true}),checkpoint={sequence:1,workerHeadings:[{id:'worker',yaw:1.2}]};
 journal.begin(1);journal.confirm(1);
 const quiet=sequence=>({session:'s',sequence,snapshot,events:[],physicsPose:null,pauses:[]});
 journal.append({...quiet(2),presentationWorkerHeadings:[{id:'worker',yaw:.4}]},true);journal.append(quiet(3),true);assert.deepEqual(journal.snapshot().entries[0].publication.presentationWorkerHeadings,[{id:'worker',yaw:.4}]);journal.append({...quiet(4),presentationWorkerHeadings:[{id:'worker',yaw:.9}]},true);
 const entries=journal.snapshot().entries;assert.equal(entries.length,1);assert.equal(entries[0].firstSequence,2);assert.deepEqual(entries[0].publication.presentationWorkerHeadings,[{id:'worker',yaw:.9}]);
 const headings=createPresentationWorkerHeadingMap(checkpoint.workerHeadings),acks=[],streamPort={postMessage:m=>acks.push(m),close(){},start(){}},stream=createConfirmedPresentationStream({port:streamPort,session:'s',state,terrain:{confirm(){}},presentationWorkerHeadings:headings,initialSequence:1}),messages=[],errors=[],replayPort={postMessage:m=>messages.push(m),start(){}},replay=createPresentationRecoveryReplay({port:replayPort,session:'s',checkpoint,journal,onError:e=>errors.push(e)});
 const acknowledge=m=>replayPort.onmessage({data:{kind:'recoveryAck',session:'s',id:m.id,sequence:m.sequence,phase:m.kind==='recoveryCheckpoint'?'checkpoint':'publication'}});
 acknowledge(messages[0]);const packet=messages[1];assert.equal(packet.firstSequence,2);streamPort.onmessage({data:{kind:'publication',session:'s',publication:packet.publication,tick:packet.tick,firstSequence:packet.firstSequence}});assert.equal(headings.get('worker'),.9);assert.equal(acks.length,1);acknowledge(packet);assert.equal(replay.status().caughtUp,true);assert.deepEqual(errors,[]);stream.dispose();replay.dispose();journal.dispose();
});
test('new worker survives checkpoint replay and subsequent removal',()=>{
 const state=deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString()),next=deserialize(serialize(state)),id='new-worker-qa';next.workers.push({...next.workers[0],id,status:'walking'});const snapshot=serialize(next),journal=createPresentationRecoveryJournal({compactTicks:true});journal.begin(1);journal.confirm(1);
 const quiet=sequence=>({session:'s',sequence,snapshot,events:[],physicsPose:null,pauses:[]});journal.append({...quiet(2),presentationWorkerHeadings:[{id,yaw:.4,add:true}]},true);journal.append({...quiet(3),presentationWorkerHeadings:[{id,yaw:.9}]},true);journal.append({...quiet(4),presentationWorkerHeadings:[{id,yaw:null}]},true);assert.equal(journal.snapshot().entries.length,3);
 const headings=new Map(),acks=[],port={postMessage:m=>acks.push(m),close(){},start(){}},stream=createConfirmedPresentationStream({port,session:'s',state,terrain:{confirm(){}},presentationWorkerHeadings:headings,initialSequence:1});for(const entry of journal.snapshot().entries)port.onmessage({data:{kind:'publication',session:'s',publication:entry.publication,tick:true,firstSequence:entry.firstSequence??entry.sequence}});assert.equal(acks.length,3);assert.equal(headings.has(id),false);assert.equal(stream.status().closed,false);stream.dispose();journal.dispose();
});
