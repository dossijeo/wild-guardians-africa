import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceWorkerRecovery,WORKER_RECOVERY} from '../src/simulation/worker-recovery.js';
const nav={walkable:()=>true,workerMotionClear:()=>true};
const worker=()=>({profile:'youngMale',x:10,z:20,heading:Math.PI/2,fallRemaining:1,status:'fleeing',path:[{x:11,z:20}]});
test('fall and recovery immobilize even incapacitated workers, then reconcile once',()=>{
 const w=worker();w.incapacitated=true;advanceWorkerRecovery(w,.5,nav);assert.equal(w.x,10);assert.equal(w.fallRemaining,.5);
 advanceWorkerRecovery(w,.75,nav);assert.equal(w.recovery.elapsed,.25);assert.equal(w.x,10);assert.equal(w.path,null);
 const expected={...w.recovery};advanceWorkerRecovery(w,10,nav);assert.equal(w.recovery,undefined);assert.equal(w.x,10+expected.dx);assert.equal(w.z,20+expected.dz);
 assert.equal(advanceWorkerRecovery(w,1,nav),false);assert.equal(w.x,10+expected.dx);
});
test('blocked recovery displacement cannot jump through an obstacle',()=>{
 const w=worker();advanceWorkerRecovery(w,1,{walkable:()=>false});assert.equal(w.recovery.fraction,0);advanceWorkerRecovery(w,4,nav);assert.equal(w.x,10);assert.equal(w.z,20);
});
test('saved recovery resumes deterministically with heading and remaining time',()=>{
 const a=worker();advanceWorkerRecovery(a,1.8,nav);const b=JSON.parse(JSON.stringify(a));advanceWorkerRecovery(a,3,nav);advanceWorkerRecovery(b,3,nav);assert.deepEqual(a,b);
 assert.ok(Math.abs(a.x-10-WORKER_RECOVERY.youngMale.finalOffset[2])<1e-10);
});

test('recovery exit blends without delaying navigation and survives save',()=>{
 const w=worker();advanceWorkerRecovery(w,5,nav);
 assert.equal(w.recoveryExitRemaining,.24);
 const saved=JSON.parse(JSON.stringify(w));
 assert.equal(advanceWorkerRecovery(w,.06,nav),false);
 advanceWorkerRecovery(saved,.06,nav);assert.deepEqual(saved,w);
 assert.ok(Math.abs(w.recoveryExitRemaining-.18)<1e-10);
 advanceWorkerRecovery(w,1,nav);assert.equal(w.recoveryExitRemaining,0);
});
