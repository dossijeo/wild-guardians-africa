// One bounded attempt per device loss. The legacy renderer remains available;
// this coordinator never claims the replacement until recover() resolves.
export function createWebGpuAutoRecoveryQa({isCurrent,markLost,recover,onError=()=>{}}){
 if([isCurrent,markLost,recover,onError].some(fn=>typeof fn!=='function'))throw TypeError('Invalid visual recovery coordinator');
 let pending=null,closed=false,detached=false;
 function begin(mark){pending=Promise.resolve().then(async()=>{try{if(closed||!isCurrent())return;if(mark)try{await markLost();}catch(error){if(!detached)throw error;}if(!closed&&isCurrent())await recover();}catch(failure){if(!closed&&isCurrent())onError(failure);}finally{pending=null;detached=false;}});return true;}
 return {trigger(error){if(closed||pending||!isCurrent()||!String(error?.message??error).includes('WebGPU device lost:'))return false;return begin(true);},triggerDetached(){if(closed||!isCurrent())return false;detached=true;return pending?true:begin(false);},status(){return {closed,recovering:!!pending};},dispose(){closed=true;}};
}
