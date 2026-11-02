import test from 'node:test';import assert from 'node:assert/strict';
import {createPausePresentationGate} from '../tools/trees/prototype_pause_presentation_gate.mjs';
test('pause freezes immediately and blocks resume until authority is reconciled',()=>{
 const gate=createPausePresentationGate('s',10);assert.equal(gate.requestPause(2),true);assert.equal(gate.advance(10),10);
 assert.equal(gate.confirmPause({session:'old',sequence:2,paused:true,time:10.05}),false);
 assert.equal(gate.confirmPause({session:'s',sequence:1,paused:true,time:10.05}),false);
 assert.equal(gate.confirmPause({session:'s',sequence:2,paused:true,time:10.05}),true);
 assert.equal(gate.snapshot().needsReconciliation,true);assert.equal(gate.advance(10.05),10);assert.equal(gate.requestResume(3),false);
 assert.equal(gate.confirmReconciled(10),false);assert.equal(gate.confirmReconciled(10.05),true);assert.equal(gate.requestResume(3),true);
 assert.equal(gate.confirmResume({session:'s',sequence:2,paused:false,time:10.05}),false);assert.equal(gate.confirmResume({session:'s',sequence:3,paused:false,time:10.05}),true);
 assert.equal(gate.snapshot().phase,'running');
});
test('inconsistent confirmation fails closed and cannot resume',()=>{
 const gate=createPausePresentationGate('s',10);gate.requestPause(2);assert.throws(()=>gate.confirmPause({session:'s',sequence:2,paused:false,time:10}));
 assert.equal(gate.snapshot().phase,'suspended');assert.equal(gate.requestResume(3),false);assert.throws(()=>gate.advance(11));
});
