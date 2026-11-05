import test from 'node:test';
import assert from 'node:assert/strict';
import {webGpuWorldOptions} from '../src/app/webgpu-world-options.js';

test('initial and recovered worlds share the complete early presentation profile',()=>{
 const params=new URLSearchParams('qa-worker-early-gpu-view&qa-worker-early-biome&qa-webgpu-world-motion&qa-webgpu-camera-terrain&qa-webgpu-picking');
 const state={raid:{animals:[{id:'buffalo',species:'buffalo',status:'active'}]}},field={canyon:true},recovery={qaVisualRecovery:true,qaVisualWorkRecovery:true};
 const first=webGpuWorldOptions({params,state,field,recovery,dev:true}),replacement=webGpuWorldOptions({params,state,field,recovery,dev:true});
 assert.deepEqual(replacement,first);assert.equal(replacement.experimentalMinimalWorld,true);assert.equal(replacement.experimentalEarlyBiome,true);
 assert.equal(replacement.experimentalMotionFeed,true);assert.equal(replacement.experimentalCameraTerrain,true);assert.equal(replacement.experimentalPicking,true);
 assert.equal(replacement.experimentalActorId,'buffalo');assert.match(replacement.experimentalActorPackageUrl,/buffalo/);
 assert.equal(replacement.presentationWorkRecovery,true);assert.equal(replacement.cameraTerrainCanyon,true);
});

test('profile selection ignores removed animals and does not enable development-only flags in production',()=>{
 const params=new URLSearchParams('qa-worker-early-gpu-view&qa-worker-early-biome&qa-webgpu-causal-input&qa-webgpu-actor=hyena');
 const state={raid:{animals:[{id:'old',species:'hyena',status:'gone'},{id:'new',species:'hyena',status:'active'}]}};
 const value=webGpuWorldOptions({params,state,field:{canyon:false},dev:false});
 assert.equal(value.experimentalActorId,'new');assert.equal(value.experimentalMinimalWorld,false);assert.equal(value.experimentalEarlyBiome,false);
 assert.equal(value.experimentalPresentationInputs,false);assert.equal(value.presentationRecovery,false);assert.equal(value.presentationWorkRecovery,false);
});
