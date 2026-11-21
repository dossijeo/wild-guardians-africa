import {validateMicroState} from './economy.js';

// The existing confirmed audio view already contains the candidate crops,
// walls, events and timing. Only these extra facts are needed by the worker
// microevent controller; reservations and rewards still go to the authority.
export function projectConfirmedMicroeventFacts(state){
 if(!state||!Array.isArray(state.commandIds)||typeof state.seed!=='string'&&typeof state.seed!=='number')throw TypeError('Invalid microevent state');
 return {version:1,seed:state.seed,commandCount:state.commandIds.length,microevents:state.microevents===undefined?null:structuredClone(state.microevents)};
}
export function applyConfirmedMicroeventView(target,audio,facts){
 if(!target||!audio||!facts||Object.keys(facts).sort().join(',')!=='commandCount,microevents,seed,version'||facts.version!==1||!Number.isSafeInteger(facts.commandCount)||facts.commandCount<0||typeof facts.seed!=='string'&&typeof facts.seed!=='number'||typeof facts.seed==='number'&&!Number.isFinite(facts.seed)||facts.microevents!==null&&(!facts.microevents||typeof facts.microevents!=='object'||Array.isArray(facts.microevents))||!Array.isArray(audio.events)||!Array.isArray(audio.plants)||!Array.isArray(audio.structures)||!Array.isArray(audio.pauses))throw TypeError('Invalid microevent projection');
 const candidate={...audio,seed:facts.seed,commandCount:facts.commandCount,...(facts.microevents===null?{}:{microevents:facts.microevents})};validateMicroState(candidate);
 for(const key of ['seed','commandCount','time','day','biome','pauses','raid','result','events','plants','structures'])target[key]=candidate[key];
 if(facts.microevents===null)delete target.microevents;else target.microevents=structuredClone(facts.microevents);
 return target;
}
export function microeventCommandCount(state){if(Number.isSafeInteger(state?.commandCount)&&state.commandCount>=0)return state.commandCount;if(Array.isArray(state?.commandIds))return state.commandIds.length;throw TypeError('Missing microevent command count');}
