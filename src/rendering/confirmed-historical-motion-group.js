// These synchronous operations must run in one turn, before the clock advances.
// A failed second roster must not leave the first roster installed.
export function createConfirmedHistoricalMotionGroup({animals,workers=null,getSupport}={}){
 if(!animals||typeof getSupport!=='function')throw TypeError('Invalid historical motion group');
 const isCurrent=preview=>animals.historicalMotionCurrent(preview)===true&&(!workers||workers.historicalMotionCurrent(preview)===true);
 return {
  start(preview){const support=getSupport();if(animals.startHistoricalMotion(preview,support)!==true)return false;try{if(workers&&workers.startHistoricalMotion(preview,support)!==true){animals.cancelHistoricalMotion();return false;}return true;}catch(error){animals.cancelHistoricalMotion();workers?.cancelHistoricalMotion();throw error;}},
  isCurrent,
  finish(preview){if(!isCurrent(preview))throw Error('Historical actor group invalidated');animals.finishHistoricalMotion(preview);workers?.finishHistoricalMotion(preview);},
  abort(){animals.abortHistoricalMotion();workers?.abortHistoricalMotion();}
 };
}
