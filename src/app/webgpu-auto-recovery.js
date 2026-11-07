// One initial attempt and at most one explicitly retryable reattachment. The replacement is never exposed until
// recovery has succeeded; ownership is checked again after every await.
export function createWebGpuAutoRecovery({isCurrent,markLost,recover,onError=()=>{},historicalRecovery=false}){
 if([isCurrent,markLost,recover,onError].some(fn=>typeof fn!=='function')||typeof historicalRecovery!=='boolean')throw TypeError('Invalid visual recovery coordinator');
 let pending=null,closed=false,detached=false,stage='idle';
 function begin(mark){pending=Promise.resolve().then(async()=>{try{if(closed||!isCurrent())return;if(mark)try{stage='mark-lost';await markLost();}catch(error){if(!detached)throw error;}if(!closed&&isCurrent()){try{stage='recover';await recover();}catch(error){if(!error?.retryable||closed||!isCurrent())throw error;stage='retry';await recover();}}}catch(failure){if(!closed&&isCurrent())onError(failure);}finally{pending=null;detached=false;stage='idle';}});return true;}
 return {trigger(error){if(closed||!isCurrent()||!(String(error?.message??error).includes('WebGPU device lost:')||historicalRecovery&&['historical-playback-invalidated','historical-terrain-detached'].includes(error?.code)))return false;return pending?true:begin(true);},triggerDetached(){if(closed||!isCurrent())return false;detached=true;return pending?true:begin(false);},status(){return {closed,recovering:!!pending,stage,current:!closed&&isCurrent()};},dispose(){closed=true;}};
}
