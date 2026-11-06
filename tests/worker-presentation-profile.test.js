import test from 'node:test';
import assert from 'node:assert/strict';
import {workerPresentationProfile,workerTutorialTargetNeeded} from '../src/app/worker-presentation-profile.js';

test('tutorial target searches require a presentation consumer or an explicit development audit',()=>{
 assert.equal(workerTutorialTargetNeeded(),false);
 assert.equal(workerTutorialTargetNeeded({qa:true,dev:false}),false);
 assert.equal(workerTutorialTargetNeeded({qa:true,dev:true}),true);
 assert.equal(workerTutorialTargetNeeded({experimental:true}),true);
});

test('the ordinary product keeps its existing backend and ignores QA URL parameters',()=>{
 const params=new URLSearchParams('qa-worker-early-gpu-view&qa-worker-no-webgl&qa-worker-early-native&qa-webgpu-camera-terrain&qa-webgpu-picking&qa-webgpu-causal-input');
 const profile=workerPresentationProfile({params,dev:false});assert.equal(profile.worker,false);assert.equal(profile.earlyGpu,false);assert.equal(profile.noWebgl,false);assert.equal(profile.earlyNative,false);assert.equal(profile.presentationInputs,false);assert.deepEqual(Object.values(profile.capabilities),[false,false,false,false,false,false,false,false]);
});
test('the explicit Worker backend supplies the complete startup contract without QA flags',()=>{
 const profile=workerPresentationProfile({backend:'webgpu-worker',params:new URLSearchParams(),dev:false});
 for(const key of ['worker','earlyGpu','noWebgl','earlyNative','earlyNew','cameraTerrain','picking','presentationInputs','guardianPlacement','earlyTutorial','lightProbe'])assert.equal(profile[key],true,key);
 assert.deepEqual(profile.capabilities,{cameraTerrain:true,provisionalStructures:true,provisionalCrops:true,picking:true,causalInputs:true,bakedWalking:false,bakedWorkerWalking:true,coordinatedChunks:true});assert.ok(Object.isFrozen(profile));assert.ok(Object.isFrozen(profile.capabilities));
});
test('diagnostic startup combinations continue to require their individual flags',()=>{
 const profile=workerPresentationProfile({params:new URLSearchParams('qa-worker-early-gpu-view&qa-worker-early-native&qa-webgpu-picking'),dev:true});assert.equal(profile.worker,false);assert.equal(profile.earlyGpu,true);assert.equal(profile.noWebgl,false);assert.equal(profile.earlyNative,true);assert.equal(profile.cameraTerrain,false);assert.equal(profile.picking,true);assert.equal(profile.presentationInputs,false);assert.equal(profile.lightProbe,true);
 assert.throws(()=>workerPresentationProfile({backend:'webgpu'}),/backend/);
});
