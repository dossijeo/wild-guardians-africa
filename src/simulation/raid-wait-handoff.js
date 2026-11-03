import {waitEpoch} from './raid-contention.js';

// Version tokens are local to a native world. Preserve whether each wait was
// current at transfer, never the incidental counter values from that world.
export function captureRaidWaitBindings(state,nav){
 return (state.raid?.animals??[]).filter(a=>a.raidWait).map(a=>({id:a.id,epoch:a.raidWait.epoch??null,current:a.raidWait.epoch===waitEpoch(state,nav,a)}));
}
export function restoreRaidWaitBindings(state,nav,bindings){
 if(!Array.isArray(bindings))throw TypeError('Invalid raid wait bindings');
 const animals=(state.raid?.animals??[]).filter(a=>a.raidWait),byId=new Map(animals.map(a=>[a.id,a]));
 if(byId.size!==animals.length||bindings.length!==animals.length)throw Error('Raid wait bindings do not match snapshot');
 const seen=new Set();for(const item of bindings){const animal=byId.get(item?.id);if(!animal||seen.has(item.id)||typeof item.current!=='boolean'||(animal.raidWait.epoch??null)!==item.epoch)throw Error('Raid wait binding is stale');seen.add(item.id);}
 for(const item of bindings){const animal=byId.get(item.id);animal.raidWait.epoch=item.current?waitEpoch(state,nav,animal):null;}
}
