import test from 'node:test';
import assert from 'node:assert/strict';
import {createHostPublicationQueue} from '../src/simulation/host-publication-queue.js';
const packet=(sequence,headings=[],events=[])=>({sequence,events,physicsPose:null,snapshot:String(sequence),presentationWorkerHeadings:headings});
test('coalescing retains each latest heading and removal before an event boundary',()=>{
 const sent=[],queue=createHostPublicationQueue({session:'s',send:value=>sent.push(value)});queue.publication(packet(1),true);queue.publication(packet(2,[{id:'a',yaw:1},{id:'b',yaw:2}]),true);queue.publication(packet(3,[{id:'a',yaw:3}]),true);queue.publication(packet(4,[{id:'b',yaw:null}],[{id:'event'}]),true);
 queue.ack(1);assert.equal(sent[1].firstSequence,2);assert.equal(sent[1].publication.sequence,3);assert.deepEqual(sent[1].publication.presentationWorkerHeadings,[{id:'a',yaw:3},{id:'b',yaw:2}]);queue.ack(3);assert.deepEqual(sent[2].publication.presentationWorkerHeadings,[{id:'b',yaw:null}]);assert.deepEqual(sent[2].publication.events,[{id:'event'}]);
});
test('world motion traces and terrain changes are ordered coalescing barriers',()=>{
 const sent=[],queue=createHostPublicationQueue({session:'s',send:value=>sent.push(value)});queue.publication(packet(1),true);queue.publication({...packet(2,[{id:'a',yaw:1}]),worldMotionTrace:{}},true);queue.publication(packet(3,[{id:'a',yaw:2}]),true);queue.publication({...packet(4),terrainChanged:true},true);
 queue.ack(1);assert.equal(sent[1].publication.sequence,2);queue.ack(2);assert.equal(sent[2].publication.sequence,3);queue.ack(3);assert.equal(sent[3].publication.sequence,4);
});
test('heading additions and removals remain ordered publication boundaries',()=>{
 const sent=[],queue=createHostPublicationQueue({session:'s',send:value=>sent.push(value)});queue.publication(packet(1),true);queue.publication(packet(2,[{id:'new',yaw:0,add:true}]),true);queue.publication(packet(3,[{id:'new',yaw:1}]),true);queue.publication(packet(4,[{id:'new',yaw:null}]),true);queue.ack(1);queue.ack(2);queue.ack(3);assert.deepEqual(sent.map(item=>item.publication.sequence),[1,2,3,4]);assert.equal(sent[1].publication.presentationWorkerHeadings[0].add,true);
});
