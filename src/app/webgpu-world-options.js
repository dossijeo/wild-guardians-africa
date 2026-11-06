import {resolvePresentationRecoveryOptions} from '../simulation/presentation-recovery-options.js';
import {webGpuPresentationCapabilities} from '../rendering/webgpu-presentation-capabilities.js';
export function confirmedCameraTerrainEnabled({requested=false,search='',dev=false}={}){
 if(typeof requested!=='boolean'||typeof search!=='string'||typeof dev!=='boolean')throw TypeError('Invalid camera terrain profile');
 return requested||dev&&new URLSearchParams(search).has('qa-webgpu-camera-terrain');
}
// Guardian placement is authoritative only when the entire input path exists.
// An already-prepared authority cannot be granted capabilities after startup.
export function guardianPlacementForWorld({early=null,hosted,presentationConfigured,options}){
 if(typeof hosted!=='boolean'||typeof presentationConfigured!=='boolean'||!options?.presentationCapabilities)throw TypeError('Invalid guardian placement configuration');
 if(!hosted||!presentationConfigured||!options.presentationInputs||!options.presentationCapabilities.picking)return false;
 return early?early.guardianPlacement===true&&early.presentationInputs===true:true;
}
export function diagnosticPresentationCapabilities(params,dev){
 if(!(params instanceof URLSearchParams)||typeof dev!=='boolean')throw TypeError('Invalid diagnostic presentation profile');
 const early=dev&&params.has('qa-worker-early-gpu-view');
 return {cameraTerrain:dev&&params.has('qa-webgpu-camera-terrain'),provisionalStructures:early,provisionalCrops:early,picking:dev&&params.has('qa-webgpu-picking'),causalInputs:dev&&params.has('qa-webgpu-causal-input'),bakedWalking:dev&&params.has('qa-webgpu-baked-walking'),bakedHyenaWalking:false,bakedWorkerWalking:false,wallImpactFragments:false,coordinatedChunks:false};
}
// One structural profile for both the initial renderer and its replacement.
// A recovery must not silently switch world features or actor presentation.
export function webGpuWorldOptions({params,state,field,recovery={},capabilities={},temporal=null,dev=false}={}){
 if(!(params instanceof URLSearchParams)||!state||!field||typeof dev!=='boolean'||temporal!==null&&(!dev||!temporal||typeof temporal.presentation!=='object'||!temporal.presentation))throw TypeError('Invalid WebGPU world profile');
 const requested=webGpuPresentationCapabilities(capabilities),diagnostic=diagnosticPresentationCapabilities(params,dev),presentationCapabilities=Object.freeze(Object.fromEntries(Object.keys(requested).map(key=>[key,requested[key]||diagnostic[key]||key==='coordinatedChunks'&&temporal!==null])));
 const has=key=>dev&&params.has(key),species=dev?params.get('qa-webgpu-actor'):null,actor=state.raid?.animals.find(item=>item.status!=='gone'&&(!species||item.species===species)),recoveryProfile=resolvePresentationRecoveryOptions(recovery,{allowQa:dev});
 return Object.freeze({
  experimentalActorId:actor?.id??null,
  experimentalActorPackageUrl:(dev?params.get('qa-webgpu-character-package'):null)??(actor?.species==='buffalo'?'/content/character-preview/buffalo/package.json':null),
  experimentalMinimalWorld:dev&&params.has('qa-worker-early-gpu-view'),
  experimentalEarlyBiome:dev&&params.has('qa-worker-early-biome'),
  experimentalAllActors:!has('qa-webgpu-single-actor'),
  experimentalMotionFeed:has('qa-webgpu-motion')||has('qa-webgpu-world-motion'),
  experimentalPresentationInputs:dev&&params.has('qa-webgpu-causal-input'),
  presentationInputs:presentationCapabilities.causalInputs,
  experimentalBakedHyena:has('qa-webgpu-baked-hyena'),
  experimentalConfirmedClock:has('qa-webgpu-baked-hyena')&&!has('qa-webgpu-baked-clock-legacy'),
  experimentalWaterHiSsr:has('qa-webgpu-water-hissr'),
  experimentalMangroveGround:has('qa-webgpu-mangrove-ground'),
  experimentalPicking:has('qa-webgpu-picking'),
  experimentalWallFragments:has('qa-webgpu-wall-fragments'),
  experimentalBiomeAttributes:!has('qa-webgpu-biome-native'),
  experimentalBiomeShadowCutout:dev&&params.has('qa-webgpu-biome-shadow-cutout'),
  presentationRecovery:recoveryProfile.enabled,
  presentationWorkRecovery:recoveryProfile.enabled&&recoveryProfile.work,
  ...(temporal?{experimentalTemporalPresentation:temporal.presentation}:{}),
  presentationCapabilities,
  experimentalCameraTerrain:dev&&params.has('qa-webgpu-camera-terrain'),
  cameraTerrainCanyon:!!field.canyon,
 });
}
