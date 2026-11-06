import test from 'node:test';
import assert from 'node:assert/strict';
import {createMainSnapshotEncoder,createMainSnapshotDecoder} from '../src/simulation/main-thread-snapshot-transport.js';
import {createConfirmedStateReceiver} from '../src/simulation/confirmed-state-receiver.js';
import {serializeConfirmedState,deserializeConfirmedState} from '../src/simulation/confirmed-live-state.js';
import * as Game from '../src/simulation/game.js';
import {rational,transact} from '../src/simulation/money.js';
import {createWorkerHostedRuntime} from '../src/simulation/worker-hosted-runtime.js';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

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
test('mutable UI state cannot change the private incremental baseline',()=>{
 const authority=Game.newGame({seed:712,slotId:'independent'}),view=deserializeConfirmedState(serializeConfirmedState(authority)),receiver=createConfirmedStateReceiver(view,'s'),encoder=createMainSnapshotEncoder(),decoder=createMainSnapshotDecoder();
 const apply=n=>{const wire=encoder.encode(packet(n,serializeConfirmedState(authority)));const decoded=decoder.decode(wire);assert.equal(receiver.accept(decoded.publication).accepted,true);return {wire,decoded};};
 apply(1);transact(authority.ledger,'new-entry',rational(9));apply(2);view.ledger.entries['new-entry'].n='999';view.ledger.entries['invented']=rational(12);
 authority.time+=1;const {wire,decoded}=apply(3);assert.ok(wire.publication.snapshotDelta);assert.ok(!wire.publication.snapshotDelta.changed.some(([key])=>key==='ledger'));assert.deepEqual(view,authority);
 view.ledger.entries['new-entry'].n='1000';assert.deepEqual(JSON.parse(decoded.publication.snapshot),authority);
});
test('incremental reconciliation validates without serializing the full state',()=>{
 const authority=Game.newGame({seed:712,slotId:'lazy'}),view=deserializeConfirmedState(serializeConfirmedState(authority)),receiver=createConfirmedStateReceiver(view,'s'),encoder=createMainSnapshotEncoder(),decoder=createMainSnapshotDecoder();
 assert.equal(receiver.accept(decoder.decode(encoder.encode(packet(1,serializeConfirmedState(authority)))).publication).accepted,true);
 authority.time+=1;const decoded=decoder.decode(encoder.encode(packet(2,serializeConfirmedState(authority)))),original=JSON.stringify;let full=0;
 JSON.stringify=(value,...args)=>{if(value?.slotId==='lazy')full++;return original(value,...args);};
 try{assert.equal(receiver.accept(decoded.publication).accepted,true);assert.equal(full,0);assert.deepEqual(JSON.parse(decoded.publication.snapshot),authority);assert.equal(full,1);assert.equal(typeof decoded.publication.snapshot,'string');assert.equal(full,1);}finally{JSON.stringify=original;}
});
test('tracked reconciliation keeps identities while isolating newly added data',()=>{
 const authority=Game.newGame({seed:712,slotId:'tracked'}),view=deserializeConfirmedState(serializeConfirmedState(authority)),receiver=createConfirmedStateReceiver(view,'s',{trackChangedKeys:true}),encoder=createMainSnapshotEncoder(),decoder=createMainSnapshotDecoder(),ledger=view.ledger;
 const apply=n=>receiver.accept(decoder.decode(encoder.encode(packet(n,serializeConfirmedState(authority)))).publication);
 apply(1);transact(authority.ledger,'entry',rational(4));assert.ok(apply(2).changedKeys.has('ledger'));assert.equal(view.ledger,ledger);view.ledger.entries.entry.n='999';authority.time+=1;assert.ok(apply(3).changedKeys.has('ledger'));assert.deepEqual(view,authority);
});
test('small snapshots fall back to full transport and property removal is preserved',()=>{
 const encoder=createMainSnapshotEncoder(),decoder=createMainSnapshotDecoder();decoder.decode(encoder.encode(packet(1,'{"a":1}')));
 const full=encoder.encode(packet(2,'{"a":2}'));assert.equal(full.publication.snapshot,'{"a":2}');decoder.decode(full);
 const large=JSON.stringify({a:2,remove:1,keep:'x'.repeat(300)});decoder.decode(encoder.encode(packet(3,large)));
 const removed=encoder.encode(packet(4,JSON.stringify({a:2,keep:'x'.repeat(300)})));assert.deepEqual(removed.publication.snapshotDelta.removed,['remove']);assert.deepEqual(JSON.parse(decoder.decode(removed).publication.snapshot),{a:2,keep:'x'.repeat(300)});
});
test('entity deltas preserve additions, removals, order and immutable earlier snapshots',()=>{
 const encoder=createMainSnapshotEncoder(),decoder=createMainSnapshotDecoder(),workers=Array.from({length:30},(_,i)=>({id:`w-${i}`,x:i,description:'worker'.repeat(12)})),base={workers,other:'a'.repeat(300)};
 const first=decoder.decode(encoder.encode(packet(1,JSON.stringify(base))));const next=structuredClone(base);next.workers[4].x=99;next.workers.splice(2,1);next.workers.reverse();next.workers.push({id:'new',x:4,description:'new'});
 const wire=encoder.encode(packet(2,JSON.stringify(next)));assert.equal(wire.publication.snapshotDelta.version,2);assert.deepEqual(wire.publication.snapshotDelta.entities[0][1],next.workers.map(w=>w.id));assert.deepEqual(wire.publication.snapshotDelta.entities[0][2].map(([id])=>id).sort(),['new','w-4']);
 const decoded=decoder.decode(wire);assert.deepEqual(JSON.parse(decoded.publication.snapshot),next);assert.deepEqual(JSON.parse(first.publication.snapshot),base);
});
test('real saved raid transfers a changed worker without resending its roster',()=>{
 const authority=deserializeConfirmedState(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString()),view=deserializeConfirmedState(serializeConfirmedState(authority)),receiver=createConfirmedStateReceiver(view,'s'),encoder=createMainSnapshotEncoder(),decoder=createMainSnapshotDecoder(),actor=view.workers[0];
 receiver.accept(decoder.decode(encoder.encode(packet(1,serializeConfirmedState(authority)))).publication);authority.workers[0].x+=.125;
 const wire=encoder.encode(packet(2,serializeConfirmedState(authority))),patch=wire.publication.snapshotDelta.entities.find(([key])=>key==='workers');assert.equal(patch[2].length,1);assert.equal(patch[2][0][0],actor.id);assert.equal(receiver.accept(decoder.decode(wire).publication).accepted,true);assert.equal(view.workers[0],actor);assert.deepEqual(view,authority);
});
test('real raid updates one animal without resending the raid or changing actor identity',()=>{
 const authority=deserializeConfirmedState(gunzipSync(readFileSync('tests/fixtures/manglares-123-d10-raid-state.json.gz')).toString()),view=deserializeConfirmedState(serializeConfirmedState(authority)),receiver=createConfirmedStateReceiver(view,'s'),encoder=createMainSnapshotEncoder(),decoder=createMainSnapshotDecoder(),actor=view.raid.animals[0];
 receiver.accept(decoder.decode(encoder.encode(packet(1,serializeConfirmedState(authority)))).publication);authority.raid.animals[0].x+=.125;
 const wire=encoder.encode(packet(2,serializeConfirmedState(authority))),delta=wire.publication.snapshotDelta;assert.equal(delta.version,3);assert.equal(delta.raid.animals[1].length,1);assert.equal(delta.raid.animals[1][0][0],actor.id);assert.equal(receiver.accept(decoder.decode(wire).publication).accepted,true);assert.equal(view.raid.animals[0],actor);assert.deepEqual(view,authority);
});
test('raid deltas preserve metadata changes and reject invalid animal identities',()=>{
 const encoder=createMainSnapshotEncoder(),decoder=createMainSnapshotDecoder(),animals=Array.from({length:20},(_,i)=>({id:`a${i}`,data:'z'.repeat(80)})),initial={raid:{animals,version:1,old:true},padding:'x'.repeat(400)};
 decoder.decode(encoder.encode(packet(1,JSON.stringify(initial))));const next=structuredClone(initial);next.raid.version=2;delete next.raid.old;next.raid.newFlag=true;next.raid.animals[0].data='changed';next.raid.animals.reverse();
 const good=encoder.encode(packet(2,JSON.stringify(next))),raid=good.publication.snapshotDelta.raid;assert.equal(good.publication.snapshotDelta.version,3);assert.deepEqual(raid.removed,['old']);
 for(const bad of [{...raid,changed:[['animals','[]']]},{...raid,removed:['animals']},{...raid,animals:[raid.animals[0],[['a0','{"id":"wrong"}']]]},{...raid,animals:[...raid.animals,[]]}])assert.throws(()=>decoder.decode({...good,publication:{...good.publication,snapshotDelta:{...good.publication.snapshotDelta,raid:bad}}}));
 assert.deepEqual(JSON.parse(decoder.decode(good).publication.snapshot),next);
});
test('raid appearance and disappearance use complete state boundaries',()=>{
 const encoder=createMainSnapshotEncoder(),decoder=createMainSnapshotDecoder(),state={raid:null,padding:'x'.repeat(400)},animals=Array.from({length:5},(_,i)=>({id:`a${i}`,x:i}));decoder.decode(encoder.encode(packet(1,JSON.stringify(state))));
 const active={...state,raid:{animals}},born=encoder.encode(packet(2,JSON.stringify(active)));assert.equal(born.publication.snapshotDelta.version,1);assert.deepEqual(JSON.parse(decoder.decode(born).publication.snapshot),active);
 const ended=encoder.encode(packet(3,JSON.stringify(state)));assert.equal(ended.publication.snapshotDelta.version,1);assert.deepEqual(JSON.parse(decoder.decode(ended).publication.snapshot),state);
});
test('malformed entity deltas fail before advancing the baseline',()=>{
 const encoder=createMainSnapshotEncoder(),decoder=createMainSnapshotDecoder(),workers=Array.from({length:10},(_,i)=>({id:`w${i}`,data:'x'.repeat(100)})),first={workers,other:'x'.repeat(400)};
 decoder.decode(encoder.encode(packet(1,JSON.stringify(first))));const next=structuredClone(first);next.workers[0].data='changed';const good=encoder.encode(packet(2,JSON.stringify(next))),delta=good.publication.snapshotDelta,[key,order,updates]=delta.entities[0];
 for(const entities of [[[key,[...order,order[0]],updates]],[[key,order,[['missing','{}']]]],[[key,order,[['w0','{"id":"wrong"}']]]],[[key,[...order,'new'],updates]],[[key,order,updates],[key,order,updates]]])assert.throws(()=>decoder.decode({...good,publication:{...good.publication,snapshotDelta:{...delta,entities}}}));
 assert.deepEqual(JSON.parse(decoder.decode(good).publication.snapshot),next);
});
test('arrays without unique stable identities use a complete field replacement',()=>{
 const encoder=createMainSnapshotEncoder(),decoder=createMainSnapshotDecoder(),workers=[{id:'duplicate',x:1},{id:'duplicate',x:2}],base={workers,other:'x'.repeat(400)};
 decoder.decode(encoder.encode(packet(1,JSON.stringify(base))));const next=structuredClone(base);next.workers[0].x=3;const wire=encoder.encode(packet(2,JSON.stringify(next)));assert.equal(wire.publication.snapshotDelta.version,1);assert.ok(wire.publication.snapshotDelta.changed.some(([key])=>key==='workers'));assert.deepEqual(JSON.parse(decoder.decode(wire).publication.snapshot),next);
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
test('reception diagnostics include transport decoding, observers and acknowledgement',async()=>{
 const originalPerformance=globalThis.performance,originalParse=JSON.parse;let clock=0,current=0;
 globalThis.performance={now:()=>clock};JSON.parse=(...args)=>{clock+=7;return originalParse(...args);};
 try{
  const worker={postMessage:message=>{if(message.kind==='publicationAck')clock+=13;},terminate(){}},receiver={accept:publication=>{clock+=5;current=publication.sequence;return {accepted:true};},acceptUnchanged:()=>({accepted:true}),status:()=>({sequence:current,lastElapsed:0})};
  const runtime=createWorkerHostedRuntime({confirmedReceiver:receiver,session:'s',clientOptions:{},runtimeOptions:{mainThreadProjection:true,coalescePublications:true,diagnostics:true},workerFactory:()=>worker,onConfirmedState:()=>{clock+=11;},onConfirmedEvents:()=>{clock+=17;}});
  const start=runtime.start();worker.onmessage({data:packet(1,'{}',[{id:'event-1',type:'NightStarted'}])});worker.onmessage({data:{kind:'started',session:'s',sequence:1,status:{}}});await start;
  assert.equal(runtime.status().reception.mean,53);runtime.dispose();
 }finally{globalThis.performance=originalPerformance;JSON.parse=originalParse;}
});
