// These synchronous operations must run in one turn, before the clock advances.
// A failed second roster must not leave the first roster installed.
export function createConfirmedHistoricalMotionGroup({animals,workers=null,getSupport}={}){
 if(!animals||typeof getSupport!=='function')throw TypeError('Invalid historical motion group');
 const isCurrent=preview=>animals.historicalMotionCurrent(preview)===true&&(!workers||workers.historicalMotionCurrent(preview)===true);
 return {
  start(preview){const support=getSupport(),animalPrepared=animals.prepareHistoricalMotion?.(preview,support),workerPrepared=workers?.prepareHistoricalMotion?.(preview,support);if(animalPrepared&&!animalPrepared.ok||workerPrepared&&!workerPrepared.ok)return false;if(animals.startHistoricalMotion(preview,support,animalPrepared?.token??null)!==true)return false;try{if(workers&&workers.startHistoricalMotion(preview,support,workerPrepared?.token??null)!==true){animals.cancelHistoricalMotion();return false;}return true;}catch(error){animals.cancelHistoricalMotion();workers?.cancelHistoricalMotion();throw error;}},
  isCurrent,
  finish(preview){if(!isCurrent(preview))throw Error('Historical actor group invalidated');animals.finishHistoricalMotion(preview);workers?.finishHistoricalMotion(preview);},
  abort(){animals.abortHistoricalMotion();workers?.abortHistoricalMotion();}
 };
}
