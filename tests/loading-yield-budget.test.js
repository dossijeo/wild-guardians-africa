import test from 'node:test';
import assert from 'node:assert/strict';
import {loadingYieldBudget} from '../src/rendering/loading-yield-budget.js';
test('cheap submissions share one CPU budget, then yield and reset after the frame',async()=>{let clock=0,yields=0;const work=loadingYieldBudget({frameBudget:6,now:()=>clock,nextFrame:async()=>{yields++;clock+=17;}});clock=2;await work();clock=5;await work();assert.equal(yields,0);clock=6;await work();assert.equal(yields,1);clock+=5;await work();assert.equal(yields,1);clock++;await work();assert.equal(yields,2);});
test('ordinary zero budget preserves one yield per submission',async()=>{let yields=0;const work=loadingYieldBudget({nextFrame:async()=>{yields++;}});await work();await work();assert.equal(yields,2);});
test('yield failure propagates and invalid budgets reject',async()=>{assert.throws(()=>loadingYieldBudget({frameBudget:-1}),/Invalid/);const work=loadingYieldBudget({nextFrame:async()=>{throw Error('abort');}});await assert.rejects(work(),/abort/);});


test('suspended frame cannot prevent owner cancellation',async()=>{
 const owner=new AbortController();let frames=0,rejectFrame;const work=loadingYieldBudget({signal:owner.signal,nextFrame:()=>{frames++;return new Promise((resolve,reject)=>{rejectFrame=reject;});}});
 const pending=work();owner.abort();await assert.rejects(pending,/cancelled/);assert.equal(frames,1);rejectFrame(Error('late frame'));await new Promise(resolve=>setImmediate(resolve));
});

test('deadline remains bounded when no animation frame arrives',async()=>{
 let clock=0;const work=loadingYieldBudget({now:()=>clock,timeout:1,pollIntervalMs:2,nextFrame:()=>new Promise(()=>{})});const pending=work();clock=2;await assert.rejects(pending,/timed out/);
});

test('cancelled cheap work cannot continue inside its CPU budget',async()=>{
 const work=loadingYieldBudget({frameBudget:6,now:()=>0,cancelled:()=>true,nextFrame:()=>assert.fail('must not request frame')});await assert.rejects(work(),/cancelled/);
});

test('optional yield witness separates elapsed budget from awaited frame and cannot break readiness',async()=>{
 let clock=0;const rows=[];
 const work=loadingYieldBudget({frameBudget:6,now:()=>clock,nextFrame:async()=>{clock+=17;},onYield:row=>{rows.push(row);throw Error('diagnostic');}});
 clock=5;await work();assert.equal(rows.length,0);clock=9;await work();assert.equal(rows.length,1);
 assert.equal(rows[0].budgetElapsed,9);assert.equal(rows[0].duration,17);assert.equal(rows[0].frameBudget,6);assert.equal(rows[0].failed,false);
});
