import test from 'node:test';
import assert from 'node:assert/strict';
import {createRemoteFrameTimeGuard} from '../src/rendering/remote-frame-time-guard.js';

const moving=({elapsed=10,startAt=1000,end=12,sequence=1,epoch=10}={})=>({version:1,sequence,epoch,elapsed,anchorAbsoluteMs:startAt,safeUntil:end,paused:false,segments:[{start:elapsed,end,rate:1,realDuration:end-elapsed}]});
const frozen=(elapsed,sequence=1)=>({version:1,sequence,epoch:10,elapsed,anchorAbsoluteMs:0,safeUntil:elapsed,paused:true,segments:[]});
const submit=(guard,generation,lease,absoluteNow)=>guard.consume(guard.propose({generation,lease,absoluteNow}));

test('ordinary older producer samples are accepted when evaluated time does not rewind',()=>{
 const guard=createRemoteFrameTimeGuard();submit(guard,1,moving(),1500);
 const lease=moving({elapsed:10.25,startAt:1250});const before=structuredClone(lease);
 const ticket=guard.propose({generation:2,lease,absoluteNow:1750});assert.equal(ticket.elapsed,10.75);
 assert.equal(guard.status().elapsed,10.5);guard.consume(ticket);assert.equal(guard.status().elapsed,10.75);assert.deepEqual(lease,before);
});

test('CPU resources with an older paused lease are rejected, never silently advanced',()=>{
 const guard=createRemoteFrameTimeGuard();submit(guard,1,moving(),1500);const before=guard.status();
 assert.throws(()=>guard.propose({generation:2,lease:frozen(10.25,2),absoluteNow:2000}),{code:'remote-frame-time-regression'});
 assert.deepEqual(guard.status(),before);
});

test('replay advances the same generation only to its safe horizon',()=>{
 const guard=createRemoteFrameTimeGuard(),lease=moving();submit(guard,1,lease,1000);submit(guard,1,lease,1250);assert.equal(guard.status().elapsed,10.25);
 submit(guard,1,lease,10000);assert.equal(guard.status().elapsed,12);submit(guard,1,lease,20000);assert.equal(guard.status().elapsed,12);
});

test('frozen equal-time publications and higher sequences are valid',()=>{
 const guard=createRemoteFrameTimeGuard();submit(guard,1,frozen(10),1000);submit(guard,2,frozen(10),2000);submit(guard,3,frozen(10,2),3000);
 assert.equal(guard.status().elapsed,10);assert.equal(guard.status().sequence,2);
});

test('only successfully consumed frames establish chronology',()=>{
 const guard=createRemoteFrameTimeGuard(),discarded=guard.propose({generation:5,lease:frozen(11),absoluteNow:1000});
 assert.equal(guard.status().generation,0);submit(guard,1,frozen(10),1100);
 assert.throws(()=>guard.consume(discarded),{code:'remote-frame-time-proposal-stale'});
 const ticket=guard.propose({generation:2,lease:frozen(10),absoluteNow:1200});guard.consume(ticket);
 assert.throws(()=>guard.consume(ticket),{code:'remote-frame-time-proposal-stale'});
 assert.throws(()=>guard.consume({...ticket}),{code:'remote-frame-time-proposal-stale'});
});

test('generation, authority sequence and clock epoch cannot be replaced by older identities',()=>{
 const guard=createRemoteFrameTimeGuard();submit(guard,3,frozen(11,5),1000);
 assert.throws(()=>guard.propose({generation:2,lease:frozen(11,5),absoluteNow:1100}),{code:'remote-frame-generation-regression'});
 assert.throws(()=>guard.propose({generation:4,lease:frozen(11,4),absoluteNow:1100}),{code:'remote-clock-sequence-regression'});
 assert.throws(()=>guard.propose({generation:4,lease:{...frozen(11,6),epoch:0},absoluteNow:1100}),{code:'remote-clock-epoch-mismatch'});
});

test('untimed bootstrap is allowed but cannot erase established clock safety',()=>{
 const guard=createRemoteFrameTimeGuard();submit(guard,1,null,1000);submit(guard,2,null,2000);assert.equal(guard.status().elapsed,null);
 submit(guard,3,frozen(10),3000);
 assert.throws(()=>guard.propose({generation:4,lease:null,absoluteNow:4000}),{code:'remote-clock-lease-missing'});
});

test('reordered wall timestamps cannot rewind autonomous output',()=>{
 const guard=createRemoteFrameTimeGuard();submit(guard,1,moving(),1700);
 assert.throws(()=>guard.propose({generation:1,lease:moving(),absoluteNow:1600}),{code:'remote-frame-time-regression'});
 assert.equal(guard.status().elapsed,10.7);
});

test('an explicit mutation minimum advances only within the existing resource ceiling and remains transactional',()=>{
 const guard=createRemoteFrameTimeGuard(),lease=moving();submit(guard,1,lease,1000);
 const ticket=guard.propose({generation:2,lease,absoluteNow:1100,minimum:11});assert.equal(ticket.elapsed,11);
 assert.equal(guard.status().elapsed,10);guard.consume(ticket);assert.equal(guard.status().elapsed,11);
 assert.throws(()=>guard.propose({generation:3,lease,absoluteNow:1200,minimum:12.1}),{code:'remote-clock-resource-expired'});
 assert.throws(()=>guard.propose({generation:3,lease:null,absoluteNow:1200,minimum:11}),{code:'remote-clock-lease-missing'});
 assert.equal(guard.status().elapsed,11);
});
