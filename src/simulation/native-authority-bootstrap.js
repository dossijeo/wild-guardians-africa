import {serializeConfirmedState} from './confirmed-live-state.js';
import {captureRaidWaitBindings} from './raid-wait-handoff.js';

// Captures a handoff at one synchronous native world boundary. These keys are
// native residency, not a claim that the corresponding graphics are installed.
export function captureNativeAuthorityBootstrap(state,navigation,session){
 if(!state||!navigation||!session?.core?.captureResidentChunks||typeof session.core.snapshot!=='function'||typeof session.topologySource?.revision!=='function'||typeof session.horizonSource?.revision!=='function')throw TypeError('Invalid native authority bootstrap');
 const first=session.core.captureResidentChunks(),topology=session.topologySource.revision(),terrain=session.horizonSource.revision();
 if(!Number.isSafeInteger(topology)||!Number.isSafeInteger(terrain))throw TypeError('Invalid native world revision');
 const snapshot=serializeConfirmedState(state),spatialState=session.core.snapshot(),raidWaitBindings=captureRaidWaitBindings(state,navigation),view=navigation.activeBounds&&navigation.raidView?{bounds:[...navigation.activeBounds],eye:{...navigation.raidView.eye},target:{...navigation.raidView.target}}:null;
 const last=session.core.captureResidentChunks();if(last.revision!==first.revision||session.topologySource.revision()!==topology||session.horizonSource.revision()!==terrain)throw Error('Native authority bootstrap changed during capture');
 return {version:1,snapshot,spatialState,chunkKeys:first.keys,chunkRevision:first.revision,topologyRevision:topology,terrainRevision:terrain,raidWaitBindings,navigationView:view};
}
