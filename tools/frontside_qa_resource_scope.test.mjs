import test from 'node:test';
import assert from 'node:assert/strict';
import {createQaResourceScope} from './lib/frontside-qa-resource-scope.mjs';
test('partial initialization releases earlier owners despite a disposal failure',()=>{
 const scope=createQaResourceScope(),calls=[];
 scope.defer('renderer',()=>calls.push('renderer'));
 scope.defer('Assets',()=>calls.push('Assets'));
 scope.defer('broken material',()=>{calls.push('material');throw Error('synthetic disposal error');});
 const result=scope.cleanup();assert.deepEqual(calls,['material','Assets','renderer']);
 assert.deepEqual(result.errors,[{label:'broken material',message:'synthetic disposal error'}]);
 assert.throws(()=>scope.assertOpen(),/cancelled or disposed/);
 scope.cleanup();assert.equal(calls.length,3);
});
test('an asynchronous owner arriving after cancellation is disposed immediately',async()=>{
 const scope=createQaResourceScope(),calls=[];
 const pending=Promise.resolve().then(()=>scope.defer('late texture',()=>calls.push('late texture')));
 scope.cleanup();await pending;assert.deepEqual(calls,['late texture']);
 assert.deepEqual(scope.result.disposed,['late texture']);
});
