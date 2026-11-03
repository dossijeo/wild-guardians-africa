import {deserialize} from '../persistence/snapshots.js';
import {serializeConfirmedState,deserializeConfirmedState,confirmedStateSaveAvailable} from './confirmed-live-state.js';
import {encodePhysicsCheckpoint} from './physics-checkpoint-codec.js';
import {advanceReal,cast,previewSpell,previewVillage,plant,PlantPlacementError,validatePlant,validatePlantPurchase,harvest,requestRepair,validateHarvest,validateRepair,hire,hireAdditional,validateHire,validateHireAdditional,openInitialHiring,wallCapacity,previewWallChain,buildWallChain,placeStructure,prepareStructurePlacement,StructurePlacementError,observeGameEvents,pause,removeWall,resume,bless,continuePostgame} from './game.js';
import {previewBlessing} from './blessings.js';
import {AWAKENINGS} from './awakening-config.js';
import {awakeningState} from './awakenings.js';
import {permission} from './rules.js';
import {ensurePurchaseBudget,RESERVE_MESSAGE} from './budget.js';
import {createSpatialGameSession} from '../world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement,SpatialChunkUnavailable} from '../world/wild-engine/spatial-navigation-movement.js';
import {createEventDrivenTaskPlanner} from '../world/wild-engine/spatial-intent-bridge.js';
import {captureRaidWaitBindings,restoreRaidWaitBindings} from './raid-wait-handoff.js';
import {raidEntryChunks,raidResidentDemand} from '../world/raid-entry-residency.js';
import {workerChunkDemand} from '../rendering/worker-chunk-residency.js';
import {plantTouchTarget} from './plant-touch-target.js';
import {syncTutorialActionPause} from '../tutorial/action-pause.js';
import {createWorkerTutorial} from './worker-tutorial.js';
import {dueCinematicAct,finishCinematicAct} from '../app/campaign-cinematics.js';
import {reserveEvent,settleEvent,disableMicroEconomy,trackIncome,microState,validateMicroState} from '../microevents/economy.js';
import {prepareVillageIsolated,applyVillageIsolatedPlan} from './isolated-village-preflight.js';
import {observePathMotion} from './locomotion.js';

export function parseSimulationChunkKey(key){
 if(typeof key!=='string'||!/^(-?\d+),(-?\d+)$/.test(key))throw TypeError('Invalid chunk key');
 const coords=key.split(',').map(Number);if(coords.some(n=>!Number.isInteger(n)||n<-2147483648||n>2147483647)||coords.join(',')!==key)throw TypeError('Invalid chunk coordinates');return coords;
}

// Owns the game state and a native world inside the simulation worker. Chunk
// residency is explicit: callers must provide the confirmed simulation demand.
export function createSimulationAuthority(module,snapshot,chunkKeys,{raidWaitBindings=null,navigationView=null,compactViewAcks=false,restoringPhysics=false}={}){
 if(!(module instanceof WebAssembly.Module)||typeof snapshot!=='string'||!Array.isArray(chunkKeys)||new Set(chunkKeys).size!==chunkKeys.length)throw TypeError('Invalid simulation authority initialization');
 for(const key of chunkKeys)parseSimulationChunkKey(key);
 const game=(restoringPhysics?deserializeConfirmedState:deserialize)(snapshot),loaded=new Map(),savedWaitBindings=game.workerRaidWaitBindings??null;delete game.workerRaidWaitBindings;delete game.workerPhysicsCheckpoint;let session,stopTasks,stopWorld,stopEvents,physics=null,physicsInitializing=false,tutorial=null,closed=false,sequence=0,events=[],trackMicroIncome=false,trackedActor=null,stopMotion=null,motionSegments=null;
 try{
  session=createSpatialGameSession(module,game,{loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
  for(const key of chunkKeys){const [x,z]=parseSimulationChunkKey(key);if(session.core.selectChunk(x,z)<0&&session.core.addChunk(x,z)<0)throw Error('Could not add simulation chunk '+key);loaded.set(key,{...session.core.chunkPayload(),terrainRevision:0});}
  const planner=createEventDrivenTaskPlanner(session);planner.resetFromState(game);
  const nav=createSpatialNavigationMovement(session,game);stopTasks=planner.observeTasks(game);stopWorld=planner.observeWorld(game);nav.intentTaskPlanner=planner;nav.raidEntryResident=(entry,radii)=>[...raidEntryChunks(entry,radii)].every(key=>loaded.has(key));if(raidWaitBindings!==null||savedWaitBindings!==null)restoreRaidWaitBindings(game,nav,raidWaitBindings??savedWaitBindings);
  function setNavigationView(view){if(!view||!Array.isArray(view.bounds)||![view.eye?.x,view.eye?.z,view.target?.x,view.target?.z].every(Number.isFinite))throw TypeError('Invalid navigation view');nav.setActiveBounds(view.bounds);nav.setRaidView(view.eye,view.target);}
  if(navigationView!==null)setNavigationView(navigationView);
  function residency(){const required=[...new Set([...raidResidentDemand(game,nav),...workerChunkDemand(game)])].sort();return {required,missing:required.filter(key=>!loaded.has(key))};}
  // Cinematic presentation is not restorable; do not persist its transient pause.
  function saveAvailable(){return !game.pauses.includes('campaign-cinematic')&&confirmedStateSaveAvailable(game);}
  stopEvents=observeGameEvents(game,event=>{events.push(structuredClone(event));if(trackMicroIncome&&(event.type==='Dawn'||event.type==='CrateDelivered'))trackIncome(game,[event]);});
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
  function missingCenterRouteChunks(start,end){
   const coord=n=>Math.floor((n+24)/48),margin=48;
   const minX=coord(Math.min(start.x,end.x)-margin),maxX=coord(Math.max(start.x,end.x)+margin),minZ=coord(Math.min(start.z,end.z)-margin),maxZ=coord(Math.max(start.z,end.z)+margin);
   if(![minX,maxX,minZ,maxZ].every(Number.isSafeInteger)||(maxX-minX+1)*(maxZ-minZ+1)>64)throw new SpatialChunkUnavailable(start,end,[]);
   const missing=[];for(let cz=minZ;cz<=maxZ;cz++)for(let cx=minX;cx<=maxX;cx++)if(!loaded.has(`${cx},${cz}`))missing.push({cx,cz});return missing;
  }
  function prepareResidentStructure(structure){
   if((structure.kind??'center')!=='center')return prepareStructurePlacement(game,structure,nav);
   const original=nav.withCenterPreview;if(!original)return prepareStructurePlacement(game,structure,nav);
   nav.withCenterPreview=(building,suppressed,inspect)=>original(building,suppressed,routes=>inspect({...routes,
    walkable:(x,z,...rest)=>{const result=routes.walkable(x,z,...rest);if(result===null||result===undefined){const point={x,z},missing=missingCenterRouteChunks(point,point);if(missing.length)throw new SpatialChunkUnavailable(point,point,missing);}return result;},
    reachCost:(start,end)=>{const result=routes.reachCost(start,end);if(result?.status==='unknown'){const missing=missingCenterRouteChunks(start,end);if(missing.length)throw new SpatialChunkUnavailable(start,end,missing);}return result;}}));
   try{return prepareStructurePlacement(game,structure,nav);}finally{nav.withCenterPreview=original;}
  }
  return {
   async enableBeastPhysics(actorId,{actorIds=undefined,structureTemplates=null,allowEmpty=false,checkpoint=null,shareSpeciesClips=false}={}){if(closed||physics||physicsInitializing)throw Error('Worker physics unavailable');physicsInitializing=true;try{const {createWorkerBeastPhysics}=await import('./worker-beast-physics.js');const driver=await createWorkerBeastPhysics(game,nav,{actorId,actorIds,structureTemplates,allowEmpty,checkpoint,shareSpeciesClips});if(closed){driver.dispose();throw Error('Simulation authority closed during physics initialization');}physics=driver;}finally{physicsInitializing=false;}},
   async prepareBeastAttack(command){if(closed||physicsInitializing||!physics)throw Error('Worker physics unavailable');if(!command||command.kind!=='castAttack'||command.sequence!==sequence+1||typeof command.id!=='string'||!command.id||typeof command.targetId!=='string'||!command.targetId||!Number.isFinite(command.x)||!Number.isFinite(command.z))throw TypeError('Invalid attack command');if(game.commandIds.includes(command.id)||Object.hasOwn(game.ledger.entries,command.id)||spellRejection(command,'attack'))return false;if(!physics.supports(command.targetId)){physicsInitializing=true;try{return await physics.admit(command.targetId);}finally{physicsInitializing=false;}}return false;},
   execute(command){
    if(closed)throw Error('Simulation authority is closed');if(physicsInitializing)throw Error('Worker physics is initializing');
    if(!command||command.sequence!==sequence+1)throw Error('Simulation command out of order');
    let value=null,rejection=null,stepsExecuted=null,motionTrace=null;const commandLoadedChunks=[];
    if(command.kind==='advance'){
     if(!Number.isFinite(command.seconds)||command.seconds<=0||command.seconds>1||typeof command.nightFastForward!=='boolean'||command.steps!==undefined&&(!Number.isSafeInteger(command.steps)||command.steps<1||command.steps>256))throw TypeError('Invalid real-time interval');
     const start=trackedActor?{at:game.elapsed,x:trackedActor.x,z:trackedActor.z}:null;if(start)motionSegments=[];
     const steps=command.steps??1;try{for(let i=0;i<steps;i++){advanceReal(game,command.seconds,nav,{nightFastForward:command.nightFastForward});if(trackMicroIncome)trackIncome(game,[]);nav.serviceRaidConnectivityDemand?.();stepsExecuted=i+1;if(i+1<steps&&residency().missing.length)break;}}finally{if(start){const end={at:game.elapsed,x:trackedActor.x,z:trackedActor.z},segments=motionSegments;motionSegments=null;let x=start.x,z=start.z,continuous=true;for(const segment of segments){if(segment.x0!==x||segment.z0!==z)continuous=false;x=segment.x1;z=segment.z1;}if(end.x!==x||end.z!==z||!(game.raid?.animals??[]).includes(trackedActor)&&!game.workers.includes(trackedActor))continuous=false;motionTrace={actorId:trackedActor.id,start,end,segments,continuous};}}
    }else if(command.kind==='trackPathMotion'){
     if(command.actorId!==null&&(typeof command.actorId!=='string'||!command.actorId))throw TypeError('Invalid motion actor');
     const next=command.actorId===null?null:[...(game.raid?.animals??[]),...game.workers].find(a=>a.id===command.actorId)??null;
     if(command.actorId!==null&&!next){rejection='No existe ese personaje';value=false;}
     else{stopMotion?.();stopMotion=null;trackedActor=next;if(trackedActor)stopMotion=observePathMotion(trackedActor,(x0,z0,x1,z1)=>{if(motionSegments)motionSegments.push({at:game.elapsed,x0,z0,x1,z1});});value=true;}
    }else if(command.kind==='pause'||command.kind==='resume'){
     if(typeof command.reason!=='string'||!command.reason)throw TypeError('Invalid pause reason');
     (command.kind==='pause'?pause:resume)(game,command.reason);
    }else if(command.kind==='continuePostgame'){
     resume(game,'result');continuePostgame(game);
    }else if(command.kind==='cinematicStart'||command.kind==='cinematicFinish'){
     if(!Number.isSafeInteger(command.act)||command.act<1||command.act>10)throw TypeError('Invalid cinematic act');
     const active=game.pauses.includes('campaign-cinematic');
     if(dueCinematicAct(game)!==command.act||(command.kind==='cinematicStart'?active:!active))rejection='La cinemática ya no corresponde al estado de la partida';
     else if(command.kind==='cinematicStart'){pause(game,'campaign-cinematic');value=true;}
     else{finishCinematicAct(game,command.act);resume(game,'campaign-cinematic');value=true;}
    }else if(command.kind==='setNavigationView'){
     setNavigationView(command.view);
    }else if(command.kind==='tutorialStart'){
     if(tutorial)throw Error('Tutorial already started');tutorial=createWorkerTutorial(game,command.seen);value=tutorial.execute({action:'update',narrating:null});
    }else if(command.kind==='tutorialCommand'){
     if(!tutorial)throw Error('Tutorial not started');value=tutorial.execute(command);
    }else if(command.kind==='tutorialActionPause'){
     if(typeof command.hudTarget!=='boolean'||typeof command.worldTarget!=='boolean'||typeof command.selectionOpen!=='boolean')throw TypeError('Invalid tutorial guidance');
     value=syncTutorialActionPause(game,command);
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
     if(typeof command.id!=='string'||!command.id||typeof command.species!=='string'||!command.species||!Number.isFinite(command.x)||!Number.isFinite(command.z)||command.nearTouch!==undefined&&typeof command.nearTouch!=='boolean')throw TypeError('Invalid plant command');
     let target={x:command.x,z:command.z};
     try{target=withResidentChunks(()=>command.nearTouch?plantTouchTarget(game,target,nav):target,commandLoadedChunks);withResidentChunks(()=>validatePlant(game,target.x,target.z,nav),commandLoadedChunks);}catch(error){if(!(error instanceof PlantPlacementError))throw error;rejection=error.message;}
     const duplicate=game.commandIds.includes(command.id)||Object.hasOwn(game.ledger.entries,command.id);
     if(!rejection&&!duplicate&&!permission(game,'plant'))rejection='Esta acción no está disponible ahora';
     if(!rejection&&!duplicate)try{validatePlantPurchase(game,command.species);}catch(error){if(error?.code!=='hiring-reserve'&&error?.message!=='Cultivo desconocido')throw error;rejection=error.message;}
     value=rejection?false:plant(game,command.id,command.species,target.x,target.z,nav);
    }else if(command.kind==='microSchedule'){
     const keys=['rng','cooldown','eventCooldowns','ignored','history','negativeTimes'];if(!command.schedule||typeof command.schedule!=='object'||Array.isArray(command.schedule)||Object.keys(command.schedule).length!==keys.length||keys.some(key=>!Object.hasOwn(command.schedule,key)))throw TypeError('Invalid microevent schedule');
     const memory=microState(game),next={...memory,...structuredClone(command.schedule)};validateMicroState({...game,microevents:next});for(const key of keys)memory[key]=next[key];
    }else if(command.kind==='microIncome'){
     if(typeof command.enabled!=='boolean')throw TypeError('Invalid microevent income policy');trackMicroIncome=command.enabled;if(trackMicroIncome)trackIncome(game,[]);
    }else if(command.kind==='microReserve'){
     if(typeof command.eventType!=='string'||!command.eventType||typeof command.targetId!=='string'||!command.targetId)throw TypeError('Invalid microevent reservation');
     value=reserveEvent(game,command.eventType,command.targetId);
    }else if(command.kind==='microSettle'){
     if(!command.ticket||typeof command.ticket!=='object'||Array.isArray(command.ticket)||typeof command.ticket.id!=='string'||typeof command.ticket.type!=='string'||typeof command.ticket.targetId!=='string'||!['completed','ignored','cancelled'].includes(command.outcome)||typeof command.enabled!=='boolean'||typeof command.losses!=='boolean')throw TypeError('Invalid microevent settlement');
     value=settleEvent(game,command.ticket,command.outcome,{enabled:command.enabled,losses:command.losses});
    }else if(command.kind==='microDisable'){
     disableMicroEconomy(game);
    }else if(command.kind==='bless'){
     if(typeof command.id!=='string'||!command.id||typeof command.targetId!=='string'||!command.targetId)throw TypeError('Invalid blessing command');
     const duplicate=game.commandIds.includes(command.id)||Object.hasOwn(game.ledger.entries,command.id);
     if(!duplicate){if(!permission(game,'awakening'))rejection='Esta acción no está disponible ahora';else{const draft=previewBlessing(game,command.targetId);if(!draft.valid)rejection=draft.reason;else{const a=awakeningState(game);if(a.enabled===false||a.progress<AWAKENINGS.maximum)rejection='El Despertar todavía está recargando.';}}}
     value=rejection?false:bless(game,command.id,command.targetId);
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
     if(typeof command.id!=='string'||!command.id||typeof command.material!=='string'||!command.material||!Array.isArray(command.points)||command.capacityLimit!==undefined&&typeof command.capacityLimit!=='boolean'||command.options!==undefined&&(!command.options||typeof command.options!=='object'||Array.isArray(command.options)||Object.hasOwn(command.options,'preparedPlan')||command.capacityLimit&&Object.hasOwn(command.options,'maxPieces')))throw TypeError('Invalid wall chain command');
     if(game.commandIds.includes(command.id)||Object.hasOwn(game.ledger.entries,command.id))value=false;
     else{
      let options=command.options??{},plan;
      try{if(command.capacityLimit){const maxPieces=wallCapacity(game,command.material);if(!maxPieces)throw Error(RESERVE_MESSAGE);options={...options,maxPieces};}plan=withResidentChunks(()=>previewWallChain(game,command.material,command.points,nav,options),commandLoadedChunks);if(plan.pieces.length)ensurePurchaseBudget(game,plan.cost);}
      catch(error){if(error?.code!=='hiring-reserve'&&error?.message!==RESERVE_MESSAGE&&!['Esta acción no está disponible ahora','No hay monedas suficientes para todo el trazado','Trazado de muralla inválido','Material desconocido'].includes(error?.message))throw error;rejection=error.message;}
      value=rejection?false:plan.pieces.length?buildWallChain(game,command.id,command.material,command.points,nav,{...options,preparedPlan:plan}):false;
     }
    }else if(command.kind==='placeStructure'){
     if(typeof command.id!=='string'||!command.id||!command.structure||typeof command.structure!=='object'||Array.isArray(command.structure)||!Number.isFinite(command.structure.x)||!Number.isFinite(command.structure.z))throw TypeError('Invalid structure command');
     if(game.commandIds.includes(command.id)||Object.hasOwn(game.ledger.entries,command.id))value=false;
     else{let plan;try{plan=withResidentChunks(()=>prepareResidentStructure(command.structure),commandLoadedChunks);if(plan&&!permission(game,plan.kind==='center'?'center':'wall'))throw new StructurePlacementError('Esta acción no está disponible ahora');if(plan)ensurePurchaseBudget(game,plan.cost);}
      catch(error){if(!(error instanceof StructurePlacementError)&&error?.code!=='hiring-reserve'&&error?.message!=='Material desconocido')throw error;rejection=error.message;}
      value=rejection||!plan?false:placeStructure(game,command.id,command.structure,nav);
     }
    }else if(command.kind==='previewVillage'){
     if(typeof command.culture!=='string'||!Number.isFinite(command.x)||!Number.isFinite(command.z)||!command.payload||typeof command.payload!=='object'||!Array.isArray(command.payload.units))throw TypeError('Invalid village preview');
     try{value=withResidentChunks(()=>previewVillage(game,command.culture,command.x,command.z,command.payload,nav),commandLoadedChunks);}catch(error){rejection=String(error?.message??error);value=false;}
    }else if(command.kind==='foundVillage'){
     if(typeof command.id!=='string'||!command.id||typeof command.culture!=='string'||!Number.isFinite(command.x)||!Number.isFinite(command.z)||!command.payload||typeof command.payload!=='object'||!Array.isArray(command.payload.units))throw TypeError('Invalid village command');
     if(game.commandIds.includes(command.id)||Object.hasOwn(game.ledger.entries,command.id))value=false;
     else if(!saveAvailable()){rejection='Espera a que termine la física activa antes de fundar un poblado.';value=false;}
     else{
      let plan;try{plan=prepareVillageIsolated(module,serializeConfirmedState(game),[...loaded.keys()],{id:command.id,culture:command.culture,x:command.x,z:command.z,payload:command.payload},{bounds:nav.activeBounds??null});}
      catch(error){rejection=String(error?.message??error);value=false;}
      if(plan){for(const key of plan.addedChunks){if(addResidentChunk(key))commandLoadedChunks.push(key);}value=applyVillageIsolatedPlan(game,nav,plan,{residentChunks:[...loaded.keys()]});if(value!==plan.value||serializeConfirmedState(game)!==plan.snapshot||JSON.stringify(events)!==JSON.stringify(plan.events))throw Error('Village preparation diverged from authority');}
     }
    }else if(command.kind==='addChunk'){
     value=addResidentChunk(command.key);
    }else if(command.kind==='removeWall'){
     if(typeof command.id!=='string'||!command.id||typeof command.targetId!=='string'||!command.targetId)throw TypeError('Invalid wall removal command');
     const duplicate=game.commandIds.includes(command.id)||Object.hasOwn(game.ledger.entries,command.id);
     if(!duplicate&&!permission(game,'wall'))rejection='Esta acción no está disponible ahora';
     else if(!duplicate&&!game.structures.some(s=>s.id===command.targetId&&s.kind==='wall'))rejection='No existe esa defensa';
     value=rejection?false:removeWall(game,command.id,command.targetId,nav);
    }else if(command.kind!=='snapshot')throw TypeError('Unknown simulation command');
    sequence=command.sequence;const emitted=events;events=[];
    const resident=residency();
    if(compactViewAcks&&command.kind==='setNavigationView'&&!emitted.length)return {sequence,value,unchanged:true,slotId:game.slotId,stateSequence:game.sequence,elapsed:game.elapsed,pauses:[...game.pauses],events:[],residency:resident,saveAvailable:saveAvailable()};
    const physicsPoses=physics?.poses()??null;
    const physical=command.kind==='snapshot'&&(command.physicsCheckpoint===true||command.physicsCheckpoint==='encoded')?physics?.checkpointFall()??null:undefined;
    return {sequence,value,...(command.steps!==undefined?{stepsExecuted}:{}),...(motionTrace?{motionTrace}:{}),...(rejection?{rejection}:{}),...(commandLoadedChunks.length?{commandLoadedChunks}:{}),...(physical===undefined?{}:{physicsCheckpoint:physical&&command.physicsCheckpoint==='encoded'?encodePhysicsCheckpoint(physical):physical}),residency:resident,physicsPose:physicsPoses?.[0]??null,...(physicsPoses?.length>1?{physicsPoses}:{}),elapsed:game.elapsed,pauses:[...game.pauses],events:emitted,raidWaitBindings:captureRaidWaitBindings(game,nav),saveAvailable:saveAvailable(),snapshot:serializeConfirmedState(game)};
   },
   dispose(){if(closed)return;closed=true;stopMotion?.();stopEvents?.();stopTasks?.();stopWorld?.();try{physics?.dispose();}finally{session.dispose();}},
  };
 }catch(error){stopEvents?.();stopTasks?.();stopWorld?.();session?.dispose();throw error;}
}
