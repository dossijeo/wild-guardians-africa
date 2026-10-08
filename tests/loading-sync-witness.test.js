import test from 'node:test';
import assert from 'node:assert/strict';
import {loadingSyncWitness} from '../src/rendering/loading-sync-witness.js';
test('disabled synchronous witness returns the same result without clock access',()=>{const result={};assert.equal(loadingSyncWitness(null,'x',()=>result,()=>{throw Error('clock');}),result);});
test('enabled witness reports the synchronous window without awaiting its returned promise',()=>{const result=Promise.resolve(1),rows=[];let clock=10;assert.equal(loadingSyncWitness(r=>rows.push(r),'sync',()=>result,()=>clock++),result);assert.equal(rows.length,1);assert.equal(rows[0].duration,1);assert.equal(rows[0].failed,false);assert.match(rows[0].scope,/no GPU/);});
test('diagnostic failures cannot change original success or failure',()=>{const result={};assert.equal(loadingSyncWitness(()=>{throw Error('diagnostic');},'sync',()=>result),result);const failure=Error('original');assert.throws(()=>loadingSyncWitness(()=>{throw Error('diagnostic');},'sync',()=>{throw failure;}),e=>e===failure);});
