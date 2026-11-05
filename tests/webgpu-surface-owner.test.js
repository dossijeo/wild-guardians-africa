import test from 'node:test';
import assert from 'node:assert/strict';
import {createWebGpuSurfaceOwner} from '../src/rendering/webgpu-surface-owner.js';

test('closing during initialization waits for creation and asynchronous disposal',async()=>{
 const owner=createWebGpuSurfaceOwner();let create,finish,disposed=0,closed=false;const pending=new Promise(resolve=>{create=resolve;});owner.start(pending);const done=owner.close().then(()=>{closed=true;});assert.equal(owner.close(),owner.close());const surface={dispose(){disposed++;return new Promise(resolve=>{finish=resolve;});}};create(surface);await new Promise(resolve=>setImmediate(resolve));assert.equal(owner.claim(surface),false);assert.equal(disposed,1);assert.equal(closed,false);finish();await done;assert.equal(closed,true);
});

test('an initialized surface is disposed exactly once and creation failure closes cleanly',async()=>{
 const owner=createWebGpuSurfaceOwner();let disposed=0;const surface={dispose(){disposed++;}},pending=Promise.resolve(surface);owner.start(pending);assert.equal(owner.claim(await pending),true);await Promise.all([owner.close(),owner.close()]);assert.equal(disposed,1);
 const failed=createWebGpuSurfaceOwner(),error=Error('device unavailable'),promise=Promise.reject(error);failed.start(promise);await failed.close();await assert.rejects(promise,/device unavailable/);
});
