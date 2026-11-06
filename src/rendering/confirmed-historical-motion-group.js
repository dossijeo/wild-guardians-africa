import {validateConfirmedClockSegments} from '../simulation/confirmed-clock-segments.js';
// These synchronous operations must run in one turn, before the clock advances.
// A failed second roster must not leave the first roster installed.
export function createConfirmedHistoricalMotionGroup({animals,workers=null,getSupport,inputPolicy=null,maxRealDuration=.1}={}){
 if(!animals||typeof getSupport!=='function')throw TypeError('Invalid historical motion group');
 if(inputPolicy!==null&&inputPolicy!=='ordered-boundary'||!Number.isFinite(maxRealDuration)||maxRealDuration<=0)throw TypeError('Invalid historical input policy');
 const prepared=new WeakMap();
 function completeRoster(preview){if(typeof animals.historicalActorIds!=='function'||workers&&typeof workers.historicalActorIds!=='function'||!Array.isArray(preview?.trace?.actors))return false;const ids=[...animals.historicalActorIds(),...(workers?workers.historicalActorIds():[])],trace=preview.trace.actors.map(actor=>actor?.actorId);if(ids.some(id=>typeof id!=='string'||!id)||trace.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length||new Set(trace).size!==trace.length||ids.length!==trace.length)return false;const selected=new Set(ids);return trace.every(id=>selected.has(id));}
 const isCurrent=preview=>completeRoster(preview)&&animals.historicalMotionCurrent(preview)===true&&(!workers||workers.historicalMotionCurrent(preview)===true);
 return {
  // The stream has validated the authority evidence and exact state endpoints.
  // This closes the remaining presentation proof: common clock, resident
  // support, complete participants, admitted rigs and ordered pose handoff.
  // The duration cap bounds provisional-body handoff latency, not Worker CPU.
  certify(preview,current){
   if(inputPolicy!=='ordered-boundary'||current?.closed||preview?.sequence!==current?.sequence+1||preview.start!==current.lastElapsed||preview.end<=preview.start||preview.safeForAutonomousPlayback!==false||preview.reasons?.length!==1||preview.reasons[0]!=='visual-time-and-support-unverified'||!completeRoster(preview))return null;
   const trace=preview.trace,clock=preview.clockSegments,support=getSupport();
   if(!trace.spatialEvidence||!trace.separationEvidence||trace.physicsActivity?.samplesComplete!==true||trace.physicsActivity.observed!==false||trace.actorTickStates?.complete!==true||!clock?.complete||clock.start!==preview.start||clock.end!==preview.end||clock.startPauses?.length||clock.endPauses?.length||!Array.isArray(clock.segments)||!clock.segments.length||clock.segments.some(segment=>!Number.isFinite(segment.realDuration)||segment.realDuration<=0)||clock.segments.reduce((sum,segment)=>sum+segment.realDuration,0)>maxRealDuration+1e-9||!support||support.sequence!==preview.sequence||support.start!==preview.start||support.end!==preview.end||support.valid()!==true)return null;
   try{validateConfirmedClockSegments(clock,{start:preview.start,end:preview.end,startPauses:[],endPauses:[]});}catch{return null;}
   const result={...preview,reasons:[],safeForAutonomousPlayback:true,certificates:{sequence:preview.sequence,actorIds:trace.actors.map(actor=>actor.actorId),animationSynchronized:true,otherActorsSynchronized:true,effectsSynchronized:true,continuousCollision:true,inputSynchronized:true}};
   const a=animals.prepareHistoricalMotion?.(result,support),w=workers?.prepareHistoricalMotion?.(result,support);
   if(a?.ok!==true||workers&&w?.ok!==true)return null;
   prepared.set(result,{support,a,w});return result;
  },
  canStart(preview){const value=prepared.get(preview);return !!value&&completeRoster(preview)&&value.support===getSupport()&&value.support.valid()===true;},
  start(preview){if(!completeRoster(preview))return false;const cached=prepared.get(preview);prepared.delete(preview);const support=getSupport();if(cached&&cached.support!==support)return false;const animalPrepared=cached?.a??animals.prepareHistoricalMotion?.(preview,support),workerPrepared=cached?.w??workers?.prepareHistoricalMotion?.(preview,support);if(animalPrepared&&!animalPrepared.ok||workerPrepared&&!workerPrepared.ok)return false;if(animals.startHistoricalMotion(preview,support,animalPrepared?.token??null)!==true)return false;try{if(workers&&workers.startHistoricalMotion(preview,support,workerPrepared?.token??null)!==true){animals.cancelHistoricalMotion();return false;}return true;}catch(error){animals.cancelHistoricalMotion();workers?.cancelHistoricalMotion();throw error;}},
  isCurrent,
  finish(preview){if(!isCurrent(preview))throw Error('Historical actor group invalidated');animals.finishHistoricalMotion(preview);workers?.finishHistoricalMotion(preview);},
  abort(){animals.abortHistoricalMotion();workers?.abortHistoricalMotion();}
 };
}
