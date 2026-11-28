import test from 'node:test';
import assert from 'node:assert/strict';
import {createVersionWindow} from './browser/mobility-version-window.js';

test('retains unconfirmed ceilings and refuses work when its window is full',()=>{
 const w=createVersionWindow(3);w.append(1,2);w.append(2,3);
 assert.equal(w.permits(0,0),true);assert.equal(w.permits(1,3),false);assert.equal(w.canAppendAfter(0),false);
 assert.deepEqual(w.state(),{latest:2,confirmed:0,size:3,capacity:3});
 assert.equal(w.canAppendAfter(1),true);w.confirm(1);w.append(3,5);
 assert.equal(w.permits(0,0),false);assert.equal(w.permits(1,2),true);assert.equal(w.permits(3,5),true);
 assert.deepEqual(w.state(),{latest:3,confirmed:1,size:3,capacity:3});
});
test('rejects invalid and out-of-order versions without deleting live history',()=>{
 const w=createVersionWindow(3);w.append(1,3);assert.throws(()=>w.append(3,4));assert.throws(()=>w.append(2,2));assert.throws(()=>w.confirm(2));assert.equal(w.permits(1,-1),false);assert.equal(w.permits(1,4),false);assert.equal(w.permits(0,0),true);assert.equal(w.state().size,2);
});
test('repeated confirmations keep memory bounded',()=>{
 const w=createVersionWindow(4);for(let i=1;i<=10000;i++){assert.equal(w.canAppendAfter(i-1),true);w.confirm(i-1);w.append(i,i);assert.ok(w.state().size<=2);}assert.equal(w.permits(9999,9999),true);assert.equal(w.permits(9998,9998),false);
});
