import test from 'node:test';import assert from 'node:assert/strict';
import {farValidationErrors} from '../tools/experiments/far-validation-errors.js';
test('QA rejects hidden nested GPU failures even with clean global errors',()=>{
 const owner={stats:{errors:['late atlas']},adapters:[{stats:{errors:['invalid operation'],standby:{errors:['invalid buffer']}}},{stats:{errors:[],standby:{errors:[]}}}]};
 assert.deepEqual(farValidationErrors([],owner),['owner: late atlas','species 0: invalid operation','species 0 standby: invalid buffer']);
 assert.deepEqual(owner.adapters[0].stats.errors,['invalid operation']);
});
test('clean native resources keep global errors and support a not-yet-loaded owner',()=>{
 assert.deepEqual(farValidationErrors(['frame exception'],null),['frame exception']);
 assert.deepEqual(farValidationErrors([],{stats:{errors:[]},adapters:[]}),[]);
});
