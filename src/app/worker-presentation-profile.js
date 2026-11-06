import {diagnosticPresentationCapabilities} from './webgpu-world-options.js';

// A target search has no presentation consumer while the world guide is off.
// The explicit diagnostic still observes the authoritative target in DEV.
export function workerTutorialTargetNeeded({experimental=false,dev=false,qa=false}={}){
 return experimental===true||dev===true&&qa===true;
}

// A build may explicitly opt into the incomplete Worker renderer for
// integration. The default remains the existing renderer until it is ready.
// URL diagnostics never enable this profile in production.
export function workerPresentationProfile({backend='legacy',params=new URLSearchParams(),dev=false}={}){
 if(!['legacy','webgpu-worker'].includes(backend)||!(params instanceof URLSearchParams)||typeof dev!=='boolean')throw TypeError('Invalid presentation backend profile');
 const worker=backend==='webgpu-worker',has=name=>dev&&params.has(name),earlyGpu=worker||has('qa-worker-early-gpu-view'),noWebgl=worker||has('qa-worker-no-webgl'),earlyNative=worker||has('qa-worker-early-native'),cameraTerrain=worker||has('qa-webgpu-camera-terrain'),earlyNew=worker||has('qa-worker-early-new'),picking=worker||has('qa-webgpu-picking'),presentationInputs=worker||has('qa-webgpu-causal-input');
 const capabilities=worker?{cameraTerrain:true,provisionalStructures:true,provisionalCrops:true,picking:true,causalInputs:true,bakedWalking:true,bakedHyenaWalking:true,bakedWorkerWalking:true,wallImpactFragments:true,coordinatedChunks:true}:diagnosticPresentationCapabilities(params,dev);
 return Object.freeze({worker,earlyGpu,noWebgl,earlyNative,cameraTerrain,earlyNew,picking,presentationInputs,guardianPlacement:worker||has('qa-guardian-origin'),earlyTutorial:worker||has('qa-worker-early-tutorial'),lightProbe:worker||has('qa-worker-early-probe')||has('qa-worker-early-gpu-view'),capabilities:Object.freeze(capabilities)});
}
