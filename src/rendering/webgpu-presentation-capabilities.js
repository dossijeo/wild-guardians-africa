// Explicit runtime capabilities are shared by the initial presentation and a
// replacement Worker. Diagnostic URL flags remain separate from this contract.
export function webGpuPresentationCapabilities(value={}){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['cameraTerrain','provisionalStructures','provisionalCrops','picking','causalInputs','bakedWalking','coordinatedChunks'].includes(key)||typeof value[key]!=='boolean'))throw TypeError('Invalid WebGPU presentation capabilities');
 return {cameraTerrain:value.cameraTerrain===true,provisionalStructures:value.provisionalStructures===true,provisionalCrops:value.provisionalCrops===true,picking:value.picking===true,causalInputs:value.causalInputs===true,bakedWalking:value.bakedWalking===true,coordinatedChunks:value.coordinatedChunks===true};
}

// The shared baked-walking capability covers both animal and worker banks.
// The worker bank itself selects supported profiles and falls back to live rigs.
export function webGpuWorkerBakedWalking(value,{experimental=false}={}){
 if(typeof experimental!=='boolean')throw TypeError('Invalid worker walking option');
 return webGpuPresentationCapabilities(value).bakedWalking||experimental;
}
