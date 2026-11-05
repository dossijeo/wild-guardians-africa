import test from 'node:test';
import assert from 'node:assert/strict';
import {earlyWorkerOptions,workerDiagnosticParams} from '../src/app/early-worker-options.js';

test('worker bootstrap ignores diagnostic URL switches in production',()=>{
 const input=new URLSearchParams('qa-worker-main-clock&qa-worker-legacy-publications&qa-worker-batch=1&qa-worker-window=1&qa-worker-ordered-views&qa-worker-shared-clips&qa-webgpu-causal-input');
 const production=workerDiagnosticParams(input,false),development=workerDiagnosticParams(input,true);
 assert.equal([...production].length,0);assert.equal(development.get('qa-worker-batch'),'1');assert.equal(development.has('qa-worker-main-clock'),true);
 development.delete('qa-worker-batch');assert.equal(input.get('qa-worker-batch'),'1');assert.throws(()=>workerDiagnosticParams(input,'false'),/diagnostics/);
});

test('a product bootstrap can configure worker authority without QA flags',()=>{
 const initial={snapshot:'{}',navigationView:{}},recoveryOptions={visualRecovery:{enabled:true,backpressure:true}},options=earlyWorkerOptions({initial,metadataOnlySpatial:true,guardianPlacement:true,presentationInputs:true,recoveryOptions});
 assert.equal(options.clientOptions.guardianPlacement,true);assert.equal(options.clientOptions.qaGuardianOrigin,false);assert.equal(options.clientOptions.checkpointRaidWaitsOnly,true);
 assert.equal(options.runtimeOptions.presentationInputs,true);assert.equal(options.runtimeOptions.qaPresentationInputs,false);assert.equal(options.runtimeOptions.startupSuspended,true);assert.equal(options.runtimeOptions.mainThreadProjection,true);assert.equal(options.runtimeOptions.visualRecovery,recoveryOptions.visualRecovery);
 assert.deepEqual([options.runtimeOptions.maxBatchSteps,options.runtimeOptions.batchWindowSteps,options.runtimeOptions.coalescePublications,options.runtimeOptions.foldViews,options.runtimeOptions.backgroundViews],[16,2,true,true,true]);
});

test('diagnostic overrides preserve legacy publication and trace behaviour',()=>{
 const {clientOptions,runtimeOptions}=earlyWorkerOptions({initial:{},metadataOnlySpatial:true,diagnostics:{legacyPublications:true,viewAck:true,pathTrace:true,doubleDecode:true,guardianOrigin:true,plantDelay:true,structureDelay:true,sharedClips:true,sharedRigs:true,sharedGlb:true,activePoses:true,enabled:true,compactPaused:true,batchSteps:1,causalInput:true,coalesce:true,foldView:true,orderedViews:true}});
 assert.equal(clientOptions.checkpointRaidWaitsOnly,false);assert.equal(clientOptions.qaGuardianOrigin,true);assert.equal(clientOptions.guardianPlacement,false);assert.equal(clientOptions.qaPlantDelayMs,500);assert.equal(clientOptions.qaStructureDelayMs,500);assert.equal(clientOptions.compactPausedAcks,true);
 assert.deepEqual([runtimeOptions.maxBatchSteps,runtimeOptions.batchWindowSteps,runtimeOptions.mainThreadProjection,runtimeOptions.qaPresentationInputs,runtimeOptions.presentationInputs,runtimeOptions.coalescePublications,runtimeOptions.foldViews,runtimeOptions.backgroundViews],[1,1,false,true,false,true,true,false]);
});

test('invalid batches fail before starting an authority',()=>{
 assert.throws(()=>earlyWorkerOptions({initial:{},diagnostics:{batchSteps:0}}),/batch/);
 assert.throws(()=>earlyWorkerOptions({initial:{},diagnostics:{batchWindow:NaN}}),/batch/);
});
