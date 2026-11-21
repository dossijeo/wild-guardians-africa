import test from 'node:test';
import assert from 'node:assert/strict';
import {createEarlyGpuAttackGesture} from '../src/app/early-gpu-attack-gesture.js';

test('gesture uses real time while provisional and simulation time after confirmation',()=>{
 let now=0;const state={elapsed:4};const gate=createEarlyGpuAttackGesture({state,clock:()=>now});
 gate.begin({kind:'castAttack',id:'a'});assert.equal(gate.canBegin(),false);
 now=1740;assert.equal(gate.canBegin(),true);
 state.guardianAttackStartedAt=4;state.elapsed=4.2;gate.confirm('a');assert.equal(gate.canBegin(),false);
 now=50000;assert.equal(gate.canBegin(),false); // paused simulation
 state.elapsed=5.74;assert.equal(gate.canBegin(),true);
});
test('late responses cannot cancel or restart a newer gesture',()=>{
 let now=0;const state={elapsed:4};const gate=createEarlyGpuAttackGesture({state,clock:()=>now});
 gate.begin({kind:'castAttack',id:'a'});now=1740;gate.begin({kind:'castAttack',id:'b'});
 gate.reject('a');gate.confirm('a');assert.equal(gate.canBegin(),false);
 gate.reject('b');assert.equal(gate.canBegin(),true);
 gate.begin({kind:'castAgricultural',id:'c'});assert.equal(gate.canBegin(),true);
});
