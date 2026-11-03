import {deserialize,serialize} from '../persistence/snapshots.js';
import {advanceReal,cast,observeGameEvents,pause,resume} from './game.js';
import {createSpatialGameSession} from '../world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../world/wild-engine/spatial-navigation-movement.js';
import {createEventDrivenTaskPlanner} from '../world/wild-engine/spatial-intent-bridge.js';

// Owns the game state and a native world inside the simulation worker. Chunk
// residency is explicit: callers must provide the confirmed simulation demand.
export function createSimulationAuthority(module,snapshot,chunkKeys){
 if(!(module instanceof WebAssembly.Module)||typeof snapshot!=='string'||!Array.isArray(chunkKeys)||new Set(chunkKeys).size!==chunkKeys.length||chunkKeys.some(key=>typeof key!=='string'||!/^[-]?\d+,[-]?\d+$/.test(key)))throw TypeError('Invalid simulation authority initialization');
 const game=deserialize(snapshot),loaded=new Map();let session,stopTasks,stopWorld,stopEvents,closed=false,sequence=0,events=[];
 try{
  session=createSpatialGameSession(module,game,{loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  for(const key of chunkKeys){const [x,z]=key.split(',').map(Number);if(!Number.isSafeInteger(x)||!Number.isSafeInteger(z))throw TypeError('Invalid chunk coordinates');if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);loaded.set(key,{...session.core.chunkPayload(),terrainRevision:0});}
  const planner=createEventDrivenTaskPlanner(session);planner.resetFromState(game);
  const nav=createSpatialNavigationMovement(session,game);stopTasks=planner.observeTasks(game);stopWorld=planner.observeWorld(game);nav.intentTaskPlanner=planner;
  stopEvents=observeGameEvents(game,event=>events.push(structuredClone(event)));
  return {
   execute(command){
    if(closed)throw Error('Simulation authority is closed');
    if(!command||command.sequence!==sequence+1)throw Error('Simulation command out of order');
    let value=null;
    if(command.kind==='advance'){
     if(!Number.isFinite(command.seconds)||command.seconds<=0||command.seconds>1||typeof command.nightFastForward!=='boolean')throw TypeError('Invalid real-time interval');
     advanceReal(game,command.seconds,nav,{nightFastForward:command.nightFastForward});nav.serviceRaidConnectivityDemand?.();
    }else if(command.kind==='pause'||command.kind==='resume'){
     if(typeof command.reason!=='string'||!command.reason)throw TypeError('Invalid pause reason');
     (command.kind==='pause'?pause:resume)(game,command.reason);
    }else if(command.kind==='castShield'){
     if(typeof command.id!=='string'||!command.id||!Number.isFinite(command.x)||!Number.isFinite(command.z))throw TypeError('Invalid shield command');
     value=cast(game,command.id,'shield',command.x,command.z,nav,command.selection??null);
    }else if(command.kind!=='snapshot')throw TypeError('Unknown simulation command');
    sequence=command.sequence;const emitted=events;events=[];
    return {sequence,value,elapsed:game.elapsed,pauses:[...game.pauses],events:emitted,snapshot:serialize(game)};
   },
   dispose(){if(closed)return;closed=true;stopEvents?.();stopTasks?.();stopWorld?.();session.dispose();},
  };
 }catch(error){stopEvents?.();stopTasks?.();stopWorld?.();session?.dispose();throw error;}
}
