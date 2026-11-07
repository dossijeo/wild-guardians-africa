import test from 'node:test';
import assert from 'node:assert/strict';
import {deferVisibilityDuringVisualRecovery} from '../src/app/visual-recovery-visibility.js';

test('visibility changes go to the recovery host only while the worker is fenced',async()=>{
 let blocked=true;const sent=[],owner={workerRuntime:{status:()=>({visualDispatchBlocked:blocked}),stageRecoveryVisibility(value){sent.push(value);return Promise.resolve();}}};assert.equal(deferVisibilityDuringVisualRecovery(owner,true,'hidden'),true);assert.equal(deferVisibilityDuringVisualRecovery(owner,false,'hidden'),true);assert.equal(deferVisibilityDuringVisualRecovery(owner,true,'menu'),false);await owner.pendingVisualRecoveryVisibility;assert.deepEqual(sent,[true,false]);blocked=false;assert.equal(deferVisibilityDuringVisualRecovery(owner,true,'hidden'),false);
});

test('visibility intent is sent immediately while commands are fenced, with the latest promise tracked',async()=>{const sent=[],errors=[],runtime={status:()=>({visualDispatchBlocked:true}),stageRecoveryVisibility(value){sent.push(value);return value?Promise.resolve():Promise.reject(Error('staging failed'));}},owner={workerRuntime:runtime};assert.equal(deferVisibilityDuringVisualRecovery(owner,true,'hidden',error=>errors.push(error.message)),true);await owner.pendingVisualRecoveryVisibility;assert.deepEqual(sent,[true]);assert.equal(deferVisibilityDuringVisualRecovery(owner,false,'hidden',error=>errors.push(error.message)),true);await assert.rejects(owner.pendingVisualRecoveryVisibility,/staging failed/);await Promise.resolve();assert.deepEqual(sent,[true,false]);assert.deepEqual(errors,['staging failed']);});

test('missing system intent channel fails visibly instead of dropping a pause',async()=>{const errors=[],owner={workerRuntime:{status:()=>({visualDispatchBlocked:true})}};assert.equal(deferVisibilityDuringVisualRecovery(owner,true,'hidden',error=>errors.push(error.message)),true);await assert.rejects(owner.pendingVisualRecoveryVisibility,/channel unavailable/);assert.deepEqual(errors,['Recovery visibility channel unavailable']);});
