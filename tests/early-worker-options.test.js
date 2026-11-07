import test from 'node:test';
import assert from 'node:assert/strict';
import {earlyWorkerOptions,workerDiagnosticParams,selectPreparedAuthorityOptions,farVisualForPreparedAuthority} from '../src/app/early-worker-options.js';

test('far visual capability is fixed at early authority startup',()=>{
 const initial={snapshot:'{}',navigationView:{}},enabled=earlyWorkerOptions({initial,farVisualQueries:true}),disabled=earlyWorkerOptions({initial});
 assert.equal(enabled.clientOptions.farVisualQueries,true);assert.equal(disabled.clientOptions.farVisualQueries,false);
 assert.equal(farVisualForPreparedAuthority({early:{farVisualQueries:true},requested:true}),true);
 assert.equal(farVisualForPreparedAuthority({early:{farVisualQueries:false},requested:false}),false);
 assert.throws(()=>farVisualForPreparedAuthority({early:{farVisualQueries:false},requested:true}),/configuration changed/);
 assert.throws(()=>farVisualForPreparedAuthority({early:{farVisualQueries:true},requested:false}),/configuration changed/);
 assert.throws(()=>earlyWorkerOptions({initial,farVisualQueries:'true'}),/Invalid/);
});

test('prepared authority attaches from its own snapshot without rebuilding state or navigation',()=>{
 const snapshot='{"slotId":"prepared","pauses":[]}',early={snapshot},options=selectPreparedAuthorityOptions(early,()=>{throw Error('unexpected state serialization');});assert.deepEqual(options,{snapshot});const fallback={snapshot:'legacy',chunkKeys:['0,0']};assert.equal(selectPreparedAuthorityOptions(null,()=>fallback),fallback);assert.throws(()=>selectPreparedAuthorityOptions({},()=>fallback),/prepared authority/);
});

test('worker bootstrap ignores diagnostic URL switches in production',()=>{
 const input=new URLSearchParams('qa-worker-main-clock&qa-worker-legacy-publications&qa-worker-batch=1&qa-worker-window=1&qa-worker-ordered-views&qa-worker-shared-clips&qa-webgpu-causal-input');
 const production=workerDiagnosticParams(input,false),development=workerDiagnosticParams(input,true);
 assert.equal([...production].length,0);assert.equal(development.get('qa-worker-batch'),'1');assert.equal(development.has('qa-worker-main-clock'),true);
 development.delete('qa-worker-batch');assert.equal(input.get('qa-worker-batch'),'1');assert.throws(()=>workerDiagnosticParams(input,'false'),/diagnostics/);
});

test('a product bootstrap can configure worker authority without QA flags',()=>{
 const initial={snapshot:'{}',navigationView:{}},recoveryOptions={visualRecovery:{enabled:true,backpressure:true}},options=earlyWorkerOptions({initial,metadataOnlySpatial:true,guardianPlacement:true,presentationInputs:true,recoveryOptions});
 assert.equal(options.clientOptions.guardianPlacement,true);assert.equal(options.clientOptions.qaGuardianOrigin,false);assert.equal(options.clientOptions.checkpointRaidWaitsOnly,true);assert.equal(options.clientOptions.compactPresentationPaths,true);assert.equal(options.clientOptions.incrementalPublications,true);
 assert.equal(options.runtimeOptions.presentationInputs,true);assert.equal(options.runtimeOptions.qaPresentationInputs,false);assert.equal(options.runtimeOptions.startupSuspended,true);assert.equal(options.runtimeOptions.mainThreadProjection,true);assert.equal(options.runtimeOptions.visualRecovery,recoveryOptions.visualRecovery);
 assert.deepEqual([options.runtimeOptions.maxBatchSteps,options.runtimeOptions.batchWindowSteps,options.runtimeOptions.coalescePublications,options.runtimeOptions.foldViews,options.runtimeOptions.backgroundViews],[16,2,true,true,true]);
});

test('diagnostic overrides preserve legacy publication and trace behaviour',()=>{
 const {clientOptions,runtimeOptions}=earlyWorkerOptions({initial:{},metadataOnlySpatial:true,diagnostics:{legacyPublications:true,viewAck:true,pathTrace:true,doubleDecode:true,guardianOrigin:true,plantDelay:true,structureDelay:true,sharedClips:true,sharedRigs:true,sharedGlb:true,activePoses:true,enabled:true,compactPaused:true,batchSteps:1,causalInput:true,coalesce:true,foldView:true,orderedViews:true}});
 assert.equal(clientOptions.checkpointRaidWaitsOnly,false);assert.equal(clientOptions.compactPresentationPaths,false);assert.equal(clientOptions.incrementalPublications,false);assert.equal(clientOptions.qaGuardianOrigin,true);assert.equal(clientOptions.guardianPlacement,false);assert.equal(clientOptions.qaPlantDelayMs,500);assert.equal(clientOptions.qaStructureDelayMs,500);assert.equal(clientOptions.compactPausedAcks,true);
 assert.deepEqual([runtimeOptions.maxBatchSteps,runtimeOptions.batchWindowSteps,runtimeOptions.mainThreadProjection,runtimeOptions.qaPresentationInputs,runtimeOptions.presentationInputs,runtimeOptions.coalescePublications,runtimeOptions.foldViews,runtimeOptions.backgroundViews],[1,1,false,true,false,true,true,false]);
});

test('invalid batches fail before starting an authority',()=>{
 assert.throws(()=>earlyWorkerOptions({initial:{},diagnostics:{batchSteps:0}}),/batch/);
 assert.throws(()=>earlyWorkerOptions({initial:{},diagnostics:{batchWindow:NaN}}),/batch/);
});

test('incremental HUD is enabled for the compatible product worker profile only',()=>{const initial={snapshot:'{}',navigationView:{}};assert.equal(earlyWorkerOptions({initial,metadataOnlySpatial:true}).runtimeOptions.hudEntityDeltas,true);for(const diagnostics of [{pathTrace:true},{doubleDecode:true},{legacyPublications:true},{legacyPublications:true,coalesce:true}])assert.equal(earlyWorkerOptions({initial,metadataOnlySpatial:true,diagnostics}).runtimeOptions.hudEntityDeltas,false);assert.equal(earlyWorkerOptions({initial}).runtimeOptions.hudEntityDeltas,false);});

test('product HUD-only profile requires compact projected publications and excludes diagnostics',()=>{const initial={snapshot:'{}',navigationView:{}};assert.equal(earlyWorkerOptions({initial,metadataOnlySpatial:true,hudOnly:true}).runtimeOptions.mainThreadHudOnly,true);for(const diagnostics of [{pathTrace:true},{doubleDecode:true},{legacyPublications:true}])assert.equal(earlyWorkerOptions({initial,metadataOnlySpatial:true,hudOnly:true,diagnostics}).runtimeOptions.mainThreadHudOnly,false);assert.equal(earlyWorkerOptions({initial,hudOnly:true}).runtimeOptions.mainThreadHudOnly,false);});

test('product Worker sends only active physics poses while diagnostics retain their profile',()=>{const initial={snapshot:'{}',navigationView:{}};assert.equal(earlyWorkerOptions({initial,metadataOnlySpatial:true,hudOnly:true}).clientOptions.compactPhysicsPoses,true);assert.equal(earlyWorkerOptions({initial,metadataOnlySpatial:true,hudOnly:false}).clientOptions.compactPhysicsPoses,false);for(const diagnostics of [{pathTrace:true},{doubleDecode:true},{legacyPublications:true}])assert.equal(earlyWorkerOptions({initial,metadataOnlySpatial:true,hudOnly:true,diagnostics}).clientOptions.compactPhysicsPoses,false);assert.equal(earlyWorkerOptions({initial,diagnostics:{activePoses:true}}).clientOptions.compactPhysicsPoses,true);});
