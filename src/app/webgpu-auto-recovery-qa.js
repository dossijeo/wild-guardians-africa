// One bounded attempt per device loss. The legacy renderer remains available;
// this coordinator never claims the replacement until recover() resolves.
export function createWebGpuAutoRecoveryQa({isCurrent,markLost,recover,onError=()=>{}}){
 if([isCurrent,markLost,recover,onError].some(fn=>typeof fn!=='function'))throw TypeError('Invalid visual recovery coordinator');
 let pending=null,closed=false;
 return {trigger(error){if(closed||pending||!isCurrent()||!String(error?.message??error).includes('WebGPU device lost:'))return false;pending=Promise.resolve().then(async()=>{try{if(closed||!isCurrent())return;await markLost();if(!closed&&isCurrent())await recover();}catch(failure){if(!closed&&isCurrent())onError(failure);}finally{pending=null;}});return true;},status(){return {closed,recovering:!!pending};},dispose(){closed=true;}};
}
