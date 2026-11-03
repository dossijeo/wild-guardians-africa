import {deserialize} from '../persistence/snapshots.js';
import {serializeConfirmedState,confirmedStateSaveAvailable} from './confirmed-live-state.js';
import {advanceReal,cast,observeGameEvents,pause,removeWall,resume} from './game.js';
import {createSpatialGameSession} from '../world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../world/wild-engine/spatial-navigation-movement.js';
import {createEventDrivenTaskPlanner} from '../world/wild-engine/spatial-intent-bridge.js';
import {captureRaidWaitBindings,restoreRaidWaitBindings} from './raid-wait-handoff.js';
import {raidEntryChunks,raidResidentDemand} from '../world/raid-entry-residency.js';
import {workerChunkDemand} from '../rendering/worker-chunk-residency.js';

export function parseSimulationChunkKey(key){
 if(typeof key!=='string'||!/^(-?\d+),(-?\d+)$/.test(key))throw TypeError('Invalid chunk key');
 const coords=key.split(',').map(Number);if(coords.some(n=>!Number.isInteger(n)||n<-2147483648||n>2147483647)||coords.join(',')!==key)throw TypeError('Invalid chunk coordinates');return coords;
}

// Owns the game state and a native world inside the simulation worker. Chunk
// residency is explicit: callers must provide the confirmed simulation demand.
export function createSimulationAuthority(module,snapshot,chunkKeys,{raidWaitBindings=null}={}){
 if(!(module instanceof WebAssembly.Module)||typeof snapshot!=='string'||!Array.isArray(chunkKeys)||new Set(chunkKeys).size!==chunkKeys.length)throw TypeError('Invalid simulation authority initialization');
 for(const key of chunkKeys)parseSimulationChunkKey(key);
 const game=deserialize(snapshot),loaded=new Map();let session,stopTasks,stopWorld,stopEvents,physics=null,physicsInitializing=false,closed=false,sequence=0,events=[];
 try{
  session=createSpatialGameSession(module,game,{loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  for(const key of chunkKeys){const [x,z]=parseSimulationChunkKey(key);if(session.core.selectChunk(x,z)<0&&session.core.addChunk(x,z)<0)throw Error('Could not add simulation chunk '+key);loaded.set(key,{...session.core.chunkPayload(),terrainRevision:0});}
  const planner=createEventDrivenTaskPlanner(session);planner.resetFromState(game);
  const nav=createSpatialNavigationMovement(session,game);stopTasks=planner.observeTasks(game);stopWorld=planner.observeWorld(game);nav.intentTaskPlanner=planner;nav.raidEntryResident=(entry,radii)=>[...raidEntryChunks(entry,radii)].every(key=>loaded.has(key));if(raidWaitBindings!==null)restoreRaidWaitBindings(game,nav,raidWaitBindings);
  stopEvents=observeGameEvents(game,event=>events.push(structuredClone(event)));
  return {
   async enableBeastPhysics(actorId,{structureTemplates=null}={}){if(closed||physics||physicsInitializing)throw Error('Worker physics unavailable');physicsInitializing=true;try{const {createWorkerBeastPhysics}=await import('./worker-beast-physics.js');const driver=await createWorkerBeastPhysics(game,nav,{actorId,structureTemplates});if(closed){driver.dispose();throw Error('Simulation authority closed during physics initialization');}physics=driver;}finally{physicsInitializing=false;}},
   execute(command){
    if(closed)throw Error('Simulation authority is closed');if(physicsInitializing)throw Error('Worker physics is initializing');
    if(!command||command.sequence!==sequence+1)throw Error('Simulation command out of order');
    let value=null;
    if(command.kind==='advance'){
     if(!Number.isFinite(command.seconds)||command.seconds<=0||command.seconds>1||typeof command.nightFastForward!=='boolean')throw TypeError('Invalid real-time interval');
     advanceReal(game,command.seconds,nav,{nightFastForward:command.nightFastForward});nav.serviceRaidConnectivityDemand?.();
    }else if(command.kind==='pause'||command.kind==='resume'){
     if(typeof command.reason!=='string'||!command.reason)throw TypeError('Invalid pause reason');
     (command.kind==='pause'?pause:resume)(game,command.reason);
    }else if(command.kind==='castAttack'){
     if(!physics||command.targetId!==physics.actorId)throw Error('Target is not supported by worker physics');
     if(typeof command.id!=='string'||!command.id||!Number.isFinite(command.x)||!Number.isFinite(command.z))throw TypeError('Invalid attack command');
     if(!game.commandIds.includes(command.id))physics.assertEnvironment();
     value=cast(game,command.id,'attack',command.x,command.z,nav,{...(command.selection??{}),targetId:command.targetId});
    }else if(command.kind==='castShield'){
     if(typeof command.id!=='string'||!command.id||!Number.isFinite(command.x)||!Number.isFinite(command.z))throw TypeError('Invalid shield command');
     value=cast(game,command.id,'shield',command.x,command.z,nav,command.selection??null);
    }else if(command.kind==='addChunk'){
     const [x,z]=parseSimulationChunkKey(command.key);value=!loaded.has(command.key);
     if(value){if(session.core.selectChunk(x,z)<0&&session.core.addChunk(x,z)<0)throw Error('Could not add simulation chunk '+command.key);session.stream.onData(session.core.chunkPayload());}
    }else if(command.kind==='removeWall'){
     if(typeof command.id!=='string'||!command.id||typeof command.targetId!=='string'||!command.targetId)throw TypeError('Invalid wall removal command');
     value=removeWall(game,command.id,command.targetId,nav);
    }else if(command.kind!=='snapshot')throw TypeError('Unknown simulation command');
    sequence=command.sequence;const emitted=events;events=[];
    const required=[...new Set([...raidResidentDemand(game,nav),...workerChunkDemand(game)])].sort();
    const residency={required,missing:required.filter(key=>!loaded.has(key))};
    return {sequence,value,residency,physicsPose:physics?.pose()??null,elapsed:game.elapsed,pauses:[...game.pauses],events:emitted,raidWaitBindings:captureRaidWaitBindings(game,nav),saveAvailable:confirmedStateSaveAvailable(game),snapshot:serializeConfirmedState(game)};
   },
   dispose(){if(closed)return;closed=true;stopEvents?.();stopTasks?.();stopWorld?.();try{physics?.dispose();}finally{session.dispose();}},
  };
 }catch(error){stopEvents?.();stopTasks?.();stopWorld?.();session?.dispose();throw error;}
}
