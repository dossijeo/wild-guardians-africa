import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {emit} from '../src/simulation/game.js';
import {createConfirmedPresentationAdapter} from '../src/simulation/confirmed-presentation-adapter.js';
import {createConfirmedSceneReceiver} from '../src/rendering/confirmed-scene-receiver.js';
import {handoffConfirmedSnapshot} from '../src/simulation/confirmed-snapshot-handoff.js';

const fixture=()=>deserialize(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString());
test('early adapter validates the decoded handoff without requesting its snapshot text',()=>{
 const state=fixture(),next=deserialize(serialize(state)),adapter=createConfirmedPresentationAdapter(state,'s');let reads=0;const message={session:'s',sequence:1,events:[],physicsPose:null};Object.defineProperty(message,'snapshot',{enumerable:true,get(){reads++;return serialize(next);}});handoffConfirmedSnapshot(message,next);
 assert.equal(adapter.accept(message).accepted,true);assert.equal(reads,0);assert.equal(adapter.status().sequence,1);
});
test('an invalid early pose discards the prepared state and permits a valid retry',()=>{
 const state=fixture(),next=deserialize(serialize(state)),adapter=createConfirmedPresentationAdapter(state,'s'),message={session:'s',sequence:1,events:[],physicsPose:{actorId:'invalid',active:true}};handoffConfirmedSnapshot(message,next);assert.throws(()=>adapter.accept(message),/Invalid confirmed animal pose/);assert.equal(adapter.status().sequence,0);message.physicsPose=null;assert.equal(adapter.accept(message).accepted,true);assert.equal(adapter.status().sequence,1);
});
test('stable adapter hands confirmed sequence and ordered buffered events to the scene',()=>{
 const state=fixture(),next=deserialize(serialize(state)),adapter=createConfirmedPresentationAdapter(state,'s'),id=next.sequence;emit(next,'AdapterFirst');emit(next,'AdapterSecond');const events=next.events.slice(-2);assert.equal(adapter.accept({session:'s',sequence:1,snapshot:serialize(next),events,physicsPose:null}).accepted,true);assert.equal(adapter.status().bufferedEvents,2);
 const world={state,mixers:new Map(),objects:new Map()},scene=createConfirmedSceneReceiver(state,'s',world,{initialSequence:adapter.status().sequence}),delivered=[];assert.deepEqual(adapter.attach(scene,{onBufferedEvents:items=>delivered.push(...items)}),{sequence:1,events:2});assert.deepEqual(delivered.map(e=>e.id),events.map(e=>e.id));assert.equal(adapter.status().attached,true);const newer=deserialize(serialize(state));emit(newer,'AdapterThird');assert.equal(adapter.accept({session:'s',sequence:2,snapshot:serialize(newer),events:[newer.events.at(-1)],physicsPose:null}).accepted,true);assert.equal(adapter.status().sequence,2);assert.equal(delivered.length,2);assert.ok(id<state.sequence);
});
test('capacity failure and invalid handoff do not advance or lose buffered events',()=>{
 const state=fixture(),next=deserialize(serialize(state)),adapter=createConfirmedPresentationAdapter(state,'s',{maxBufferedEvents:1});emit(next,'One');const first=next.events.at(-1);adapter.accept({session:'s',sequence:1,snapshot:serialize(next),events:[first],physicsPose:null});emit(next,'Two');assert.throws(()=>adapter.accept({session:'s',sequence:2,snapshot:serialize(next),events:[next.events.at(-1)],physicsPose:null}),/capacity/);assert.equal(adapter.status().sequence,1);const scene=createConfirmedSceneReceiver(state,'s',{state,mixers:new Map(),objects:new Map()},{initialSequence:1});assert.throws(()=>adapter.attach(scene),/handoff/);assert.equal(adapter.status().bufferedEvents,1);const events=[];adapter.attach(scene,{onBufferedEvents:items=>events.push(...items)});assert.deepEqual(events.map(e=>e.id),[first.id]);
});
test('a failing handoff consumer faults closed rather than delivering buffered events twice',()=>{const state=fixture(),next=deserialize(serialize(state)),adapter=createConfirmedPresentationAdapter(state,'s');emit(next,'One');adapter.accept({session:'s',sequence:1,snapshot:serialize(next),events:[next.events.at(-1)],physicsPose:null});const scene=createConfirmedSceneReceiver(state,'s',{state,mixers:new Map(),objects:new Map()},{initialSequence:1});assert.throws(()=>adapter.attach(scene,{onBufferedEvents(){throw Error('consumer failure');}}),/consumer failure/);assert.equal(adapter.status().fault,true);assert.throws(()=>adapter.attach(scene,{onBufferedEvents(){}}),/unavailable/);assert.throws(()=>adapter.acceptUnchanged({}),/handoff failed/);});
