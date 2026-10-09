import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareLoadingFrames} from '../src/ui/loading-frame-preparation.js';
const clock=()=>{let callback,cleared=0;return {setTimer:fn=>(callback=fn,1),clearTimer:()=>cleared++,expire:()=>callback(),get cleared(){return cleared;}};};
test('HUD cache success and failure release bounded presentation wait',async()=>{
 const c=clock(),images={frame_tl:{}};assert.equal(await prepareLoadingFrames(()=>images,c),images);assert.equal(c.cleared,1);
 const d=clock();assert.equal(await prepareLoadingFrames(()=>Promise.reject(Error('offline')),d),null);assert.equal(d.cleared,1);
});
test('hung shared image falls back without adopting a late result or cancelling cache ownership',async()=>{
 const c=clock();let resolve;const pending=new Promise(r=>resolve=r),wait=prepareLoadingFrames(()=>pending,c);await Promise.resolve();c.expire();assert.equal(await wait,null);resolve({late:true});await pending;assert.equal(c.cleared,1);
});
test('owner abort wakes a hung UI wait and observes a later rejection',async()=>{
 const owner=new AbortController(),c=clock();let reject;const pending=new Promise((_,r)=>reject=r);
 const wait=prepareLoadingFrames(()=>pending,{...c,signal:owner.signal});await Promise.resolve();owner.abort();await assert.rejects(wait,{name:'AbortError'});reject(Error('late image failure'));await Promise.resolve();await Promise.resolve();assert.equal(c.cleared,1);
});

test('cancel before loader continuation does not initiate a shared request',async()=>{const owner=new AbortController(),c=clock();let calls=0;const wait=prepareLoadingFrames(()=>{calls++;return {};},{...c,signal:owner.signal});owner.abort();await assert.rejects(wait,{name:'AbortError'});await Promise.resolve();assert.equal(calls,0);});
