import {serialize} from '../persistence/snapshots.js';

// Visibility may change while the authority is prepared but its clock is
// stopped. No other local state divergence can be safely adopted.
export function earlyNativeStartupCommand(snapshot,current){
 if(typeof snapshot!=='string')throw TypeError('Invalid early snapshot');
 const baseline=JSON.parse(snapshot),next=JSON.parse(serialize(current));
 if(!Array.isArray(baseline.pauses)||!Array.isArray(next.pauses)||baseline.pauses.filter(x=>x==='hidden').length>1||next.pauses.filter(x=>x==='hidden').length>1)throw TypeError('Invalid visibility pauses');
 const wasHidden=baseline.pauses.includes('hidden'),hidden=next.pauses.includes('hidden');
 baseline.pauses=baseline.pauses.filter(x=>x!=='hidden');next.pauses=next.pauses.filter(x=>x!=='hidden');
 if(JSON.stringify(baseline)!==JSON.stringify(next))throw Error('Saved state changed during graphical loading');
 return hidden===wasHidden?null:{kind:hidden?'pause':'resume',reason:'hidden'};
}
