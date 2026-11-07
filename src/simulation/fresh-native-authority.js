import {serialize} from '../persistence/snapshots.js';
import {activeChunkRegion} from '../world/active-region.js';
import {raidResidentDemand,includeRaidBounds} from '../world/raid-entry-residency.js';
import {workerChunkDemand} from '../world/worker-chunk-residency.js';
import {captureRaidWaitBindings} from './raid-wait-handoff.js';

// A new world has no derived residency to restore. Describe the normal camera
// demand and let the authority reconstruct those chunks on its own thread.
// Existing saves must continue through the verified checkpoint handoff.
export function freshNativeAuthorityOptions(state,navigation,session,{eye,target,quality='media'}={}){
 if(!state||state.elapsed!==0||state.raid||state.workerNativeAuthorityCheckpoint||!navigation||!session?.core?.captureResidentChunks||![eye?.x,eye?.z,target?.x,target?.z].every(Number.isFinite))throw TypeError('Invalid fresh native authority');
 const region=activeChunkRegion(eye,quality),raid=raidResidentDemand(state,navigation),keys=new Set(session.core.captureResidentChunks().keys);
 for(let z=region.cz-region.range;z<=region.cz+region.range;z++)for(let x=region.cx-region.range;x<=region.cx+region.range;x++)keys.add(`${x},${z}`);
 for(const key of raid)keys.add(key);for(const key of workerChunkDemand(state))keys.add(key);
 return {snapshot:serialize(state),chunkKeys:[...keys].sort(),raidWaitBindings:captureRaidWaitBindings(state,navigation),navigationView:{bounds:includeRaidBounds(region.bounds,raid),eye:{x:eye.x,z:eye.z},target:{x:target.x,z:target.z}}};
}
