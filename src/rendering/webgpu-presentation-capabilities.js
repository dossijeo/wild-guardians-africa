// Explicit runtime capabilities are shared by the initial presentation and a
// replacement Worker. Diagnostic URL flags remain separate from this contract.
export function webGpuPresentationCapabilities(value={}){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['cameraTerrain','provisionalStructures','provisionalCrops'].includes(key)||typeof value[key]!=='boolean'))throw TypeError('Invalid WebGPU presentation capabilities');
 return {cameraTerrain:value.cameraTerrain===true,provisionalStructures:value.provisionalStructures===true,provisionalCrops:value.provisionalCrops===true};
}
