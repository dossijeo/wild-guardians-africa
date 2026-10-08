import test from 'node:test';
import assert from 'node:assert/strict';
import {loadingYieldBudget} from '../src/rendering/loading-yield-budget.js';
test('cheap submissions share one CPU budget, then yield and reset after the frame',async()=>{let clock=0,yields=0;const work=loadingYieldBudget({frameBudget:6,now:()=>clock,nextFrame:async()=>{yields++;clock+=17;}});clock=2;await work();clock=5;await work();assert.equal(yields,0);clock=6;await work();assert.equal(yields,1);clock+=5;await work();assert.equal(yields,1);clock++;await work();assert.equal(yields,2);});
test('ordinary zero budget preserves one yield per submission',async()=>{let yields=0;const work=loadingYieldBudget({nextFrame:async()=>{yields++;}});await work();await work();assert.equal(yields,2);});
test('yield failure propagates and invalid budgets reject',async()=>{assert.throws(()=>loadingYieldBudget({frameBudget:-1}),/Invalid/);const work=loadingYieldBudget({nextFrame:async()=>{throw Error('abort');}});await assert.rejects(work(),/abort/);});
