import {historicalRecoveryHarnessEnabled} from '../simulation/historical-recovery-harness.js';
// The temporal product profile has the terrain history needed for mud. Keep an
// explicit build-time opt-out and preserve opt-in for diagnostic profiles.
export function productMudEnabled(setting,historicalRecovery){
 if(setting!==undefined&&typeof setting!=='string'||typeof historicalRecovery!=='boolean')throw TypeError('Invalid mud presentation setting');
 return setting==='true'||historicalRecovery&&setting!=='false';
}
// The same selection must be made before authority bootstrap and on attach.
export function productMudPresentation({backend,biome,enabled}={}){
 if(!['legacy','webgpu-worker'].includes(backend)||typeof biome!=='string'||typeof enabled!=='boolean')throw TypeError('Invalid mud presentation profile');
 return enabled&&backend==='webgpu-worker'&&biome==='manglares';
}
// The ordinary build keeps temporal presentation disabled. A product caller may
// explicitly request historical recovery; URL diagnostics remain DEV-only.
export function temporalPresentationOptions({params,dev,hosted,early,recoveryEnabled,hasWebGpu,recovery=null,earlyPrepared=null,historicalRecovery=false,mudPresentation=false,historicalEvents=false}={}){
 if(!(params instanceof URLSearchParams)||[dev,hosted,early,recoveryEnabled,hasWebGpu,historicalRecovery,mudPresentation,historicalEvents].some(value=>typeof value!=='boolean'))throw TypeError('Invalid temporal presentation request');
 if(historicalEvents&&!historicalRecovery)throw Error('Historical events require temporal recovery');
 const mudRequested=mudPresentation||dev&&params.has('qa-webgpu-mud');
 if(!historicalRecovery&&(!dev||!params.has('qa-webgpu-temporal'))){if(mudRequested)throw Error('Mud presentation requires temporal presentation');if(early&&earlyPrepared!==null)throw Error('Temporal presentation configuration changed after authority preparation');return null;}
 const recover=historicalRecovery||params.has('qa-webgpu-temporal-recovery');if(!hosted||!hasWebGpu||recover&&(!historicalRecovery&&!historicalRecoveryHarnessEnabled||!recoveryEnabled||!recovery?.work||recovery.concurrent||recovery.backpressure||recovery.compactTicks)||!recover&&recoveryEnabled)throw Error('Temporal presentation configuration is not available');
 const profile={recovery:recover,terrainHistory:{maxPending:8192,maxRetainedBytes:536870912,maxBatchBytes:268435456,maxBatchRevisions:4096},presentation:{maxPublications:32,maxBytes:67108864,maxHistory:4096,maxHistoryBytes:536870912,checkpoints:recover,...(historicalRecovery?{product:true}:{}),...(historicalEvents?{historicalEvents:true}:{}),...(mudRequested?{mudPresentation:true}:{})}};
 if(early&&JSON.stringify(earlyPrepared)!==JSON.stringify(profile))throw Error('Temporal presentation configuration is not available for the prepared authority');
 return profile;
}
