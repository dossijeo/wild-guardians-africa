import test from 'node:test';
import assert from 'node:assert/strict';
import {webGpuInfrastructureProfile} from '../src/app/webgpu-infrastructure-profile.js';
import {temporalPresentationOptions,productMudEnabled} from '../src/app/temporal-presentation-options.js';
import {webGpuWorldOptions} from '../src/app/webgpu-world-options.js';
test('product enables one temporal/recovery/event/far profile without QA flags',()=>{
 const profile=webGpuInfrastructureProfile({enabled:true}),recovery={enabled:true,work:true};
 assert.deepEqual(profile,{historicalRecovery:true,historicalEvents:true,farVisualQueries:true});
 for(const dev of [false,true]){
  const options={params:new URLSearchParams(),dev,hosted:true,early:false,recoveryEnabled:true,hasWebGpu:true,recovery,historicalRecovery:profile.historicalRecovery,historicalEvents:profile.historicalEvents,mudPresentation:productMudEnabled(undefined,true)},prepared=temporalPresentationOptions(options);
  assert.equal(prepared.presentation.product,true);assert.equal(prepared.presentation.historicalEvents,true);assert.equal(prepared.presentation.mudPresentation,true);
  assert.deepEqual(temporalPresentationOptions({...options,early:true,earlyPrepared:prepared}),prepared);
  const world=webGpuWorldOptions({params:options.params,state:{biome:'manglares'},field:{},recovery:{visualRecovery:recovery},capabilities:{causalInputs:true},temporal:prepared,farVisualQueries:profile.farVisualQueries,dev});
  assert.equal(world.presentationRecovery,true);assert.equal(world.presentationWorkRecovery,true);assert.equal(world.farVisualQueries,true);assert.equal(world.experimentalMotionFeed,true);assert.equal(world.experimentalAllActors,true);
 }
});
test('legacy and explicit reversions do not accidentally enable dependent protocols',()=>{
 assert.deepEqual(webGpuInfrastructureProfile({enabled:false}),{historicalRecovery:false,historicalEvents:false,farVisualQueries:false});
 assert.deepEqual(webGpuInfrastructureProfile({enabled:true,env:{VITE_HISTORICAL_PRESENTATION_RECOVERY:'false',VITE_WEBGPU_FAR_VISUAL:'false'}}),{historicalRecovery:false,historicalEvents:false,farVisualQueries:false});
 assert.equal(webGpuInfrastructureProfile({enabled:true,env:{VITE_HISTORICAL_EVENT_BOUNDARIES:'false'}}).historicalRecovery,true);
 assert.throws(()=>webGpuInfrastructureProfile({enabled:true,env:{VITE_HISTORICAL_PRESENTATION_RECOVERY:'false',VITE_HISTORICAL_EVENT_BOUNDARIES:'true'}}),/require/);
 assert.throws(()=>webGpuInfrastructureProfile({enabled:true,env:{VITE_WEBGPU_FAR_VISUAL:'tru'}}),/setting/);
});
