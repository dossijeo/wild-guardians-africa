import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostPublicationQueue} from '../src/simulation/host-publication-queue.js';
const packet=(sequence,events=[],physicsPose=null)=>({sequence,events,physicsPose,snapshot:String(sequence)});
test('coalesces only adjacent quiet ticks while preserving events, poses and command barriers',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',send:value=>sent.push(value)});
 q.publication(packet(1),true);q.publication(packet(2),true);q.publication(packet(3),true);q.publication(packet(4,[{id:'e'}]),true);q.publication(packet(5),true);q.message({kind:'commandResult',id:4,sequence:5});q.publication(packet(6),true);q.publication(packet(7,[],{active:true}),true);
 assert.equal(sent.length,1);q.ack(1);assert.equal(sent[1].firstSequence,2);assert.equal(sent[1].publication.sequence,4);assert.deepEqual(sent[1].publication.events,[{id:'e'}]);q.ack(4);assert.equal(sent[2].publication.sequence,5);q.ack(5);assert.equal(sent[3].kind,'commandResult');assert.equal(sent[4].publication.sequence,6);q.ack(6);assert.equal(sent[5].publication.sequence,7);q.ack(7);assert.equal(q.status().coalesced,2);assert.throws(()=>q.ack(7),/Invalid/);
});
test('a stalled receiver keeps one quiet pending state even across many ticks',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',send:value=>sent.push(value)});q.publication(packet(1),true);
 for(let sequence=2;sequence<=1001;sequence++)q.publication(packet(sequence,[],{actorId:'a',active:false}),true);
 assert.equal(q.status().queued,1);assert.equal(q.status().coalesced,999);q.ack(1);assert.equal(sent[1].firstSequence,2);assert.equal(sent[1].publication.sequence,1001);q.ack(1001);
});
test('active pose snapshots coalesce only while their owners remain the same',()=>{
 const sent=[],q=createHostPublicationQueue({session:'s',send:value=>sent.push(value)});q.publication(packet(1),true);
 q.publication(packet(2,[],{actorId:'a',active:true}),true);q.publication(packet(3,[],{actorId:'a',active:true}),true);q.publication(packet(4,[],{actorId:'b',active:true}),true);q.publication(packet(5,[],{actorId:'b',active:false}),true);
 assert.equal(q.status().coalesced,1);q.ack(1);assert.equal(sent[1].firstSequence,2);assert.equal(sent[1].publication.sequence,3);q.ack(3);assert.equal(sent[2].publication.sequence,4);q.ack(4);assert.equal(sent[3].publication.sequence,5);
});
