// A visual event must wait for its authoritative reservation before it starts,
// and checkpoint only after settlement. The Worker serializes all commands.
export function createWorkerMicroeventEconomy(runtime){
 if(typeof runtime?.submit!=='function')throw TypeError('Invalid microevent runtime');
 return {
  async reserve(eventType,targetId){const result=await runtime.submit({kind:'microReserve',eventType,targetId});return result.value;},
  async settle(ticket,outcome,{enabled=true,losses=true}={}){const result=await runtime.submit({kind:'microSettle',ticket,outcome,enabled,losses});return result.value;},
  async disable(){await runtime.submit({kind:'microDisable'});},
 };
}
