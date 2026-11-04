import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';import {emit,observeGameEvents,observePresentationGameEvents} from '../src/simulation/game.js';import {createConfirmedStateReceiver} from '../src/simulation/confirmed-state-receiver.js';
const fixture=()=>deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString());
test('prepared publication holds the displayed state and observers until ordered commit',()=>{
 const display=fixture(),authority=deserialize(serialize(display)),animal=display.raid.animals[0],workers=display.workers,before=serialize(display),events=[],stop=observePresentationGameEvents(display,event=>events.push(event.id));
 try{authority.raid.animals[0].x+=1;authority.elapsed+=.05;emit(authority,'Test');const event=authority.events.at(-1),receiver=createConfirmedStateReceiver(display,'s'),packet={session:'s',sequence:1,snapshot:serialize(authority),events:[event]};
  const prepared=receiver.prepare(packet);assert.equal(prepared.accepted,true);assert.equal(serialize(display),before);assert.deepEqual(events,[]);assert.equal(receiver.status().sequence,0);
  assert.throws(()=>receiver.prepare(packet),/already prepared/);assert.throws(()=>receiver.commit({}),/Invalid prepared/);assert.equal(serialize(display),before);
  assert.deepEqual(receiver.commit(prepared.token),{accepted:true,sequence:1});assert.equal(display.raid.animals[0],animal);assert.equal(display.workers,workers);assert.equal(serialize(display),serialize(authority));assert.deepEqual(events,[event.id]);assert.throws(()=>receiver.commit(prepared.token),/Invalid prepared/);
 }finally{stop();}
});
test('discarded and failed prepared publications do not retain a pending token',()=>{
 const display=fixture(),authority=deserialize(serialize(display)),receiver=createConfirmedStateReceiver(display,'s'),packet={session:'s',sequence:1,snapshot:serialize(authority),events:[]};
 assert.equal(receiver.prepare({...packet,sequence:2}).reason,'gap');assert.throws(()=>receiver.prepare({...packet,events:[{id:'bad'}]}));
 const first=receiver.prepare(packet);receiver.discard(first.token);assert.throws(()=>receiver.commit(first.token),/Invalid prepared/);const second=receiver.prepare(packet);assert.deepEqual(receiver.commit(second.token),{accepted:true,sequence:1});
 const unchanged={session:'s',sequence:2,unchanged:true,slotId:display.slotId,stateSequence:display.sequence,elapsed:display.elapsed,pauses:[...display.pauses],events:[],saveAvailable:true},third=receiver.prepareUnchanged(unchanged);assert.equal(receiver.status().sequence,1);assert.deepEqual(receiver.commit(third.token),{accepted:true,sequence:2});
});
test('observer failure while committing faults the receiver and clears the token',()=>{
 const display=fixture(),authority=deserialize(serialize(display)),receiver=createConfirmedStateReceiver(display,'s',{onReconciled:()=>{throw Error('commit failed');}}),prepared=receiver.prepare({session:'s',sequence:1,snapshot:serialize(authority),events:[]});
 assert.throws(()=>receiver.commit(prepared.token),/commit failed/);assert.equal(receiver.status().fault,true);assert.throws(()=>receiver.commit(prepared.token),/Invalid prepared/);assert.equal(receiver.prepare({session:'s',sequence:1,snapshot:serialize(authority),events:[]}).reason,'fault');
});
test('confirmed snapshots preserve actor identity and notify only presentation observers once',()=>{const display=fixture(),authority=deserialize(serialize(display)),animal=display.raid.animals[0],workers=display.workers,events=[],simulation=[];const stop=observePresentationGameEvents(display,e=>events.push(e.id)),stopSim=observeGameEvents(display,e=>simulation.push(e.id));try{authority.raid.animals[0].x+=1;emit(authority,'WorkerTestEvent',{targetId:animal.id});const event=authority.events.at(-1),receiver=createConfirmedStateReceiver(display,'s'),packet={session:'s',sequence:1,snapshot:serialize(authority),events:[event]};assert.deepEqual(receiver.accept(packet),{accepted:true,sequence:1});assert.equal(display.raid.animals[0],animal);assert.equal(display.workers,workers);assert.equal(serialize(display),serialize(authority));assert.deepEqual(events,[event.id]);assert.deepEqual(simulation,[]);assert.equal(receiver.accept(packet).reason,'stale');assert.deepEqual(events,[event.id]);}finally{stop();stopSim();}});
test('gaps and invalid events do not mutate state; observer failure fails closed',()=>{const display=fixture(),authority=deserialize(serialize(display)),receiver=createConfirmedStateReceiver(display,'s'),before=serialize(display);authority.time+=1;authority.elapsed+=1;const packet={session:'s',sequence:1,snapshot:serialize(authority),events:[]};assert.equal(receiver.accept({...packet,sequence:2}).reason,'gap');assert.throws(()=>receiver.accept({...packet,events:[{id:'x'}]}));assert.equal(serialize(display),before);authority.sequence++;packet.snapshot=serialize(authority);const stop=observePresentationGameEvents(display,()=>{throw Error('observer');});try{assert.throws(()=>receiver.accept({...packet,events:[{id:`event-${display.sequence}`,type:'test'}]}),/observer/);assert.equal(receiver.status().fault,true);assert.equal(receiver.accept(packet).reason,'fault');}finally{stop();}});

test('an already delivered event cannot be replayed under a new command sequence',()=>{const display=fixture(),authority=deserialize(serialize(display)),receiver=createConfirmedStateReceiver(display,'s');emit(authority,'Test');const event=authority.events.at(-1),snapshot=serialize(authority);receiver.accept({session:'s',sequence:1,snapshot,events:[event]});assert.throws(()=>receiver.accept({session:'s',sequence:2,snapshot,events:[event]}),/event sequence/);assert.equal(receiver.status().sequence,1);});

test('a reconciliation callback failure prevents event delivery and faults the receiver',()=>{const display=fixture(),authority=deserialize(serialize(display)),seen=[],stop=observePresentationGameEvents(display,e=>seen.push(e.id));try{emit(authority,'Test');const event=authority.events.at(-1),receiver=createConfirmedStateReceiver(display,'s',{onReconciled:()=>{throw Error('scene failed');}}),packet={session:'s',sequence:1,snapshot:serialize(authority),events:[event]};assert.throws(()=>receiver.accept(packet),/scene failed/);assert.deepEqual(seen,[]);assert.equal(receiver.status().fault,true);assert.equal(receiver.accept(packet).reason,'fault');}finally{stop();}});

test('unchanged camera confirmations advance only the protocol sequence',()=>{
 const state=fixture(),before=serialize(state);let reconciled=0;const receiver=createConfirmedStateReceiver(state,'s',{onReconciled:()=>reconciled++});
 assert.deepEqual(receiver.accept({session:'s',sequence:1,snapshot:before,events:[]}),{accepted:true,sequence:1});
 const ack={session:'s',sequence:2,unchanged:true,slotId:state.slotId,stateSequence:state.sequence,elapsed:state.elapsed,pauses:[...state.pauses],events:[],saveAvailable:true};
 for(const invalid of [{...ack,stateSequence:state.sequence+1},{...ack,elapsed:state.elapsed+1},{...ack,events:[{id:'event-1'}]},{...ack,snapshot:before}])assert.throws(()=>receiver.acceptUnchanged(invalid),/Invalid unchanged/);
 assert.deepEqual(receiver.acceptUnchanged(ack),{accepted:true,sequence:2});assert.equal(reconciled,1);assert.equal(serialize(state),before);
 const combined={...ack,sequence:5};assert.equal(receiver.acceptUnchanged(combined,{firstSequence:4}).reason,'gap');assert.deepEqual(receiver.acceptUnchanged(combined,{firstSequence:3}),{accepted:true,sequence:5});assert.equal(serialize(state),before);
 assert.deepEqual(receiver.accept({session:'s',sequence:6,snapshot:before,events:[]}),{accepted:true,sequence:6});
});
test('coalesced ranges accept only contiguous quiet pose-free publications',()=>{
 const state=fixture(),source=serialize(state),receiver=createConfirmedStateReceiver(state,'s');receiver.accept({session:'s',sequence:1,snapshot:source,events:[]});
 const message={session:'s',sequence:4,snapshot:source,events:[],physicsPose:null};
 assert.equal(receiver.accept(message,{firstSequence:3}).reason,'gap');assert.throws(()=>receiver.accept({...message,events:[{id:'event-1',type:'Test'}]},{firstSequence:2}),/event sequence/);
 assert.throws(()=>receiver.accept({...message,physicsPose:{active:true}},{firstSequence:2}),/Invalid coalesced/);
 assert.equal(receiver.accept(message,{firstSequence:2}).sequence,4);assert.equal(receiver.accept({...message,sequence:5},{firstSequence:2}).reason,'gap');
});
test('coalesced event is delivered once with its own confirmed state',()=>{
 const state=fixture(),authority=deserialize(serialize(state)),seen=[],stop=observePresentationGameEvents(state,event=>seen.push({id:event.id,elapsed:state.elapsed}));
 try{const receiver=createConfirmedStateReceiver(state,'s');receiver.accept({session:'s',sequence:1,snapshot:serialize(authority),events:[]});authority.elapsed+=.1;emit(authority,'Test');const event=authority.events.at(-1),message={session:'s',sequence:4,snapshot:serialize(authority),events:[event],physicsPose:null};assert.equal(receiver.accept(message,{firstSequence:2}).sequence,4);assert.deepEqual(seen,[{id:event.id,elapsed:authority.elapsed}]);}finally{stop();}
});

test('lifecycle journal rejects missing or reordered event references before reconciling',()=>{
 const state=fixture(),source=serialize(state),receiver=createConfirmedStateReceiver(state,'s');
 for(const presentationJournal of [[{kind:'event',eventId:'absent'}],[{kind:'animalGone',actorId:''}],[{kind:'bogus'}]])assert.throws(()=>receiver.accept({session:'s',sequence:1,snapshot:source,events:[],presentationJournal}),/lifecycle/);
 assert.equal(receiver.status().sequence,0);assert.equal(serialize(state),source);
});

test('lifecycle journal rejects missing relevant events, duplicate exits and exits contradicted by snapshot',()=>{
 const state=fixture(),authority=deserialize(serialize(state)),animal=authority.raid.animals.find(a=>a.status!=='gone');assert.ok(animal);emit(authority,'SpellActivated',{kind:'attack',targetId:animal.id});const event=authority.events.at(-1),receiver=createConfirmedStateReceiver(state,'s'),packet={session:'s',sequence:1,snapshot:serialize(authority),events:[event]};
 for(const presentationJournal of [[],[{kind:'event',eventId:event.id},{kind:'event',eventId:event.id}],[{kind:'event',eventId:event.id},{kind:'animalGone',actorId:animal.id},{kind:'animalGone',actorId:animal.id}],[{kind:'event',eventId:event.id},{kind:'animalGone',actorId:animal.id}]])assert.throws(()=>receiver.accept({...packet,presentationJournal}),/lifecycle/);
 assert.equal(receiver.status().sequence,0);
});
