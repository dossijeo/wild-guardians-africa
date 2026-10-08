import test from 'node:test';
import assert from 'node:assert/strict';
import {NativePreparationCadence} from '../tools/experiments/native-preparation-cadence.js';

test('default admits every attempt, including multiple attempts in one clock tick',()=>{
 const gate=new NativePreparationCadence();
 for(const now of [0,0,1,20,20,100])assert.equal(gate.admit(now),true);
});
test('QA interval defers attempts until the next eligible update, with no timer',()=>{
 const gate=new NativePreparationCadence(120);
 assert.equal(gate.admit(1000),true);
 for(const now of [1000,1001,1100,1119])assert.equal(gate.admit(now),false);
 assert.equal(gate.last,1000);
 assert.equal(gate.admit(1120),true);
 assert.equal(gate.admit(2000),true);
});
test('invalid clocks and intervals cannot silently disable readiness',()=>{
 for(const interval of [-1,Infinity,NaN,1001,'120'])assert.throws(()=>new NativePreparationCadence(interval));
 const gate=new NativePreparationCadence(120);
 assert.throws(()=>gate.admit(NaN));assert.equal(gate.admit(20),true);
 assert.throws(()=>gate.admit(19));assert.equal(gate.last,20);
});
