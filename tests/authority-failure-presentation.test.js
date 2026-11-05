import test from 'node:test';
import assert from 'node:assert/strict';
import {closeAuthorityFailurePresentation} from '../src/app/authority-failure-presentation.js';
import {createWorkerHostedRuntime} from '../src/simulation/worker-hosted-runtime.js';

test('authority failure closes only the session presentation without mutating game state',()=>{
 const state={money:4},calls=[],owner={state,webGpuWorld:{dispose(){calls.push('dispose');}}};
 assert.equal(closeAuthorityFailurePresentation(owner),true);assert.deepEqual(calls,['dispose']);assert.equal(owner.webGpuWorld,null);assert.deepEqual(state,{money:4});assert.equal(closeAuthorityFailurePresentation(owner),false);
});
test('abrupt host failure rejects pending commands and closes its own presentation',async()=>{
 const worker={postMessage(){},terminate(){}},receiver={accept(){return {accepted:true};},acceptUnchanged(){return {accepted:true};},status(){return {sequence:1,lastElapsed:0};}},state={money:4},owner={state,webGpuWorld:{dispose(){owner.disposed=true;}}},errors=[],runtime=createWorkerHostedRuntime({confirmedReceiver:receiver,session:'s',clientOptions:{},workerFactory:()=>worker,onError:error=>{closeAuthorityFailurePresentation(owner);errors.push(error.message);}}),started=runtime.start();
 worker.onmessage({data:{kind:'publication',session:'s',publication:{sequence:1,elapsed:0,events:[]}}});worker.onmessage({data:{kind:'started',session:'s',sequence:1,status:{}}});await started;const pending=runtime.submit({kind:'castAttack'});worker.onerror({message:'host terminated'});await assert.rejects(pending,/host terminated/);assert.equal(owner.disposed,true);assert.equal(owner.webGpuWorld,null);assert.deepEqual(errors,['host terminated']);assert.deepEqual(state,{money:4});runtime.dispose();
});
