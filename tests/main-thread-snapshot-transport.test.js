import test from 'node:test';
import assert from 'node:assert/strict';
import {createMainSnapshotEncoder,createMainSnapshotDecoder} from '../src/simulation/main-thread-snapshot-transport.js';
import {createConfirmedStateReceiver} from '../src/simulation/confirmed-state-receiver.js';
import {serializeConfirmedState,deserializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import * as Game from '../src/simulation/game.js';
import {createWorkerHostedRuntime} from '../src/simulation/worker-hosted-runtime.js';

const packet=(sequence,snapshot,events=[])=>({kind:'publication',session:'s',publication:{session:'s',sequence,snapshot,events,physicsPose:null}});
test('incremental UI transport retains validated states and ordered event boundaries',()=>{
 const authority=Game.newGame({seed:712,slotId:'delta'}),view=deserializeConfirmedState(serializeConfirmedState(authority)),receiver=createConfirmedStateReceiver(view,'s'),encoder=createMainSnapshotEncoder(),decoder=createMainSnapshotDecoder();
 const first=packet(1,serializeConfirmedState(authority)),firstWire=encoder.encode(first);assert.equal(typeof firstWire.publication.snapshot,'string');assert.equal(receiver.accept(decoder.decode(firstWire).publication).accepted,true);
 const events=[],stop=Game.observeGameEvents(authority,event=>events.push(structuredClone(event)));Game.emit(authority,'NightStarted');stop();
 const second=packet(2,serializeConfirmedState(authority),events),wire=encoder.encode(second);assert.equal(wire.publication.snapshot,undefined);assert.equal(wire.publication.snapshotDelta.baseSequence,1);assert.deepEqual(wire.publication.events,events);
 const decoded=decoder.decode(wire);assert.equal(receiver.accept(decoded.publication).accepted,true);assert.deepEqual(view,authority);
 // Unchanged acknowledgements still advance the delta base sequence.
 const unchanged={kind:'publication',session:'s',publication:{session:'s',sequence:3,unchanged:true}};decoder.decode(encoder.encode(unchanged));
 authority.time+=1;const later=encoder.encode(packet(4,serializeConfirmedState(authority)));assert.equal(later.publication.snapshotDelta.baseSequence,3);assert.deepEqual(JSON.parse(decoder.decode(later).publication.snapshot),authority);
});
test('delta rejects stale bases, duplicate fields and invalid removals without advancing',()=>{
 const encoder=createMainSnapshotEncoder(),decoder=createMainSnapshotDecoder(),first=packet(1,JSON.stringify({a:1,b:'x'.repeat(200)}));decoder.decode(encoder.encode(first));
 const next=encoder.encode(packet(2,JSON.stringify({a:2,b:'x'.repeat(200)}))),delta=next.publication.snapshotDelta;assert.ok(delta);
 for(const bad of [{...delta,baseSequence:0},{...delta,changed:[['a','2'],['a','3']]},{...delta,removed:['missing']},{...delta,changed:[['a','{']]}])assert.throws(()=>decoder.decode({...next,publication:{...next.publication,snapshotDelta:bad}}));
 assert.deepEqual(JSON.parse(decoder.decode(next).publication.snapshot),{a:2,b:'x'.repeat(200)});
});
test('small snapshots fall back to full transport and property removal is preserved',()=>{
 const encoder=createMainSnapshotEncoder(),decoder=createMainSnapshotDecoder();decoder.decode(encoder.encode(packet(1,'{"a":1}')));
 const full=encoder.encode(packet(2,'{"a":2}'));assert.equal(full.publication.snapshot,'{"a":2}');decoder.decode(full);
 const large=JSON.stringify({a:2,remove:1,keep:'x'.repeat(300)});decoder.decode(encoder.encode(packet(3,large)));
 const removed=encoder.encode(packet(4,JSON.stringify({a:2,keep:'x'.repeat(300)})));assert.deepEqual(removed.publication.snapshotDelta.removed,['remove']);assert.deepEqual(JSON.parse(decoder.decode(removed).publication.snapshot),{a:2,keep:'x'.repeat(300)});
});
test('hosted UI consumes incremental publications before acknowledging and resolving commands',async()=>{
 const authority=Game.newGame({seed:712,slotId:'host-delta'}),view=deserializeConfirmedState(serializeConfirmedState(authority)),encoder=createMainSnapshotEncoder(),sent=[],events=[];
 const worker={postMessage:message=>sent.push(message),terminate(){}},runtime=createWorkerHostedRuntime({world:{createConfirmedReceiver:session=>createConfirmedStateReceiver(view,session)},session:'s',clientOptions:{},runtimeOptions:{mainThreadProjection:true,coalescePublications:true},workerFactory:()=>worker,onConfirmedEvents:batch=>events.push(...batch)});
 const start=runtime.start(),publish=value=>worker.onmessage({data:encoder.encode(value)});
 publish(packet(1,serializeConfirmedState(authority)));worker.onmessage({data:{kind:'started',session:'s',sequence:1,status:{}}});await start;
 const command=runtime.submit({kind:'snapshot'}),id=sent.at(-1).id,collected=[],stop=Game.observeGameEvents(authority,event=>collected.push(structuredClone(event)));Game.emit(authority,'NightStarted');stop();
 const outgoing=encoder.encode(packet(2,serializeConfirmedState(authority),collected));assert.ok(outgoing.publication.snapshotDelta);worker.onmessage({data:outgoing});
 assert.equal(sent.at(-1).kind,'publicationAck');assert.equal(sent.at(-1).sequence,2);worker.onmessage({data:{kind:'commandResult',session:'s',id,sequence:2}});
 const result=await command;assert.equal(typeof result.snapshot,'string');assert.deepEqual(JSON.parse(result.snapshot),authority);assert.deepEqual(events,collected);assert.deepEqual(view,authority);runtime.dispose();
});
