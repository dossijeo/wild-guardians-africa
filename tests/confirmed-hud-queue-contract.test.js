import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../src/simulation/game.js';
import {projectConfirmedHud,validateConfirmedHudSchema} from '../src/simulation/confirmed-hud-projection.js';
import {createConfirmedHudDeltaEncoder,createConfirmedHudDeltaDecoder} from '../src/simulation/confirmed-hud-delta.js';
import {createHostPublicationQueue} from '../src/simulation/host-publication-queue.js';
import {createConfirmedHudReceiver} from '../src/simulation/confirmed-hud-receiver.js';

test('HUD deltas are encoded only after coalescing and ACK keeps the last applied base',()=>{
 const state=newGame({seed:803}),encoder=createConfirmedHudDeltaEncoder({validate:validateConfirmedHudSchema}),decoder=createConfirmedHudDeltaDecoder({validate:validateConfirmedHudSchema}),sent=[];
 const queue=createHostPublicationQueue({session:'s',send:envelope=>{const {hudProjection,...publication}=envelope.publication;sent.push({...envelope,publication:{...publication,hudDelta:encoder.encode(hudProjection)}});}});
 const packet=(sequence,events=[])=>({sequence,events,physicsPose:null,snapshot:'unused',hudProjection:projectConfirmedHud(state,sequence)});
 queue.publication(packet(1),true);queue.publication(packet(2),true);queue.publication(packet(3,[{id:'event-1',type:'example'}]),true);
 assert.equal(sent.length,1);assert.equal(sent[0].publication.hudDelta.kind,'baseline');assert.equal(decoder.decode(sent[0].publication.hudDelta).sequence,1);
 assert.throws(()=>queue.ack(2),/acknowledgement/);queue.ack(1);assert.equal(sent.length,2);assert.equal(sent[1].firstSequence,2);assert.equal(sent[1].publication.sequence,3);assert.equal(sent[1].publication.hudDelta.base,1);assert.deepEqual(sent[1].publication.events,[{id:'event-1',type:'example'}]);assert.equal(decoder.decode(sent[1].publication.hudDelta).sequence,3);queue.ack(3);assert.equal(queue.status().inFlight,0);
});

test('lightweight receiver preserves barriers and ACKs only applied ordered publications',()=>{
 const state=newGame({seed:805}),encoder=createConfirmedHudDeltaEncoder({validate:validateConfirmedHudSchema}),sent=[],observed=[],receiver=createConfirmedHudReceiver({session:'s',onPublication:(view,envelope)=>observed.push({view,envelope})});
 const queue=createHostPublicationQueue({session:'s',send:envelope=>{const {hudProjection,...publication}=envelope.publication;sent.push({...envelope,publication:{...publication,hudDelta:encoder.encode(hudProjection)}});}});
 const packet=(sequence,events=[],extra={})=>({sequence,events,physicsPose:null,snapshot:'unused',hudProjection:projectConfirmedHud(state,sequence),...extra});
 queue.publication(packet(1),true);queue.publication(packet(2,[],{tutorialGuideRevision:4}),true);queue.publication(packet(3,[{id:'event-1',type:'example'}],{tutorialGuideRevision:4}),true);
 assert.throws(()=>receiver.accept({...sent[0],session:'wrong'}),/Invalid HUD publication/);assert.equal(receiver.status().sequence,0);assert.equal(receiver.accept(sent[0]).sequence,1);queue.ack(1);
 assert.equal(sent[1].firstSequence,2);assert.throws(()=>receiver.accept({...sent[1],firstSequence:3}),/Invalid HUD publication/);assert.equal(receiver.status().sequence,1);assert.equal(receiver.accept(sent[1]).sequence,3);assert.equal(observed[1].view.sequence,3);assert.equal(observed[1].envelope.publication.tutorialGuideRevision,4);assert.deepEqual(observed[1].envelope.publication.events,[{id:'event-1',type:'example'}]);queue.ack(3);receiver.dispose();
});

test('invalid state or delta does not advance receiver and a corrected publication can be applied',()=>{
 const state=newGame({seed:807}),encoder=createConfirmedHudDeltaEncoder({validate:validateConfirmedHudSchema}),received=[],receiver=createConfirmedHudReceiver({session:'s',onPublication:view=>received.push(view.sequence)}),make=(sequence,hudDelta)=>({kind:'publication',session:'s',publication:{sequence,events:[],hudDelta}});
 const first=encoder.encode(projectConfirmedHud(state,1));receiver.accept(make(1,first));state.time=2;const delta=encoder.encode(projectConfirmedHud(state,2)),next=make(2,delta);
 assert.throws(()=>receiver.accept({...next,publication:{...next.publication,hudDelta:{...delta,base:0}}}),/base mismatch/);assert.throws(()=>receiver.accept({...next,publication:{...next.publication,elapsed:99}}),/Inconsistent/);assert.equal(receiver.status().sequence,1);assert.equal(receiver.accept(next).sequence,2);assert.deepEqual(received,[1,2]);receiver.dispose();
});

test('callback failure cannot be acknowledged or replayed as a committed HUD view',()=>{
 const state=newGame({seed:806}),encoder=createConfirmedHudDeltaEncoder({validate:validateConfirmedHudSchema}),receiver=createConfirmedHudReceiver({session:'s',onPublication(){throw Error('observer failed');}}),message={kind:'publication',session:'s',firstSequence:1,publication:{sequence:1,events:[],hudDelta:encoder.encode(projectConfirmedHud(state,1))}};
 assert.throws(()=>receiver.accept(message),/observer failed/);assert.equal(receiver.status().sequence,0);assert.equal(receiver.status().fault,true);assert.throws(()=>receiver.accept(message),/unavailable/);receiver.dispose();
});

test('unchanged publication advances envelope order without advancing the HUD delta base',()=>{
 const state=newGame({seed:808}),encoder=createConfirmedHudDeltaEncoder({validate:validateConfirmedHudSchema}),seen=[],receiver=createConfirmedHudReceiver({session:'s',onPublication:(view,envelope)=>seen.push([view.sequence,envelope.publication.sequence])}),baseline=encoder.encode(projectConfirmedHud(state,1));
 receiver.accept({kind:'publication',session:'s',publication:{sequence:1,events:[],hudDelta:baseline}});
 const unchanged={kind:'publication',session:'s',publication:{sequence:2,unchanged:true,events:[],slotId:state.slotId,elapsed:state.elapsed,pauses:[...state.pauses]}};
 assert.throws(()=>receiver.accept({...unchanged,publication:{...unchanged.publication,events:[{id:'event-1'}]}}),/Invalid unchanged/);assert.equal(receiver.accept(unchanged).sequence,2);
 state.time=3;const delta=encoder.encode(projectConfirmedHud(state,3));assert.equal(delta.base,1);assert.equal(receiver.accept({kind:'publication',session:'s',publication:{sequence:3,events:[],hudDelta:delta}}).sequence,3);assert.deepEqual(seen,[[1,1],[1,2],[3,3]]);receiver.dispose();
});

test('saturation does not advance the HUD codec or discard queued ordered events',()=>{
 const state=newGame({seed:804}),encoder=createConfirmedHudDeltaEncoder({validate:validateConfirmedHudSchema}),decoder=createConfirmedHudDeltaDecoder({validate:validateConfirmedHudSchema}),sent=[];
 const queue=createHostPublicationQueue({session:'s',coalesce:false,maxQueued:1,send:envelope=>{sent.push({...envelope,packet:encoder.encode(envelope.publication.hudProjection)});}});
 const packet=(sequence,id)=>({sequence,events:[{id,type:'example'}],physicsPose:null,snapshot:'unused',hudProjection:projectConfirmedHud(state,sequence)});
 queue.publication(packet(1,'event-1'),true);queue.publication(packet(2,'event-2'),true);assert.throws(()=>queue.publication(packet(3,'event-3'),true),/capacity/);assert.equal(sent.length,1);assert.equal(decoder.decode(sent[0].packet).sequence,1);queue.ack(1);assert.equal(sent[1].packet.base,1);assert.deepEqual(sent[1].publication.events,[{id:'event-2',type:'example'}]);assert.equal(decoder.decode(sent[1].packet).sequence,2);queue.ack(2);queue.publication(packet(3,'event-3'),true);assert.equal(sent[2].packet.base,2);assert.equal(decoder.decode(sent[2].packet).sequence,3);queue.ack(3);
});
