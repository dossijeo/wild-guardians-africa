import test from 'node:test';
import assert from 'node:assert/strict';
import {recoverWorkVfxForQa} from '../src/rendering/work-vfx-recovery-qa.js';

test('QA recovery accepts only the exact current confirmed sequence',async()=>{
 const state={elapsed:3},checkpoint={sequence:4,elapsed:3,effects:[]},calls=[],manager={importWorkCheckpoint:(...args)=>calls.push(args)},runtime={status:()=>({running:true,confirmedSequence:4})},client={captureWorkCheckpointForQa:async()=>checkpoint};assert.deepEqual(await recoverWorkVfxForQa({client,runtime,manager,state}),{sequence:4,effects:0});assert.equal(calls.length,1);
 runtime.status=()=>({running:true,confirmedSequence:5});await assert.rejects(recoverWorkVfxForQa({client,runtime,manager,state}),/Stale/);assert.equal(calls.length,1);
 let count=0;runtime.status=()=>({running:true,confirmedSequence:++count===1?4:5});await assert.rejects(recoverWorkVfxForQa({client,runtime,manager,state}),/Stale/);assert.equal(calls.length,1);
});
