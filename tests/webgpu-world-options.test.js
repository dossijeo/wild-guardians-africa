import test from 'node:test';
import assert from 'node:assert/strict';
import {webGpuWorldOptions} from '../src/app/webgpu-world-options.js';

test('initial and recovered worlds share the complete early presentation profile',()=>{
 const params=new URLSearchParams('qa-worker-early-gpu-view&qa-worker-early-biome&qa-webgpu-world-motion&qa-webgpu-camera-terrain&qa-webgpu-picking');
 const state={raid:{animals:[{id:'buffalo',species:'buffalo',status:'active'}]}},field={canyon:true},recovery={qaVisualRecovery:true,qaVisualWorkRecovery:true};
 const first=webGpuWorldOptions({params,state,field,recovery,dev:true}),replacement=webGpuWorldOptions({params,state,field,recovery,dev:true});
 assert.deepEqual(replacement,first);assert.equal(replacement.experimentalMinimalWorld,true);assert.equal(replacement.experimentalEarlyBiome,true);
 assert.equal(replacement.experimentalMotionFeed,true);assert.equal(replacement.experimentalCameraTerrain,true);assert.equal(replacement.experimentalPicking,true);
 assert.deepEqual(replacement.presentationCapabilities,{cameraTerrain:true,provisionalStructures:true,provisionalCrops:true});assert.ok(Object.isFrozen(replacement));assert.ok(Object.isFrozen(replacement.presentationCapabilities));
 assert.equal(replacement.experimentalActorId,'buffalo');assert.match(replacement.experimentalActorPackageUrl,/buffalo/);
 assert.equal(replacement.presentationWorkRecovery,true);assert.equal(replacement.cameraTerrainCanyon,true);
});

test('profile selection ignores removed animals and does not enable development-only flags in production',()=>{
 const params=new URLSearchParams('qa-worker-early-gpu-view&qa-worker-early-biome&qa-webgpu-causal-input&qa-webgpu-actor=hyena');
 const state={raid:{animals:[{id:'old',species:'hyena',status:'gone'},{id:'new',species:'hyena',status:'active'}]}};
 const value=webGpuWorldOptions({params,state,field:{canyon:false},dev:false});
 assert.equal(value.experimentalActorId,'new');assert.equal(value.experimentalMinimalWorld,false);assert.equal(value.experimentalEarlyBiome,false);
 assert.equal(value.experimentalPresentationInputs,false);assert.equal(value.presentationInputs,false);assert.equal(value.presentationRecovery,false);assert.equal(value.presentationWorkRecovery,false);
 assert.deepEqual(value.presentationCapabilities,{cameraTerrain:false,provisionalStructures:false,provisionalCrops:false});
});

test('the causal QA profile exercises the general presentation input channel',()=>{
 const params=new URLSearchParams('qa-webgpu-causal-input'),state={raid:null};const value=webGpuWorldOptions({params,state,field:{},dev:true});
 assert.equal(value.experimentalPresentationInputs,true);assert.equal(value.presentationInputs,true);
});

test('explicit recovery config is shared by the renderer outside QA',()=>{
 const params=new URLSearchParams(),state={raid:null},recovery={visualRecovery:{enabled:true,concurrent:true,work:true,backpressure:true}};
 const first=webGpuWorldOptions({params,state,field:{},recovery,dev:false}),replacement=webGpuWorldOptions({params,state,field:{},recovery,dev:false});
 assert.equal(first.presentationRecovery,true);assert.equal(first.presentationWorkRecovery,true);assert.deepEqual(replacement,first);
});

test('explicit presentation capabilities are independent of diagnostic flags and stable across recovery',()=>{
 const params=new URLSearchParams(),state={raid:null},field={},capabilities={cameraTerrain:true,provisionalStructures:true,provisionalCrops:true};
 const first=webGpuWorldOptions({params,state,field,capabilities}),replacement=webGpuWorldOptions({params,state,field,capabilities});
 assert.deepEqual(first.presentationCapabilities,capabilities);assert.deepEqual(replacement,first);assert.equal(first.experimentalCameraTerrain,false);
 assert.throws(()=>webGpuWorldOptions({params,state,field,capabilities:{cameraTerrain:'true'}}),/capabilities/);
 assert.throws(()=>webGpuWorldOptions({params,state,field,capabilities:{unknown:true}}),/capabilities/);
});
