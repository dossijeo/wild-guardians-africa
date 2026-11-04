import test from 'node:test';
import assert from 'node:assert/strict';
import {createPresentationRecoveryJournal,assertPresentationRecoveryBoundary,shouldRenewPresentationCheckpoint} from '../src/simulation/presentation-recovery-journal.js';
const publication=(sequence,events=[])=>({sequence,events,snapshot:'snapshot-'+sequence,physicsPose:{actorId:'a',active:true,bones:[sequence]},presentationJournal:events.map(e=>({kind:'event',eventId:e.id}))});
test('checkpoint promotion retains every later publication, pose and event in order',()=>{
 const j=createPresentationRecoveryJournal({capacity:8,highWatermark:5});
 assert.equal(j.append(publication(1),true),false);j.begin(1);
 const two=publication(2,[{id:'event-2'}]);j.append(two,true);two.events[0].id='mutated';j.append(publication(3),true,{backgroundView:false});
 assert.throws(()=>j.snapshot(),/not acknowledged/);assert.throws(()=>j.confirm(2),/mismatch/);j.confirm(1);
 const saved=j.snapshot();assert.equal(saved.base,1);assert.equal(saved.through,3);assert.equal(saved.entries[0].publication.events[0].id,'event-2');assert.deepEqual(saved.entries.map(e=>e.publication.sequence),[2,3]);assert.equal(saved.entries[1].publication.physicsPose.bones[0],3);
 saved.entries[0].publication.events.length=0;assert.equal(j.snapshot().entries[0].publication.events.length,1);
});
test('new candidate does not discard old replay until its exact acknowledgement',()=>{
 const j=createPresentationRecoveryJournal({capacity:8,highWatermark:5});j.begin(1);j.confirm(1);j.append(publication(2),true);j.append(publication(3,[{id:'event-3'}]),true);j.begin(3);j.append(publication(4,[{id:'event-4'}]),true);
 assert.equal(j.snapshot().base,1);assert.deepEqual(j.snapshot().entries.map(e=>e.publication.sequence),[2,3,4]);assert.throws(()=>j.confirm(2),/mismatch/);j.confirm(3);assert.equal(j.snapshot().base,3);assert.deepEqual(j.snapshot().entries.map(e=>e.publication.sequence),[4]);
});
test('journal signals saturation before capacity and never silently drops a publication',()=>{
 const j=createPresentationRecoveryJournal({capacity:3,highWatermark:2});j.begin(1);j.confirm(1);j.append(publication(2),true);j.append(publication(3),true);assert.equal(j.status().saturated,true);j.append(publication(4),true);assert.throws(()=>j.append(publication(5),true),/capacity/);assert.deepEqual(j.snapshot().entries.map(e=>e.publication.sequence),[2,3,4]);assert.throws(()=>j.append(publication(6),true),/gap/);j.dispose();assert.throws(()=>j.snapshot(),/closed/);
});

test('terrain batches precede their publication, survive candidate ACK and retain independent bytes',()=>{
 const j=createPresentationRecoveryJournal({capacity:9,highWatermark:7});j.begin(4);const bytes=new Uint8Array([1,2]);
 j.appendTerrain(5,[{cx:0,cz:0,positions:bytes}]);j.appendTerrain(5,[{cx:1,cz:0}]);j.append(publication(5,[{id:'e'}]),true);j.confirm(4);bytes[0]=99;
 assert.deepEqual(j.snapshot().entries.map(e=>[e.kind,e.sequence]),[['terrain',5],['terrain',5],['publication',5]]);assert.equal(j.snapshot().entries[0].chunks[0].positions[0],1);
 assert.throws(()=>j.appendTerrain(5,[]),/sequence gap/);assert.throws(()=>j.appendTerrain(7,[]),/sequence gap/);
 j.appendTerrain(6,[{cx:2,cz:0}]);j.append(publication(6),true);j.begin(6);j.appendTerrain(7,[{cx:3,cz:0}]);j.append(publication(7),true);j.confirm(6);assert.deepEqual(j.snapshot().entries.map(e=>[e.kind,e.sequence]),[['terrain',7],['publication',7]]);
});

test('byte pressure is bounded and releases memory only on checkpoint promotion',()=>{
 const j=createPresentationRecoveryJournal({capacity:8,highWatermark:6,maxBytes:4096,highWatermarkBytes:700});j.begin(1);j.confirm(1);j.appendTerrain(2,[{pixels:new Uint8Array(900)}]);assert.ok(j.status().bytes>=900);assert.equal(j.status().saturated,true);const before=j.status().bytes;
 assert.throws(()=>j.appendTerrain(2,[{pixels:new Uint8Array(4096)}]),/byte capacity/);assert.equal(j.status().bytes,before);j.append(publication(2),true);j.begin(2);j.confirm(2);assert.equal(j.status().bytes,0);assert.equal(j.status().saturated,false);
});

test('recovery boundary fails closed on channel error, missing publication, pending terrain, candidate or saturation',()=>{
 const j=createPresentationRecoveryJournal({capacity:6,highWatermark:4}),stream={status:()=>({active:true})},checkpoint={sequence:1};j.begin(1);j.confirm(1);assert.equal(assertPresentationRecoveryBoundary(j,stream,checkpoint,1),1);
 assert.throws(()=>assertPresentationRecoveryBoundary(j,{status:()=>({active:true,recoveryFailure:'overflow'})},checkpoint,1),/incomplete/);
 assert.throws(()=>assertPresentationRecoveryBoundary(j,stream,checkpoint,2),/incomplete/);
 j.appendTerrain(2,[{cx:0}]);assert.throws(()=>assertPresentationRecoveryBoundary(j,stream,checkpoint,1),/incomplete/);j.append(publication(2),true);assert.equal(assertPresentationRecoveryBoundary(j,stream,checkpoint,2),2);
 j.begin(2);assert.throws(()=>assertPresentationRecoveryBoundary(j,stream,checkpoint,2),/incomplete/);j.confirm(2);j.append(publication(3),true);j.append(publication(4),true);j.append(publication(5),true);j.append(publication(6),true);assert.throws(()=>assertPresentationRecoveryBoundary(j,stream,{sequence:2},6),/saturated/);
});

test('checkpoint renewal starts early and waits for exact candidate acknowledgement',()=>{
 const j=createPresentationRecoveryJournal({capacity:8,highWatermark:4,maxBytes:100000,highWatermarkBytes:90000});
 assert.equal(shouldRenewPresentationCheckpoint(j.status()),false);j.begin(1);j.confirm(1);
 const p=n=>({sequence:n,snapshot:'x',events:[],physicsPose:null});
 j.append(p(2),true);assert.equal(shouldRenewPresentationCheckpoint(j.status()),false);
 j.append(p(3),true);assert.equal(shouldRenewPresentationCheckpoint(j.status()),true);
 j.begin(3);assert.equal(shouldRenewPresentationCheckpoint(j.status()),false);j.append(p(4),true);j.confirm(3);
 assert.equal(shouldRenewPresentationCheckpoint(j.status()),false);assert.equal(j.status().through,4);
});

