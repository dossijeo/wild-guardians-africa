// A visual event must wait for its authoritative reservation before it starts,
// and checkpoint only after settlement. The Worker serializes all commands.
export function createWorkerMicroeventEconomy(runtime,{pendingTicket=null}={}){
 if(typeof runtime?.submit!=='function')throw TypeError('Invalid microevent runtime');
 // A visual event cannot survive a reload. Cancel its persisted reservation in
 // the authority before admitting a new one; never settle it as a success.
 const ready=pendingTicket?runtime.submit({kind:'microSettle',ticket:structuredClone(pendingTicket),outcome:'cancelled',enabled:false,losses:false}):Promise.resolve();
 return {
  ready,
  async reserve(eventType,targetId){await ready;const result=await runtime.submit({kind:'microReserve',eventType,targetId});return result.value;},
  async schedule(memory){await ready;const {rng,cooldown,eventCooldowns,ignored,history,negativeTimes}=memory;await runtime.submit({kind:'microSchedule',schedule:structuredClone({rng,cooldown,eventCooldowns,ignored,history,negativeTimes})});},
  async settle(ticket,outcome,{enabled=true,losses=true}={}){await ready;const result=await runtime.submit({kind:'microSettle',ticket,outcome,enabled,losses});return result.value;},
  async disable(){await ready;await runtime.submit({kind:'microDisable'});},
 };
}
