import test from 'node:test';
import assert from 'node:assert/strict';
import {urgentWork} from '../src/simulation/locomotion.js';
const worker={id:'w',profile:'olderMale',status:'walking',centerId:'c',contractDay:1};
test('urgent query stops only after strict matching-task threshold and remains live on the next query',()=>{
 const state={day:1,time:0,workers:[{...worker}],tasks:[{centerId:'other'},{centerId:'c',workerId:'assigned'},{centerId:'c'}]};
 assert.equal(urgentWork(state,worker),false);
 let suffixReads=0;const suffix={get centerId(){suffixReads++;return 'c';}};
 state.tasks.push({centerId:'c'},suffix);assert.equal(urgentWork(state,worker),true);assert.equal(suffixReads,0);
 state.tasks.splice(3,1);assert.equal(urgentWork(state,worker),true);assert.equal(suffixReads,1);
 state.workers.push({...worker,id:'w2'});assert.equal(urgentWork(state,worker),false);
 state.workers[1].status='returning';assert.equal(urgentWork(state,worker),true);
 state.time=250;const before=suffixReads;assert.equal(urgentWork(state,worker),false);assert.equal(suffixReads,before);
});
