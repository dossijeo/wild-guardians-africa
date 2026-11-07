import {historicalRecoveryHarnessEnabled} from '../simulation/historical-recovery-harness.js';
// The ordinary build keeps temporal presentation disabled. A product caller may
// explicitly request historical recovery; URL diagnostics remain DEV-only.
export function temporalPresentationOptions({params,dev,hosted,early,recoveryEnabled,hasWebGpu,recovery=null,earlyPrepared=null,historicalRecovery=false,mudPresentation=false}={}){
 if(!(params instanceof URLSearchParams)||[dev,hosted,early,recoveryEnabled,hasWebGpu,historicalRecovery,mudPresentation].some(value=>typeof value!=='boolean'))throw TypeError('Invalid temporal presentation request');
 const mudRequested=mudPresentation||dev&&params.has('qa-webgpu-mud');
 if(!historicalRecovery&&(!dev||!params.has('qa-webgpu-temporal'))){if(mudRequested)throw Error('Mud presentation requires temporal presentation');if(early&&earlyPrepared!==null)throw Error('Temporal presentation configuration changed after authority preparation');return null;}
 const recover=historicalRecovery||params.has('qa-webgpu-temporal-recovery');if(!hosted||!hasWebGpu||recover&&(!historicalRecovery&&!historicalRecoveryHarnessEnabled||!recoveryEnabled||!recovery?.work||recovery.concurrent||recovery.backpressure||recovery.compactTicks)||!recover&&recoveryEnabled)throw Error('Temporal presentation configuration is not available');
 const profile={recovery:recover,terrainHistory:{maxPending:8192,maxRetainedBytes:536870912,maxBatchBytes:268435456,maxBatchRevisions:4096},presentation:{maxPublications:32,maxBytes:67108864,maxHistory:4096,maxHistoryBytes:536870912,checkpoints:recover,...(historicalRecovery?{product:true}:{}),...(mudRequested?{mudPresentation:true}:{})}};
 if(early&&JSON.stringify(earlyPrepared)!==JSON.stringify(profile))throw Error('Temporal presentation configuration is not available for the prepared authority');
 return profile;
}
