import {deserialize} from '../persistence/snapshots.js';
import {serializeConfirmedState,confirmedStateSaveAvailable} from './confirmed-live-state.js';
import {advanceReal,cast,previewSpell,harvest,requestRepair,validateHarvest,validateRepair,observeGameEvents,pause,removeWall,resume} from './game.js';
import {permission} from './rules.js';
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
  function spellRejection(command,kind){
   if(game.commandIds.includes(command.id)||Object.hasOwn(game.ledger.entries,command.id))return null;
   const draft=previewSpell(game,kind,command.x,command.z,nav,kind==='attack'?command.targetId:command.selection?.targetId);
   if(!draft.valid)return draft.reason;
   for(const p of [command.selection?.origin,command.selection?.contact])if(p&&![p.x,p.y,p.z].every(Number.isFinite))return 'Impacto mágico inválido';
   return null;
  }
  return {
   async enableBeastPhysics(actorId,{actorIds=undefined,structureTemplates=null,allowEmpty=false}={}){if(closed||physics||physicsInitializing)throw Error('Worker physics unavailable');physicsInitializing=true;try{const {createWorkerBeastPhysics}=await import('./worker-beast-physics.js');const driver=await createWorkerBeastPhysics(game,nav,{actorId,actorIds,structureTemplates,allowEmpty});if(closed){driver.dispose();throw Error('Simulation authority closed during physics initialization');}physics=driver;}finally{physicsInitializing=false;}},
   async prepareBeastAttack(command){if(closed||physicsInitializing||!physics)throw Error('Worker physics unavailable');if(!command||command.kind!=='castAttack'||command.sequence!==sequence+1||typeof command.id!=='string'||!command.id||typeof command.targetId!=='string'||!command.targetId||!Number.isFinite(command.x)||!Number.isFinite(command.z))throw TypeError('Invalid attack command');if(game.commandIds.includes(command.id)||Object.hasOwn(game.ledger.entries,command.id)||spellRejection(command,'attack'))return false;if(!physics.supports(command.targetId)){physicsInitializing=true;try{return await physics.admit(command.targetId);}finally{physicsInitializing=false;}}return false;},
   execute(command){
    if(closed)throw Error('Simulation authority is closed');if(physicsInitializing)throw Error('Worker physics is initializing');
    if(!command||command.sequence!==sequence+1)throw Error('Simulation command out of order');
    let value=null,rejection=null;
    if(command.kind==='advance'){
     if(!Number.isFinite(command.seconds)||command.seconds<=0||command.seconds>1||typeof command.nightFastForward!=='boolean')throw TypeError('Invalid real-time interval');
     advanceReal(game,command.seconds,nav,{nightFastForward:command.nightFastForward});nav.serviceRaidConnectivityDemand?.();
    }else if(command.kind==='pause'||command.kind==='resume'){
     if(typeof command.reason!=='string'||!command.reason)throw TypeError('Invalid pause reason');
     (command.kind==='pause'?pause:resume)(game,command.reason);
    }else if(command.kind==='castAttack'){
     if(typeof command.id!=='string'||!command.id||!Number.isFinite(command.x)||!Number.isFinite(command.z))throw TypeError('Invalid attack command');
     rejection=spellRejection(command,'attack');
     if(rejection||game.commandIds.includes(command.id)||Object.hasOwn(game.ledger.entries,command.id))value=false;
     else{if(!physics||!physics.supports(command.targetId))throw Error('Target is not supported by worker physics');if(!game.commandIds.includes(command.id))physics.assertEnvironment(command.targetId);value=cast(game,command.id,'attack',command.x,command.z,nav,{...(command.selection??{}),targetId:command.targetId});}
    }else if(command.kind==='castShield'){
     if(typeof command.id!=='string'||!command.id||!Number.isFinite(command.x)||!Number.isFinite(command.z))throw TypeError('Invalid shield command');
     rejection=spellRejection(command,'shield');value=rejection?false:cast(game,command.id,'shield',command.x,command.z,nav,command.selection??null);
    }else if(command.kind==='harvest'||command.kind==='requestRepair'){
     if(typeof command.id!=='string'||!command.id||typeof command.targetId!=='string'||!command.targetId)throw TypeError('Invalid farm command');
     try{(command.kind==='harvest'?validateHarvest:validateRepair)(game,command.targetId);}catch(error){rejection=error.message;}
     if(!rejection&&!game.commandIds.includes(command.id)&&!Object.hasOwn(game.ledger.entries,command.id)&&!permission(game,command.kind==='harvest'?'harvest':'repair'))rejection='Esta acción no está disponible ahora';
     value=rejection?false:(command.kind==='harvest'?harvest:requestRepair)(game,command.id,command.targetId);
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
    const physicsPoses=physics?.poses()??null;
    return {sequence,value,...(rejection?{rejection}:{}),residency,physicsPose:physicsPoses?.[0]??null,...(physicsPoses?.length>1?{physicsPoses}:{}),elapsed:game.elapsed,pauses:[...game.pauses],events:emitted,raidWaitBindings:captureRaidWaitBindings(game,nav),saveAvailable:confirmedStateSaveAvailable(game),snapshot:serializeConfirmedState(game)};
   },
   dispose(){if(closed)return;closed=true;stopEvents?.();stopTasks?.();stopWorld?.();try{physics?.dispose();}finally{session.dispose();}},
  };
 }catch(error){stopEvents?.();stopTasks?.();stopWorld?.();session?.dispose();throw error;}
}
