import test from 'node:test';
import assert from 'node:assert/strict';
import {deferVisibilityDuringVisualRecovery,takeDeferredRecoveryVisibility} from '../src/app/visual-recovery-visibility.js';

test('visibility changes coalesce only while recovery fences the Worker',()=>{
 let blocked=true;const owner={workerRuntime:{status:()=>({visualDispatchBlocked:blocked})}};
 assert.equal(deferVisibilityDuringVisualRecovery(owner,true,'hidden'),true);
 assert.equal(deferVisibilityDuringVisualRecovery(owner,false,'hidden'),true);
 assert.equal(deferVisibilityDuringVisualRecovery(owner,true,'menu'),false);
 assert.equal(takeDeferredRecoveryVisibility(owner),false);
 assert.equal(takeDeferredRecoveryVisibility(owner),null);
 blocked=false;assert.equal(deferVisibilityDuringVisualRecovery(owner,true,'hidden'),false);
});
