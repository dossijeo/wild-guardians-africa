import {resolvePresentationRecoveryOptions} from '../simulation/presentation-recovery-options.js';
import {webGpuPresentationCapabilities} from '../rendering/webgpu-presentation-capabilities.js';
export function diagnosticPresentationCapabilities(params,dev){
 if(!(params instanceof URLSearchParams)||typeof dev!=='boolean')throw TypeError('Invalid diagnostic presentation profile');
 const early=dev&&params.has('qa-worker-early-gpu-view');
 return {cameraTerrain:dev&&params.has('qa-webgpu-camera-terrain'),provisionalStructures:early,provisionalCrops:early,picking:dev&&params.has('qa-webgpu-picking'),causalInputs:dev&&params.has('qa-webgpu-causal-input'),bakedWalking:false};
}
// One structural profile for both the initial renderer and its replacement.
// A recovery must not silently switch world features or actor presentation.
export function webGpuWorldOptions({params,state,field,recovery={},capabilities={},dev=false}={}){
 if(!(params instanceof URLSearchParams)||!state||!field||typeof dev!=='boolean')throw TypeError('Invalid WebGPU world profile');
 const requested=webGpuPresentationCapabilities(capabilities),diagnostic=diagnosticPresentationCapabilities(params,dev),presentationCapabilities=Object.freeze(Object.fromEntries(Object.keys(requested).map(key=>[key,requested[key]||diagnostic[key]])));
 const species=params.get('qa-webgpu-actor'),actor=state.raid?.animals.find(item=>item.status!=='gone'&&(!species||item.species===species)),recoveryProfile=resolvePresentationRecoveryOptions(recovery,{allowQa:dev});
 return Object.freeze({
  experimentalActorId:actor?.id??null,
  experimentalActorPackageUrl:params.get('qa-webgpu-character-package')??(actor?.species==='buffalo'?'/content/character-preview/buffalo/package.json':null),
  experimentalMinimalWorld:dev&&params.has('qa-worker-early-gpu-view'),
  experimentalEarlyBiome:dev&&params.has('qa-worker-early-biome'),
  experimentalAllActors:!params.has('qa-webgpu-single-actor'),
  experimentalMotionFeed:params.has('qa-webgpu-motion')||params.has('qa-webgpu-world-motion'),
  experimentalPresentationInputs:dev&&params.has('qa-webgpu-causal-input'),
  presentationInputs:presentationCapabilities.causalInputs,
  experimentalBakedHyena:params.has('qa-webgpu-baked-hyena'),
  experimentalConfirmedClock:params.has('qa-webgpu-baked-hyena')&&!params.has('qa-webgpu-baked-clock-legacy'),
  experimentalMangroveGround:params.has('qa-webgpu-mangrove-ground'),
  experimentalPicking:params.has('qa-webgpu-picking'),
  experimentalWallFragments:params.has('qa-webgpu-wall-fragments'),
  experimentalBiomeAttributes:!params.has('qa-webgpu-biome-native'),
  experimentalBiomeShadowCutout:dev&&params.has('qa-webgpu-biome-shadow-cutout'),
  presentationRecovery:recoveryProfile.enabled,
  presentationWorkRecovery:recoveryProfile.enabled&&recoveryProfile.work,
  presentationCapabilities,
  experimentalCameraTerrain:dev&&params.has('qa-webgpu-camera-terrain'),
  cameraTerrainCanyon:!!field.canyon,
 });
}
