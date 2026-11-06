// These synchronous operations must run in one turn, before the clock advances.
// A failed second roster must not leave the first roster installed.
export function createConfirmedHistoricalMotionGroup({animals,workers=null,getSupport}={}){
 if(!animals||typeof getSupport!=='function')throw TypeError('Invalid historical motion group');
 function completeRoster(preview){if(typeof animals.historicalActorIds!=='function'||workers&&typeof workers.historicalActorIds!=='function'||!Array.isArray(preview?.trace?.actors))return false;const ids=[...animals.historicalActorIds(),...(workers?workers.historicalActorIds():[])],trace=preview.trace.actors.map(actor=>actor?.actorId);if(ids.some(id=>typeof id!=='string'||!id)||trace.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length||new Set(trace).size!==trace.length||ids.length!==trace.length)return false;const selected=new Set(ids);return trace.every(id=>selected.has(id));}
 const isCurrent=preview=>completeRoster(preview)&&animals.historicalMotionCurrent(preview)===true&&(!workers||workers.historicalMotionCurrent(preview)===true);
 return {
  start(preview){if(!completeRoster(preview))return false;const support=getSupport(),animalPrepared=animals.prepareHistoricalMotion?.(preview,support),workerPrepared=workers?.prepareHistoricalMotion?.(preview,support);if(animalPrepared&&!animalPrepared.ok||workerPrepared&&!workerPrepared.ok)return false;if(animals.startHistoricalMotion(preview,support,animalPrepared?.token??null)!==true)return false;try{if(workers&&workers.startHistoricalMotion(preview,support,workerPrepared?.token??null)!==true){animals.cancelHistoricalMotion();return false;}return true;}catch(error){animals.cancelHistoricalMotion();workers?.cancelHistoricalMotion();throw error;}},
  isCurrent,
  finish(preview){if(!isCurrent(preview))throw Error('Historical actor group invalidated');animals.finishHistoricalMotion(preview);workers?.finishHistoricalMotion(preview);},
  abort(){animals.abortHistoricalMotion();workers?.abortHistoricalMotion();}
 };
}
