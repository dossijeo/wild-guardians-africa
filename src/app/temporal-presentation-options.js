import {historicalRecoveryHarnessEnabled} from '../simulation/historical-recovery-harness.js';
// Explicit DEV-only attachment. Recovery remains unavailable until its host,
// authority and presentation checkpoint path has been validated together.
export function temporalPresentationOptions({params,dev,hosted,early,recoveryEnabled,hasWebGpu,recovery=null,earlyPrepared=null}={}){
 if(!(params instanceof URLSearchParams)||[dev,hosted,early,recoveryEnabled,hasWebGpu].some(value=>typeof value!=='boolean'))throw TypeError('Invalid temporal presentation request');
 if(!dev||!params.has('qa-webgpu-temporal')){if(early&&earlyPrepared!==null)throw Error('Temporal presentation configuration changed after authority preparation');return null;}
 const recover=params.has('qa-webgpu-temporal-recovery');if(!hosted||!hasWebGpu||recover&&(early||!historicalRecoveryHarnessEnabled||!recoveryEnabled||!recovery?.work||recovery.concurrent||recovery.backpressure||recovery.compactTicks)||!recover&&recoveryEnabled)throw Error('Temporal presentation configuration is not available');
 const profile={recovery:recover,terrainHistory:{maxPending:8192,maxRetainedBytes:536870912,maxBatchBytes:268435456,maxBatchRevisions:4096},presentation:{maxPublications:32,maxBytes:67108864,maxHistory:4096,maxHistoryBytes:536870912,checkpoints:recover}};
 if(early&&JSON.stringify(earlyPrepared)!==JSON.stringify(profile))throw Error('Temporal presentation configuration is not available for the prepared authority');
 return profile;
}
