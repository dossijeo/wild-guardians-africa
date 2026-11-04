import test from 'node:test';
import assert from 'node:assert/strict';
import {createPresentationRecoveryJournal} from '../src/simulation/presentation-recovery-journal.js';
import {createPresentationRecoveryReplay} from '../src/simulation/presentation-recovery-replay.js';
const publication=(sequence,events=[])=>({sequence,events,snapshot:'s'+sequence,physicsPose:{actorId:'a',active:true},presentationJournal:events.map(e=>({kind:'event',eventId:e.id}))});
function fixture(){const sent=[],errors=[],caught=[],port={postMessage:m=>sent.push(structuredClone(m)),start(){}},journal=createPresentationRecoveryJournal({capacity:20,highWatermark:10}),checkpoint=publication(1,[{id:'old'}]);journal.begin(1);journal.confirm(1);const replay=createPresentationRecoveryReplay({port,session:'s',checkpoint,journal,onCaughtUp:x=>caught.push(x),onError:e=>errors.push(e.message)});const ack=()=>{const m=sent.at(-1);port.onmessage({data:{kind:'recoveryAck',session:'s',id:m.id,phase:m.kind.slice(8).toLowerCase(),sequence:m.sequence}})};return {sent,errors,caught,port,journal,replay,ack};}
test('recovery sends checkpoint once then terrain, events and poses in order with strict ACKs',()=>{
 const f=fixture();f.journal.appendTerrain(2,[{cx:1,bytes:new Uint8Array([7])}]);f.journal.appendTerrain(2,[{cx:2}]);f.journal.append(publication(2,[{id:'new'}]),true);assert.equal(f.sent[0].kind,'recoveryCheckpoint');f.ack();assert.equal(f.sent[1].kind,'recoveryTerrain');f.ack();assert.equal(f.sent[2].kind,'recoveryTerrain');assert.notEqual(f.sent[1].id,f.sent[2].id);f.ack();assert.equal(f.sent[3].kind,'recoveryPublication');assert.equal(f.sent[3].publication.events[0].id,'new');f.ack();assert.deepEqual(f.caught,[{sequence:2,entries:3}]);assert.deepEqual(f.errors,[]);f.replay.dispose();
});
test('in-flight recovery captures new entries and never signals caught-up between terrain and its publication',()=>{
 const f=fixture();f.journal.appendTerrain(2,[{cx:0}]);f.ack();f.ack();assert.equal(f.caught.length,0);f.journal.append(publication(2),true);f.replay.wake();assert.equal(f.sent.at(-1).kind,'recoveryPublication');f.journal.append(publication(3,[{id:'last'}]),true);f.ack();assert.equal(f.sent.at(-1).publication.events[0].id,'last');f.ack();assert.equal(f.caught.at(-1).sequence,3);
});
test('wrong, duplicate or out-of-session ACK fails closed without advancing cursor',()=>{
 const f=fixture(),m=f.sent[0];f.port.onmessage({data:{kind:'recoveryAck',session:'wrong',id:m.id,phase:'checkpoint',sequence:1}});assert.match(f.errors[0],/acknowledgement/);assert.equal(f.replay.status().cursor,1);assert.equal(f.sent.length,1);
 const g=fixture();g.journal.appendTerrain(2,[{cx:0}]);g.journal.appendTerrain(2,[{cx:1}]);g.ack();const old=g.sent.at(-1);g.ack();g.port.onmessage({data:{kind:'recoveryAck',session:'s',id:old.id,phase:'terrain',sequence:2}});assert.match(g.errors[0],/acknowledgement/);assert.equal(g.replay.status().cursor,1);
});
test('base promotion during replay is rejected instead of replaying a truncated history',()=>{
 const f=fixture();f.journal.append(publication(2),true);f.journal.begin(2);f.ack();f.journal.confirm(2);f.ack();assert.match(f.errors[0],/base changed/);
});

test('a publication appended after a provisional catch-up is delivered before the next catch-up',()=>{
 const f=fixture();f.ack();assert.deepEqual(f.caught,[{sequence:1,entries:0}]);f.journal.append(publication(2,[{id:'late'}]),true);f.replay.wake();assert.equal(f.sent.at(-1).publication.events[0].id,'late');f.ack();assert.deepEqual(f.caught.at(-1),{sequence:2,entries:1});
});
