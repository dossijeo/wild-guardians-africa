// Ordered, settled ledger facts emitted by the authority; they are presentation
// information and cannot be used to apply economic state on the client.
export function validateConfirmedSettlements(value,{start,end}={}){
 if(value===undefined)return [];
 if(!Array.isArray(value)||!Number.isFinite(start)||!Number.isFinite(end)||end<start)throw TypeError('Invalid confirmed settlements');
 const ids=new Set();let previousTime=start,previousSequence=-1;
 for(const fact of value){if(!fact||typeof fact.id!=='string'||!fact.id||ids.has(fact.id)||typeof fact.n!=='string'||!/^(-?[1-9]\d*|0)$/.test(fact.n)||fact.d!=='1'||!Number.isFinite(fact.simulationTime)||fact.simulationTime<previousTime||fact.simulationTime>end||!Number.isSafeInteger(fact.eventSequence)||fact.eventSequence<previousSequence)throw TypeError('Invalid confirmed settlement');ids.add(fact.id);previousTime=fact.simulationTime;previousSequence=fact.eventSequence;}
 return value;
}
