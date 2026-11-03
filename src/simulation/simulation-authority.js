import {deserialize} from '../persistence/snapshots.js';
import {serializeConfirmedState,confirmedStateSaveAvailable} from './confirmed-live-state.js';
import {advanceReal,cast,previewSpell,plant,PlantPlacementError,validatePlant,validatePlantPurchase,harvest,requestRepair,validateHarvest,validateRepair,hire,hireAdditional,validateHire,validateHireAdditional,openInitialHiring,previewWallChain,buildWallChain,observeGameEvents,pause,removeWall,resume} from './game.js';
import {permission} from './rules.js';
import {ensurePurchaseBudget} from './budget.js';
import {createSpatialGameSession} from '../world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement,SpatialChunkUnavailable} from '../world/wild-engine/spatial-navigation-movement.js';
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
  function addResidentChunk(key){
   const [x,z]=parseSimulationChunkKey(key);if(loaded.has(key))return false;
   if(session.core.selectChunk(x,z)<0&&session.core.addChunk(x,z)<0)throw Error('Could not add simulation chunk '+key);
   session.stream.onData(session.core.chunkPayload());return true;
  }
  function withResidentChunks(operation,added){
   for(;;){
    try{return operation();}catch(error){
     if(!(error instanceof SpatialChunkUnavailable))throw error;
     if(!Array.isArray(error.missing)||!error.missing.length||error.missing.length+added.length>64)throw error;
     let progress=false;for(const {cx,cz} of error.missing){const key=`${cx},${cz}`;if(addResidentChunk(key)){added.push(key);progress=true;}}
     if(!progress)throw error;
    }
   }
  }
  return {
   async enableBeastPhysics(actorId,{actorIds=undefined,structureTemplates=null,allowEmpty=false}={}){if(closed||physics||physicsInitializing)throw Error('Worker physics unavailable');physicsInitializing=true;try{const {createWorkerBeastPhysics}=await import('./worker-beast-physics.js');const driver=await createWorkerBeastPhysics(game,nav,{actorId,actorIds,structureTemplates,allowEmpty});if(closed){driver.dispose();throw Error('Simulation authority closed during physics initialization');}physics=driver;}finally{physicsInitializing=false;}},
   async prepareBeastAttack(command){if(closed||physicsInitializing||!physics)throw Error('Worker physics unavailable');if(!command||command.kind!=='castAttack'||command.sequence!==sequence+1||typeof command.id!=='string'||!command.id||typeof command.targetId!=='string'||!command.targetId||!Number.isFinite(command.x)||!Number.isFinite(command.z))throw TypeError('Invalid attack command');if(game.commandIds.includes(command.id)||Object.hasOwn(game.ledger.entries,command.id)||spellRejection(command,'attack'))return false;if(!physics.supports(command.targetId)){physicsInitializing=true;try{return await physics.admit(command.targetId);}finally{physicsInitializing=false;}}return false;},
   execute(command){
    if(closed)throw Error('Simulation authority is closed');if(physicsInitializing)throw Error('Worker physics is initializing');
    if(!command||command.sequence!==sequence+1)throw Error('Simulation command out of order');
    let value=null,rejection=null;const commandLoadedChunks=[];
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
    }else if(command.kind==='castAgricultural'){
     if(typeof command.id!=='string'||!command.id||!['growth','multiply'].includes(command.spell)||!Number.isFinite(command.x)||!Number.isFinite(command.z))throw TypeError('Invalid agricultural spell command');
     rejection=spellRejection(command,command.spell);value=rejection?false:cast(game,command.id,command.spell,command.x,command.z,nav,command.selection??null);
    }else if(command.kind==='plant'){
     if(typeof command.id!=='string'||!command.id||typeof command.species!=='string'||!command.species||!Number.isFinite(command.x)||!Number.isFinite(command.z))throw TypeError('Invalid plant command');
     try{withResidentChunks(()=>validatePlant(game,command.x,command.z,nav),commandLoadedChunks);}catch(error){if(!(error instanceof PlantPlacementError))throw error;rejection=error.message;}
     const duplicate=game.commandIds.includes(command.id)||Object.hasOwn(game.ledger.entries,command.id);
     if(!rejection&&!duplicate&&!permission(game,'plant'))rejection='Esta acción no está disponible ahora';
     if(!rejection&&!duplicate)try{validatePlantPurchase(game,command.species);}catch(error){if(error?.code!=='hiring-reserve'&&error?.message!=='Cultivo desconocido')throw error;rejection=error.message;}
     value=rejection?false:plant(game,command.id,command.species,command.x,command.z,nav);
    }else if(command.kind==='harvest'||command.kind==='requestRepair'){
     if(typeof command.id!=='string'||!command.id||typeof command.targetId!=='string'||!command.targetId)throw TypeError('Invalid farm command');
     try{(command.kind==='harvest'?validateHarvest:validateRepair)(game,command.targetId);}catch(error){rejection=error.message;}
     if(!rejection&&!game.commandIds.includes(command.id)&&!Object.hasOwn(game.ledger.entries,command.id)&&!permission(game,command.kind==='harvest'?'harvest':'repair'))rejection='Esta acción no está disponible ahora';
     value=rejection?false:(command.kind==='harvest'?harvest:requestRepair)(game,command.id,command.targetId);
    }else if(command.kind==='openInitialHiring'){
     openInitialHiring(game);
    }else if(command.kind==='hire'||command.kind==='hireAdditional'){
     if(typeof command.id!=='string'||!command.id||!command.selection||typeof command.selection!=='object'||Array.isArray(command.selection)||command.kind==='hireAdditional'&&(typeof command.centerId!=='string'||!command.centerId))throw TypeError('Invalid hiring command');
     try{if(command.kind==='hire')validateHire(game,command.id,command.selection);else validateHireAdditional(game,command.id,command.selection,command.centerId);}catch(error){rejection=error.message;}
     value=rejection?false:(command.kind==='hire'?hire(game,command.id,command.selection):hireAdditional(game,command.id,command.selection,command.centerId))??null;
    }else if(command.kind==='buildWallChain'){
     if(typeof command.id!=='string'||!command.id||typeof command.material!=='string'||!command.material||!Array.isArray(command.points)||command.options!==undefined&&(!command.options||typeof command.options!=='object'||Array.isArray(command.options)||Object.hasOwn(command.options,'preparedPlan')))throw TypeError('Invalid wall chain command');
     if(game.commandIds.includes(command.id)||Object.hasOwn(game.ledger.entries,command.id))value=false;
     else{
      const options=command.options??{};let plan;
      try{plan=withResidentChunks(()=>previewWallChain(game,command.material,command.points,nav,options),commandLoadedChunks);if(plan.pieces.length)ensurePurchaseBudget(game,plan.cost);}
      catch(error){if(error?.code!=='hiring-reserve'&&!['Esta acción no está disponible ahora','No hay monedas suficientes para todo el trazado','Trazado de muralla inválido','Material desconocido'].includes(error?.message))throw error;rejection=error.message;}
      value=rejection?false:plan.pieces.length?buildWallChain(game,command.id,command.material,command.points,nav,{...options,preparedPlan:plan}):false;
     }
    }else if(command.kind==='addChunk'){
     value=addResidentChunk(command.key);
    }else if(command.kind==='removeWall'){
     if(typeof command.id!=='string'||!command.id||typeof command.targetId!=='string'||!command.targetId)throw TypeError('Invalid wall removal command');
     value=removeWall(game,command.id,command.targetId,nav);
    }else if(command.kind!=='snapshot')throw TypeError('Unknown simulation command');
    sequence=command.sequence;const emitted=events;events=[];
    const required=[...new Set([...raidResidentDemand(game,nav),...workerChunkDemand(game)])].sort();
    const residency={required,missing:required.filter(key=>!loaded.has(key))};
    const physicsPoses=physics?.poses()??null;
    return {sequence,value,...(rejection?{rejection}:{}),...(commandLoadedChunks.length?{commandLoadedChunks}:{}),residency,physicsPose:physicsPoses?.[0]??null,...(physicsPoses?.length>1?{physicsPoses}:{}),elapsed:game.elapsed,pauses:[...game.pauses],events:emitted,raidWaitBindings:captureRaidWaitBindings(game,nav),saveAvailable:confirmedStateSaveAvailable(game),snapshot:serializeConfirmedState(game)};
   },
   dispose(){if(closed)return;closed=true;stopEvents?.();stopTasks?.();stopWorld?.();try{physics?.dispose();}finally{session.dispose();}},
  };
 }catch(error){stopEvents?.();stopTasks?.();stopWorld?.();session?.dispose();throw error;}
}
