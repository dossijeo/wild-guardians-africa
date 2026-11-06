// Explicit DEV-only attachment. Recovery remains unavailable until its host,
// authority and presentation checkpoint path has been validated together.
export function temporalPresentationOptions({params,dev,hosted,early,recoveryEnabled,hasWebGpu}={}){
 if(!(params instanceof URLSearchParams)||[dev,hosted,early,recoveryEnabled,hasWebGpu].some(value=>typeof value!=='boolean'))throw TypeError('Invalid temporal presentation request');
 if(!dev||!params.has('qa-webgpu-temporal'))return null;
 if(!hosted||early||recoveryEnabled||!hasWebGpu||params.has('qa-webgpu-temporal-recovery'))throw Error('Temporal presentation configuration is not available');
 return {terrainHistory:{maxPending:8192,maxRetainedBytes:536870912,maxBatchBytes:268435456,maxBatchRevisions:4096},presentation:{maxPublications:32,maxBytes:67108864,maxHistory:4096,maxHistoryBytes:536870912,checkpoints:false}};
}
