import test from 'node:test';
import assert from 'node:assert/strict';
import {loadingSyncWitness,loadingAwaitWitness} from '../src/rendering/loading-sync-witness.js';
test('disabled synchronous witness returns the same result without clock access',()=>{const result={};assert.equal(loadingSyncWitness(null,'x',()=>result,()=>{throw Error('clock');}),result);});
test('enabled witness reports the synchronous window without awaiting its returned promise',()=>{const result=Promise.resolve(1),rows=[];let clock=10;assert.equal(loadingSyncWitness(r=>rows.push(r),'sync',()=>result,()=>clock++),result);assert.equal(rows.length,1);assert.equal(rows[0].duration,1);assert.equal(rows[0].failed,false);assert.match(rows[0].scope,/no GPU/);});
test('diagnostic failures cannot change original success or failure',()=>{const result={};assert.equal(loadingSyncWitness(()=>{throw Error('diagnostic');},'sync',()=>result),result);const failure=Error('original');assert.throws(()=>loadingSyncWitness(()=>{throw Error('diagnostic');},'sync',()=>{throw failure;}),e=>e===failure);});

test('disabled awaited phase witness preserves exact promise and avoids clock access',()=>{const promise=Promise.resolve(1);assert.equal(loadingAwaitWitness(null,'phase',()=>promise,()=>assert.fail('no clock')),promise);});
test('awaited phase attribution retains results and original failures without claiming exclusive CPU',async()=>{
 let clock=0,finish;const rows=[],promise=new Promise(resolve=>{finish=resolve;});
 const pending=loadingAwaitWitness(row=>{rows.push(row);throw Error('diagnostic');},'phase',()=>promise,()=>clock);assert.equal(rows.length,0);clock=17;finish(42);assert.equal(await pending,42);assert.equal(rows[0].duration,17);assert.match(rows[0].scope,/not exclusive CPU/);
 const error=Error('original');await assert.rejects(loadingAwaitWitness(row=>rows.push(row),'reject',()=>Promise.reject(error)),value=>value===error);assert.equal(rows.at(-1).failed,true);
 assert.throws(()=>loadingAwaitWitness(row=>rows.push(row),'throw',()=>{throw error;}),value=>value===error);
});

test('scene frame attribution preserves stage/draw order and synchronous error without extra yields',async()=>{const {WorldScene}=await import('../src/rendering/scene.js');const rows=[],order=[],world={onLoadingSpan:s=>rows.push(s),*renderFrameUpdates(dt){order.push(['first',dt]);yield;order.push(['second',dt]);yield;order.push(['last',dt]);},drawRenderFrame(){order.push(['draw']);return 42;}};assert.equal(WorldScene.prototype.render.call(world,.5),42);assert.deepEqual(order,[['first',.5],['second',.5],['last',.5],['draw']]);assert.deepEqual(rows.map(s=>s.label),['world-frame-stage:0','world-frame-stage:1','world-frame-stage:2','world-frame-draw']);let frames=0;world.disposed=false;world.loading=new AbortController();assert.equal(await WorldScene.prototype.renderLoadingFrame.call(world,{nextFrame:async()=>frames++}),42);assert.equal(frames,2);const error=Error('draw');world.drawRenderFrame=()=>{throw error;};assert.throws(()=>WorldScene.prototype.render.call(world,0),e=>e===error);assert.equal(rows.at(-1).failed,true);});
