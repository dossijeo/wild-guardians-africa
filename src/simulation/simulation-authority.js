import {spatialStructureBarriers} from '../world/wild-engine/spatial-wall-bridge.js';
import {centerFootprint} from '../world/centers.js';
import {gateScale,nativeGateModelId} from '../world/gate-passages.js';
import {createHistoricalEventBoundaryCapture} from './historical-event-boundaries.js';
import {createNativeIntentControlCohort} from './native-intent-control-cohort.js';
import {createNativeResourcePreparationConnection} from './native-resource-preparation-connection.js';
import {createNativeIntentProduction} from './native-intent-production.js';
import {createSpatialDynamicBodies} from '../world/wild-engine/spatial-dynamic-bodies.js';
import {createSpatialGateIntents} from '../world/wild-engine/spatial-gate-intents.js';
import {WORKER_SPATIAL_PROFILE} from '../world/wild-engine/spatial-movement-profiles.js';
import {createTutorialGuideRevision} from './tutorial-guide-revision.js';
import {captureMudInputs} from './mud-terrain-input.js';
import {captureSpatialFarState} from '../world/wild-engine/spatial-far-state.js';
import {observeSettlements} from './settlement-observers.js';
import {createPresentationLifecycleJournal} from './presentation-lifecycle.js';
import {deserialize} from '../persistence/snapshots.js';
import {serializeConfirmedState,serializeConfirmedPresentationState,prepareConfirmedStateTransport,deserializeConfirmedState,confirmedStateSaveAvailable} from './confirmed-live-state.js';
import {encodePhysicsCheckpoint} from './physics-checkpoint-codec.js';
import {pausedAuthorityQuiescent} from './paused-authority-quiescence.js';
import {prepareNativeRuinedWallRepair,projectNativeRuinedWallRepair,advanceReal,cast,previewSpell,previewVillage,plant,PlantPlacementError,validatePlant,validatePlantPurchase,harvest,requestRepair,validateHarvest,validateRepair,hire,hireAdditional,validateHire,validateHireAdditional,openInitialHiring,wallCapacity,previewWallChain,buildWallChain,commitStructurePlacement,prepareStructurePlacement,coincidentRuins,StructurePlacementError,observeGameEvents,pause,removeWall,resume,bless,continuePostgame} from './game.js';
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
import {workerChunkDemand} from '../world/worker-chunk-residency.js';
import {plantTouchTarget} from './plant-touch-target.js';
import {syncTutorialActionPause} from '../tutorial/action-pause.js';
import {tutorialHandTarget} from '../tutorial/tutorial-hand-target.js';
import {createWorkerTutorial} from './worker-tutorial.js';
import {dueCinematicAct,finishCinematicAct} from '../app/campaign-cinematics.js';
import {reserveEvent,settleEvent,disableMicroEconomy,trackIncome,microState,validateMicroState} from '../microevents/economy.js';
import {nativeCropRouteSubject} from './raids.js';
import {prepareVillageIsolated,applyVillageIsolatedPlan} from './isolated-village-preflight.js';
import {observePathMotion} from './locomotion.js';
import {captureMotionPeers} from './worker-motion-peers.js';
import {createPresentationWorkerHeadings} from './presentation-worker-headings.js';
import {captureWorldMotion} from './worker-world-motion.js';
import {workerPhysicsActivity} from './worker-physics-activity.js';
import {queryGuardianOrigin,queryGuardianTutorialOrigin} from './guardian-origin-query.js';

export function parseSimulationChunkKey(key){
 if(typeof key!=='string'||!/^(-?\d+),(-?\d+)$/.test(key))throw TypeError('Invalid chunk key');
 const coords=key.split(',').map(Number);if(coords.some(n=>!Number.isInteger(n)||n<-2147483648||n>2147483647)||coords.join(',')!==key)throw TypeError('Invalid chunk coordinates');return coords;
}

// Owns the game state and a native world inside the simulation worker. Chunk
// residency is explicit: callers must provide the confirmed simulation demand.
export const authoritySnapshotFields=Symbol('authoritySnapshotFields');
export function createSimulationAuthority(module,snapshot,chunkKeys,{qualifyAnimalCrop=false,nativeBootstrap=null,raidWaitBindings=null,navigationView=null,compactViewAcks=false,compactPausedAcks=false,compactPhysicsPoses=false,checkpointRaidWaitsOnly=false,compactPresentationPaths=false,prepareTransportSnapshots=false,observeWorldMotion=false,captureHistoricalEvents=false,captureHyenaDiagnostics=true,presentationWorkerHeadingSeed=null,restoringPhysics=false,mudPresentation=false,onTerrainChunk=null,onNativeIntentControlError=null,getTerrainManifest=null}={}){
  if(onNativeIntentControlError!==null&&typeof onNativeIntentControlError!=='function')throw TypeError('Invalid native intent control error handler');
  if(getTerrainManifest!==null&&typeof getTerrainManifest!=='function')throw TypeError('Invalid native terrain manifest provider');
 if(!(module instanceof WebAssembly.Module)||typeof snapshot!=='string'||!Array.isArray(chunkKeys)||new Set(chunkKeys).size!==chunkKeys.length||typeof checkpointRaidWaitsOnly!=='boolean'||typeof compactPresentationPaths!=='boolean'||typeof prepareTransportSnapshots!=='boolean'||typeof observeWorldMotion!=='boolean'||typeof captureHistoricalEvents!=='boolean'||typeof captureHyenaDiagnostics!=='boolean'||typeof mudPresentation!=='boolean'||onTerrainChunk!==null&&typeof onTerrainChunk!=='function')throw TypeError('Invalid simulation authority initialization');
 for(const key of chunkKeys)parseSimulationChunkKey(key);
 const tutorialGuideTracker=createTutorialGuideRevision(),game=(restoringPhysics?deserializeConfirmedState:deserialize)(snapshot),loaded=new Map(),savedWaitBindings=game.workerRaidWaitBindings??null,presentationHeadings=presentationWorkerHeadingSeed===null?null:createPresentationWorkerHeadings(presentationWorkerHeadingSeed,{initialWorkerIds:game.workers.map(worker=>worker.id)});delete game.workerRaidWaitBindings;delete game.workerPhysicsCheckpoint;delete game.workerNativeAuthorityCheckpoint;let session,stopTasks,stopWorld,stopEvents,stopSettlements,physics=null,physicsInitializing=false,tutorial=null,closed=false,sequence=0,events=[],settlements=[],trackMicroIncome=false,trackedActor=null,trackMotionPeers=false,trackWorldMotion=observeWorldMotion,stopMotion=null,motionSegments=null,terrainGeneration=0,reportedTerrainGeneration=0;
  let guardianMetadata=null,guardianMetadataFailure=null,guardianTerrainEpoch=null,guardianTerrainManifest=null,activeHistoricalCapture=null;
  let nativeIntentControl=null;
  let nativeResourcePreparation=null;
  let pendingNativeWorldResources=[];
  let nativeBodies=null,nativeProduction=null,nativeBirthRevision=null,nativeBirthsPending=false;
  const nativeMarkers=new Set(['native-idle','pending-idle-resources','native-idle-stroll','pending-stroll-resources','native-home','pending-home-resources','native-task','pending-resources','native-action','pending-action-resources','pending-farm-arrival-resources','native-farm-arrival','native-farm-arrival-held']);
  const nativeRestoration=game.workers.some(worker=>nativeMarkers.has(worker.nativeRouteAdmission));
  const nativeGateOwners=game.structures.filter(s=>s.gate&&s.status!=='ruined');
  const nativeRosterSupported=nativeRestoration&&!game.raid&&nativeGateOwners.every(s=>s.kind==='wall'&&s.status==='intact'&&Number.isFinite(s.maxHp)&&s.hp>0&&s.hp<=s.maxHp&&nativeGateModelId(s.material))&&game.workers.every(worker=>nativeMarkers.has(worker.nativeRouteAdmission)||worker.status==='home');
 try{
  const withMud=data=>mudPresentation&&session.field.c.biome==='mangrove'?{...data,mudInputs:captureMudInputs(session.field,data.cx,data.cz,data.terrain.positions)}:data;
  const acceptChunk=raw=>{const data=withMud(raw);loaded.set(`${data.cx},${data.cz}`,data);terrainGeneration++;onTerrainChunk?.(data,game.elapsed);};
  session=createSpatialGameSession(module,game,{nativeBootstrap,loaded:()=>loaded,onData:acceptChunk,onRelease:(cx,cz,metadata)=>{
    // Ordinary native retention keeps its existing presentation policy. Only
    // a committed physical proposal publishes a graphical tombstone here.
    if(metadata?.nativeWorldBoundary){terrainGeneration++;onTerrainChunk?.({authority:'spatial-wasm',cx,cz,removed:true},game.elapsed);}
  }});
  for(const key of chunkKeys){const [x,z]=parseSimulationChunkKey(key);if(session.core.selectChunk(x,z)<0&&session.core.addChunk(x,z)<0)throw Error('Could not add simulation chunk '+key);session.stream.onData(session.core.chunkPayload());}
  // Reuse the session's identity registry, once, before restoring declarations.
  // Binding never republishes or upserts a body after native execution owns it.
  if(nativeRosterSupported)nativeBodies=createSpatialDynamicBodies(session.core.wasm);
  const planner=createEventDrivenTaskPlanner(session,{onNativeAnimalDeparted:(actor,body)=>{
    if(nativeBodies?.id(actor)!==body||!nativeBodies.remove(actor))throw Error('Departing native animal lost its registered body');
  },onNativeWorldResources:resources=>{
    // The published boundary carries wall occupancy and worker stops. Empty
    // receipts for those changes do not invalidate the terrain or vegetation.
    const preservesTerrain=[2,12,24,25].includes(resources.kind)&&resources.removed.length===0;
    if(!preservesTerrain&&!resources.chunks.length)terrainGeneration++;
    pendingNativeWorldResources.push({version:1,worldBoundary:resources.worldBoundary,kind:resources.kind,
      chunks:resources.chunks.map(({cx,cz})=>({cx,cz})),removed:resources.removed.map(point=>({...point})),...(resources.kind===2?{nativeBarrierAdditionBinding:resources.nativeBarrierAdditionBinding}:{})});
  }});planner.resetFromState(game);
  nativeIntentControl=createNativeIntentControlCohort({observe:planner.observeNativeIntentControl,
    onError:error=>onNativeIntentControlError?.(error)});
  const nav=createSpatialNavigationMovement(session,game);stopTasks=planner.observeTasks(game);stopWorld=planner.observeWorld(game);nav.intentTaskPlanner=planner;nav.raidEntryResident=(entry,radii)=>[...raidEntryChunks(entry,radii)].every(key=>loaded.has(key));if(raidWaitBindings!==null||savedWaitBindings!==null)restoreRaidWaitBindings(game,nav,raidWaitBindings??savedWaitBindings);
  function projectNativeGateLeaves(){
   const active=game.structures.filter(structure=>structure.gate&&structure.status!=='ruined');
   if(active.length!==nativeGateOwners.length||active.some(gate=>!nativeGateOwners.includes(gate)))throw Error('Native gate projection has another structure owner');
   for(const gate of nativeGateOwners){
    const pose=planner.nativeGateMechanismPose(gate.id);
    if(!pose||pose.sampledAt!==game.elapsed||gate.status!=='intact'||!Number.isFinite(gate.maxHp)||!(gate.hp>0&&gate.hp<=gate.maxHp))throw Error('Native gate projection lost its current mechanism');
    gate.gateOpen=pose.opening;
   }
  }
  if(nativeBodies){
   const bindings=createSpatialGateIntents(session,game);
   for(const worker of game.workers)if(worker.status!=='home'){
    const body=nativeBodies.publish(worker.id,{x:worker.x,z:worker.z,radius:WORKER_SPATIAL_PROFILE.radius,kind:0,flags:1});
    if(!bindings.bindWorker(worker.id,body))throw Error('Native restored worker body binding rejected');
   }
   if(nativeGateOwners.length){
    // Bootstrap only: establish the original native mechanism before any GPU
    // consumer or causal clock. A saved absence of gateOpen is resolved by
    // native occupancy, never by assuming the gate is closed over a body.
    for(const gate of nativeGateOwners)if(!bindings.register(gate))throw Error('Native restored gate registration rejected');
    if(bindings.reconcile({enabled:true}).status!=='updated'||bindings.reconcile({enabled:false}).status!=='updated')throw Error('Native restored gate occupancy unavailable');
    for(const gate of nativeGateOwners){
     const installed=bindings.installMechanism(gate.id,gate.material,{navigationBarriers:session.wallBarrierIds(gate.id)});
     if(installed.status!=='installed')throw Error('Native restored gate mechanism rejected: '+installed.status);
    }
    nav.projectNativeGateLeaves=projectNativeGateLeaves;
    nav.projectNativeGateLeaves();
   }
   if(planner.commitNativeCausalClock().status!=='committed')throw Error('Native restored body clock unavailable');
   installNativeProduction();
  }
  function installNativeProduction(){
   nativeProduction=createNativeIntentProduction({state:game,planner,bodyId:id=>nativeBodies.id(id),getPublication:()=>nativeIntentControl,getResources:()=>nativeResourcePreparation,publicationSequence:()=>sequence,terrainManifest:()=>getTerrainManifest?.()??null,stationaryTaskNavigation:nav,restoreRuinedWall:restoreNativeRuinedWall,ruinedWallWakeKey:nativeRuinedWallWakeKey,onError:error=>onNativeIntentControlError?.(error)});
  }
  function prepareColdNativeCrop(){
   if(nativeBodies||restoringPhysics||physicsInitializing||physics?.actorIds.length||!session.core.wasm.nav_animal_crop_state)return;
   const animal=game.raid?.animals[0];
   if(!animal||!nativeCropRouteSubject(game,animal)||nativeGateOwners.length||!game.workers.every(w=>planner.nativeWorkerHomeInactive(w.id))||
      session.core.wasm.spatial_body_count()!==0)return;
   // This endpoint explicitly asks for native draw control. Bootstrap only an
   // unchanged resting animal before the first advance of this saved route.
   const bodies=createSpatialDynamicBodies(session.core.wasm);
   try{
    const body=bodies.publish(animal.id,{x:animal.x,z:animal.z,radius:animal.radius,kind:1,flags:1});
    if(!planner.requestNativeAnimalCropRoute(game,animal,body)){bodies.dispose();return;}
    nativeBodies=bodies;
    if(planner.commitNativeCausalClock({paused:game.pauses.length>0}).status!=='committed')throw Error('Native crop request lacks its causal clock');
    installNativeProduction();
   }catch(error){if(nativeBodies!==bodies)bodies.dispose();throw error;}
  }
  function admitPendingNativeBirths({force=false}={}){
   if(!nativeBodies||!nativeBirthsPending)return;
   const dependency=()=>`${nativeBodies.revision()}:${session.core.wasm.nav_intent_transition_sequence()}`;
   const revision=dependency();if(!force&&revision===nativeBirthRevision)return;
   const bindings=createSpatialGateIntents(session,game);let changed=false,pending=false;
   for(const worker of game.workers){
    if(nativeBodies.id(worker.id)!==undefined)continue;
    const source=worker.nativeRouteAdmission==='pending-farm-arrival-resources'?planner.projectNativeFarmArrivalDeclaration(game,worker):worker.nativeRouteAdmission==='pending-home-resources'?planner.nativeHomeDeclarationReference(worker.id):worker.nativeRouteAdmission==='pending-resources'?planner.pendingTaskRoute(worker.id):null;
    if(!source)continue;
    const origin=source.pose??source.origin;if(origin.x!==worker.x||origin.z!==worker.z)throw Error('Native newborn differs from its declared origin');
    const body=nativeBodies.admit(worker.id,{x:worker.x,z:worker.z,radius:WORKER_SPATIAL_PROFILE.radius,kind:0,flags:1});
    if(body===null){pending=true;continue;}
    if(!bindings.bindWorker(worker.id,body))throw Error('Native newborn body binding rejected');changed=true;
   }
   nativeBirthsPending=pending;nativeBirthRevision=dependency();
   if(changed){const clock=planner.nativeCausalClock();if(!['committed','unchanged'].includes(planner.commitNativeCausalClock({rate:clock?.rate??1,paused:!!game.pauses.length||!!game.result}).status))throw Error('Native newborn body clock unavailable');}
  }
  function setNavigationView(view){if(!view||!Array.isArray(view.bounds)||![view.eye?.x,view.eye?.z,view.target?.x,view.target?.z].every(Number.isFinite))throw TypeError('Invalid navigation view');nav.setActiveBounds(view.bounds);nav.setRaidView(view.eye,view.target);}
  if(navigationView!==null)setNavigationView(navigationView);
  function residency(){const required=[...new Set([...raidResidentDemand(game,nav),...workerChunkDemand(game)])].sort();return {required,missing:required.filter(key=>!loaded.has(key))};}
  // Cinematic presentation is not restorable; do not persist its transient pause.
  function saveAvailable(){return !game.pauses.includes('campaign-cinematic')&&confirmedStateSaveAvailable(game);}
  stopSettlements=observeSettlements(game.ledger,(id,n,d)=>settlements.push({id,n,d,simulationTime:game.elapsed,eventSequence:game.sequence}));
  stopEvents=observeGameEvents(game,event=>{events.push(structuredClone(event));if(trackMicroIncome&&(event.type==='Dawn'||event.type==='CrateDelivered'))trackIncome(game,[event]);if(activeHistoricalCapture)try{activeHistoricalCapture.event(game,event,events);}catch{activeHistoricalCapture.invalidate();}});
  const presentationJournal=createPresentationLifecycleJournal(game,observeGameEvents);
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
  let nativeStructurePreparation=null,nativeStructureFailure=null;
  const structureIdentity=command=>JSON.stringify(command.kind==='buildWallChain'?{kind:command.kind,id:command.id,material:command.material,points:command.points,options:command.options,capacityLimit:command.capacityLimit}:
    ['bless','removeWall'].includes(command.kind)?{kind:command.kind,id:command.id,targetId:command.targetId}:{kind:command.kind,id:command.id,structure:command.structure});
  function nativeBlessingWorkers(targetId){
    if(!nativeBodies)return [];
    const tasks=new Set(game.tasks.filter(task=>task.targetId===targetId&&task.workerId).map(task=>task.id));
    return game.workers.filter(worker=>tasks.has(worker.taskId)&&nativeBodies.id(worker.id)!==undefined&&
      ['pending-resources','native-task','pending-action-resources','native-action'].includes(worker.nativeRouteAdmission));
  }
  function quoteBlessing(command){
    if(typeof command.id!=='string'||!command.id||typeof command.targetId!=='string'||!command.targetId)throw TypeError('Invalid blessing command');
    if(game.commandIds.includes(command.id)||Object.hasOwn(game.ledger.entries,command.id))return {duplicate:true};
    if(!permission(game,'awakening'))return {rejection:'Esta acción no está disponible ahora'};
    const draft=previewBlessing(game,command.targetId);
    if(!draft.valid)return {rejection:draft.reason};
    const a=awakeningState(game);
    return a.enabled===false||a.progress<AWAKENINGS.maximum?{rejection:'El Despertar todavía está recargando.'}:{};
  }
  // Once a native world is acquired, ordinary eager loading cannot publish a
  // new region without its prepared resource receipt. Leave cold admission
  // pending, before either purchase or a terrain mutation, rather than stamp
  // these unrelated chunks with the actor's stop24 boundary.
  const withStructureChunks=(operation,chunks)=>nativeBodies?operation():withResidentChunks(operation,chunks);
  const coldStructureRejection=error=>({rejection:'La construcción necesita preparar las regiones de terreno',missingNativeChunks:error.missing});
  function quoteStructureCommand(command,chunks){
    if(command.kind==='buildWallChain'){
      if(typeof command.id!=='string'||!command.id||typeof command.material!=='string'||!command.material||!Array.isArray(command.points)||command.capacityLimit!==undefined&&typeof command.capacityLimit!=='boolean'||command.options!==undefined&&(!command.options||typeof command.options!=='object'||Array.isArray(command.options)||Object.hasOwn(command.options,'preparedPlan')||command.capacityLimit&&Object.hasOwn(command.options,'maxPieces')))throw TypeError('Invalid wall chain command');
      if(game.commandIds.includes(command.id)||Object.hasOwn(game.ledger.entries,command.id))return {plan:null};
      let options=command.options??{},plan;
      try{if(command.capacityLimit){const maxPieces=wallCapacity(game,command.material);if(!maxPieces)throw Error(RESERVE_MESSAGE);options={...options,maxPieces};}plan=withStructureChunks(()=>previewWallChain(game,command.material,command.points,nav,options),chunks);if(plan.pieces.length)ensurePurchaseBudget(game,plan.cost);}
      catch(error){if(error instanceof SpatialChunkUnavailable&&nativeBodies)return coldStructureRejection(error);if(error?.code!=='hiring-reserve'&&error?.message!==RESERVE_MESSAGE&&!['Esta acción no está disponible ahora','No hay monedas suficientes para todo el trazado','Trazado de muralla inválido','Material desconocido'].includes(error?.message))throw error;return {rejection:error.message};}
      return {plan:plan.pieces.length?plan:null,options};
    }
    if(command.kind!=='placeStructure'||typeof command.id!=='string'||!command.id||!command.structure||typeof command.structure!=='object'||Array.isArray(command.structure)||!Number.isFinite(command.structure.x)||!Number.isFinite(command.structure.z))throw TypeError('Invalid structure command');
    if(game.commandIds.includes(command.id)||Object.hasOwn(game.ledger.entries,command.id))return {plan:null};
    let plan;try{plan=withStructureChunks(()=>prepareResidentStructure(command.structure),chunks);if(plan&&!permission(game,plan.kind==='center'?'center':'wall'))throw new StructurePlacementError('Esta acción no está disponible ahora');if(plan)ensurePurchaseBudget(game,plan.cost);}
    catch(error){if(error instanceof SpatialChunkUnavailable&&nativeBodies)return coldStructureRejection(error);if(!(error instanceof StructurePlacementError)&&error?.code!=='hiring-reserve'&&error?.message!=='Material desconocido')throw error;return {rejection:error.message};}
    return {plan};
  }
  function inspectStructureStops(plan){
    if(!nativeBodies||!plan)return {status:'ready',actors:[]};
    if(plan.kind==='center')return planner.inspectNativeStructureStops(3,centerFootprint(plan.entity,game).footprint.flatMap(p=>[p.x,p.z]));
    const pieces=plan.pieces??[plan.entity],barriers=pieces.flatMap(spatialStructureBarriers);
    return planner.inspectNativeStructureStops(2,barriers.flatMap(b=>[b.x,b.z,b.halfX,b.halfZ,b.yaw,b.passMask??0]));
  }
  // Initial native scope: an ordinary, resident batch of new solid walls.
  // Preview remains Game's existing quote; no placement rules are reimplemented.
  function nativeSolidWallQuote(quoted){
    const plan=quoted.plan;
    if(!plan||!Array.isArray(plan.pieces)||!plan.pieces.length||plan.pieces.length>256||plan.pieces.some(p=>p.kind!=='wall'||p.gate||p.status!=='intact')||plan.updates.length||plan.gates||plan.repairableRuins.length||plan.suppressed.some(key=>!game.suppressed.includes(key)))return null;
    const additions=plan.pieces.map(piece=>{const parts=spatialStructureBarriers(piece);if(parts.length!==1||(parts[0].passMask??0)!==0)throw Error('Native solid wall quote changed shape class');const p=parts[0];return {entityId:piece.id,x:Math.fround(p.x),z:Math.fround(p.z),halfX:Math.fround(p.halfX),halfZ:Math.fround(p.halfZ),yaw:Math.fround(p.yaw),passMask:0};});
    return {quoted,additions,signature:JSON.stringify({pieces:plan.pieces,cost:plan.cost,updates:plan.updates,suppressed:plan.suppressed,repairableRuins:plan.repairableRuins})};
  }
  function nativeStructureQuote(quoted){
    const plan=quoted.plan,entity=plan?.entity;
    if(!entity?.gate)return nativeSolidWallQuote(quoted);
    const modelId=nativeGateModelId(entity.material);
    if(entity.kind!=='wall'||entity.status!=='intact'||!modelId||plan.suppression.some(key=>!game.suppressed.includes(key))||coincidentRuins(game,[entity]).length)return null;
    const scale=gateScale(entity),gate={entityId:entity.id,modelId,x:entity.x,z:entity.z,yaw:entity.yaw??0,sx:scale*(entity.baseScaleX??1),sz:scale};
    return {quoted,gate,signature:JSON.stringify({entity,gate,cost:plan.cost,suppression:plan.suppression})};
  }
  const nativeCommandOwnerCurrent=owner=>!closed&&nativeStructurePreparation===owner&&!owner.controller.signal.aborted&&
    owner.control===nativeIntentControl&&owner.resources===nativeResourcePreparation&&!!owner.control&&!owner.control.status().closed&&owner.resources?.status().phase==='running';

  function prepareNativeCommandCommit(owner,operation,{label,rejection}){
    return new Promise((ready,reject)=>{
      let commitReady;
      owner.commitReady=new Promise(resolve=>{commitReady=resolve;});
      const retain=async(handle,signal)=>{
        try{
          // Keep READY resources retained until the existing authority FIFO
          // admits this command and the consumer reaches its mutation boundary.
          await new Promise((resolve,cancel)=>{
            const cleanup=()=>{signal.removeEventListener('abort',abort);owner.enterCommit=null;};
            const abort=()=>{cleanup();cancel(new DOMException(`${label} cancelled`,'AbortError'));};
            owner.enterCommit=()=>{cleanup();resolve();};
            signal.addEventListener('abort',abort,{once:true});
            if(signal.aborted){abort();return;}
            owner.ready=true;ready({version:1});
          });
          return handle;
        }catch(error){handle.abort();throw error;}
      };
      const atCommitBoundary=consume=>new Promise((resolve,retire)=>{
        if(!nativeCommandOwnerCurrent(owner)){retire(Error(`${label} owner retired`));return;}
        owner.consume=()=>{if(!owner.consume)throw Error(`${label} already consumed`);owner.consume=null;owner.consumed=true;try{return consume();}finally{resolve();}};
        owner.commitBoundarySettled=true;commitReady();
      });
      owner.completion=operation({retain,atCommitBoundary});
      owner.completion.then(result=>{
        if(result.status==='committed-control-failed'){nativeStructureFailure=Error(`${label} ${result.status}: ${result.error}`);onNativeIntentControlError?.(nativeStructureFailure);}
        if(!owner.ready)reject(Error(`${label} preparation ${result.status}`+(result.error?`: ${result.error}`:'')));
        else if(!owner.consume&&!owner.consumed)owner.rejection=`${rejection}: ${result.status}`;
        owner.commitBoundarySettled=true;commitReady();
      },error=>{reject(error);owner.failure=error;commitReady();});
    });
  }

  function prepareNativeBarrierCommit(owner){
    // The preceding stop projected a held Game owner and queued its existing
    // planning notice. Flush that consequence before capturing a new proposal;
    // the next ordinary tick must not discover an older semantic boundary.
    planner.flushTaskEvents();planner.flushNativeIntentControl();
    const first=nativeStructureQuote(quoteStructureCommand(owner.command,[]));
    if(!first)throw Error('Native construction requires an unchanged resident addition quote');
    const resources=owner.resources,manifest=getTerrainManifest?.(),minSequence=sequence;
    if(!resources||!manifest)throw Error('Native solid wall preparation lacks its resource owner');
    let current=first,lastQuoteSequence=sequence,lastQuoteTime=game.elapsed;
    const validate=()=>{
      if(!nativeCommandOwnerCurrent(owner))return false;
      if(lastQuoteSequence!==sequence||lastQuoteTime!==game.elapsed){
        const next=nativeStructureQuote(quoteStructureCommand(owner.command,[]));
        if(!next||next.signature!==first.signature)return false;
        current=next;lastQuoteSequence=sequence;lastQuoteTime=game.elapsed;
      }
      return true;
    };
    return prepareNativeCommandCommit(owner,({retain,atCommitBoundary})=>
      planner.addNativeBarriersAfterGpuQuiescence({...(first.gate?{gate:first.gate}:{additions:first.additions}),getPublication:()=>nativeIntentControl,signal:owner.controller.signal,validate,
        prepareResources:async({resources:proposal,signal})=>{
          const plan=first.quoted.plan,gate=proposal.nativeBarrierAddition.gate;
          if(gate&&Object.entries(first.gate).some(([key,value])=>gate[key]!==value))throw Error('Native gate preparation changed the placement quote');
          const entities=gate?[{...plan.entity,gateOpen:gate.opening}]:plan.pieces;
          const handle=await resources.prepareNativeBarrierAdditionResources(proposal,{signal,minSequence,terrainManifest:manifest,nativeBarrierWallEntities:structuredClone(entities)});
          return retain(handle,signal);
        },
        atCommitBoundary,
        project:proof=>{
          // Check the native result before charging, but apply the mirror only
          // at Game's normal nav.setState seam, after quote validation.
          const quoted=current.quoted,plan=quoted.plan,gate=proof.nativeBarrierAdditionBinding.reference.gate,entity=gate?plan.entity:null;
          if(gate)entity.gateOpen=gate.opening;
          const adopt=session.prepareNativeWallAdditionAdoption(gate?[entity]:plan.pieces,proof),original=nav.setState;
          let adopted=false;
          nav.setState=next=>{
            if(next!==game||adopted)throw Error('Native wall Game projection changed owner');
            adopt();
            adopted=true;
            if(gate){nativeGateOwners.push(entity);nav.projectNativeGateLeaves=projectNativeGateLeaves;}
            return original(next);
          };
          try{
            const placed=gate?commitStructurePlacement(game,owner.command.id,plan,nav):
              buildWallChain(game,owner.command.id,owner.command.material,owner.command.points,nav,{...quoted.options,preparedPlan:plan});
            return placed===true&&adopted;
          }finally{nav.setState=original;}
        }}),{label:'Native wall',rejection:'La construcción cambió durante su preparación'});
  }

  async function prepareNativeBlessingCommand(owner){
    const command=owner.command,quote=quoteBlessing(command),workers=quote.rejection||quote.duplicate?[]:nativeBlessingWorkers(command.targetId);
    const worker=workers[0],task=game.tasks.find(item=>item.id===worker?.taskId);
    const taskMarkers=['pending-resources','native-task','pending-action-resources','native-action'];
    if(workers.length!==1||!taskMarkers.includes(worker.nativeRouteAdmission)||!['initial','water'].includes(task?.kind)||!planner.nativeTaskCancellationSupported()){
      owner.ready=true;return {version:1};
    }
    owner.receipt=await nativeProduction?.quiesce({cancelTask:{actorId:worker.id,taskId:task.id}})??null;
    const manifest=getTerrainManifest?.();
    const valid=()=>{
      if(!nativeCommandOwnerCurrent(owner)||worker.taskId!==task.id||!taskMarkers.includes(worker.nativeRouteAdmission)||task.workerId!==worker.id||
        !game.tasks.includes(task)||nativeBlessingWorkers(command.targetId).length!==1)return false;
      const current=quoteBlessing(command);
      return !current.rejection&&!current.duplicate;
    };
    if(!valid()||!manifest){owner.ready=true;return {version:1};}
    if(worker.nativeRouteAdmission==='pending-resources'){
      const request=planner.pendingTaskRoute(worker.id);
      owner.ready=true;
      if(request)owner.consume=()=>{
        owner.consume=null;owner.consumed=true;
        const accepted=valid()&&planner.cancelNativePendingTaskForBlessing(game,worker,request,()=>bless(game,command.id,command.targetId));
        return {status:accepted?'committed':'stale'};
      };
      return {version:1};
    }
    if(!planner.nativeTaskCancellationSource(worker.id)&&worker.nativeRouteAdmission==='native-task'){
      const minSequence=sequence;
      const stopped=await planner.stopNativeTaskRouteAfterGpuQuiescence({actorId:worker.id,getPublication:()=>nativeIntentControl,
        signal:owner.controller.signal,prepareResources:({resources,signal})=>owner.resources.prepareNativeGateResources(resources,{signal,minSequence,terrainManifest:manifest})});
      if(stopped.status==='committed-control-failed'){
        nativeStructureFailure=Error(`Native Awakening stop ${stopped.status}: ${stopped.error}`);onNativeIntentControlError?.(nativeStructureFailure);throw nativeStructureFailure;
      }
      if(stopped.status==='committed')planner.projectNativeTaskExecution(game,worker);
      // A moving source may reach its true endpoint while Stop25 prepares.
      // Use that actual arrival only when WASM can still attest its owner.
      if(!valid()||!planner.nativeTaskCancellationSource(worker.id)){owner.ready=true;return {version:1};}
    }
    const minSequence=sequence;
    return prepareNativeCommandCommit(owner,({retain,atCommitBoundary})=>planner.startNativeInitialIdleBodyAfterGpuQuiescence({actorId:worker.id,
      getPublication:()=>nativeIntentControl,signal:owner.controller.signal,atCommitBoundary,
      cancelTask:{valid,project:()=>bless(game,command.id,command.targetId)},
      prepareResources:async({resources,signal,deferredStart})=>retain(await owner.resources.prepareNativeInitialIdleBodyResources(resources,{signal,minSequence,terrainManifest:manifest,deferredStart}),signal)
    }),{label:'Native Awakening',rejection:'El cultivo cambió durante la preparación del Despertar'});
  }

  function nativeRuinedWallWakeKey(actorId){
    const worker=game.workers.find(w=>w.id===actorId),task=game.tasks.find(t=>t.id===worker?.taskId),target=game.structures.find(t=>t.id===task?.targetId);
    // Source-scoped rejection uses existing owners' revisions. Clock
    // advance alone is not new evidence for the same completed action.
    return JSON.stringify([nav.version,planner.nativeCausalClock()?.intentSequence,game.ledger.balance,target,
      game.workers.map(w=>[w.id,w.x,w.z,w.status,w.nativeRouteAdmission,w.taskId,w.centerId,w.villageId,w.incapacitated,w.recovery,w.raidReturn]),
      game.villages.map(v=>[v.id,v.entry?.x??v.x,v.entry?.z??v.z])]);
  }
  async function restoreNativeRuinedWall({actorId,getPublication,prepareResources,signal}){
    const worker=game.workers.find(w=>w.id===actorId),source=worker&&planner.nativeTaskActionExecution(actorId);
    const first=source?.completed&&prepareNativeRuinedWallRepair(game,worker,source.binding,nav);
    if(!first)return {status:'unsupported'};
    const snapshot=JSON.stringify(first.target),repaired={...first.target,hp:first.target.maxHp,status:'intact',collapseRemaining:0};delete repaired.wallPresentation;
    const shapes=spatialStructureBarriers(repaired);
    if(shapes.length!==1||(shapes[0].passMask??0)!==0)return {status:'unsupported'};
    const additions=shapes.map(p=>({entityId:repaired.id,x:Math.fround(p.x),z:Math.fround(p.z),halfX:Math.fround(p.halfX),halfZ:Math.fround(p.halfZ),yaw:Math.fround(p.yaw),passMask:0}));
    const impact=()=>planner.inspectNativeStructureStops(2,additions.flatMap(p=>[p.x,p.z,p.halfX,p.halfZ,p.yaw,0]));
    const affected=impact();
    // Inventory every consumer before acquiring any stop. Repair uses the
    // same Stop24 owner as Build, never an unaccredited route revocation.
    if(affected.status!=='ready'||affected.actors.some(actor=>!planner.nativeFarmArrivalRouteBinding(actor)))return {status:'blocked'};
    planner.flushTaskEvents();planner.flushNativeIntentControl();
    let current=first;
    const validate=()=>{
      if(closed||signal.aborted||nativeStructurePreparation||!game.workers.includes(worker)||JSON.stringify(first.target)!==snapshot)return false;
      const action=planner.nativeTaskActionExecution(actorId);
      if(!action?.completed||action.executedThrough!==game.elapsed||JSON.stringify(action.binding)!==JSON.stringify(source.binding))return false;
      current=prepareNativeRuinedWallRepair(game,worker,action.binding,nav);
      // The stage/revalidation of this same native kind2 proposal checks all
      // current bodies and routes. A second stop inventory while it is pending
      // would be busy; it cannot stand in for that native transaction check.
      return !!current&&current.task===first.task&&current.target===first.target;
    };
    try{
      for(const actor of affected.actors){
        if(!validate())return {status:'stale'};
        await stopNativeStructureActors({controller:{signal}},{status:'ready',actors:[actor]});
      }
    }catch(error){if(signal.aborted)return {status:'control-failed',error:String(error?.message??error)};throw error;}
    if(!validate())return {status:'stale'};
    // A stopped body remains held even if this later acquisition is cancelled.
    // The ordinary producer owns its fresh Farm continuation after settlement.
    planner.flushTaskEvents();planner.flushNativeIntentControl();
    const remaining=impact();if(remaining.status!=='ready'||remaining.actors.length)return {status:'blocked'};
    return planner.addNativeBarriersAfterGpuQuiescence({additions,getPublication,signal,validate,
      prepareResources:({resources,signal})=>prepareResources({resources,signal,nativeBarrierWallEntities:[repaired]}),
      project:proof=>{
        const adopt=session.prepareNativeWallAdditionAdoption([repaired],proof),original=nav.setState;let adopted=false;
        nav.setState=next=>{if(next!==game||adopted)throw Error('Native Repair adoption owner changed');adopt();adopted=true;return original(next);};
        try{return projectNativeRuinedWallRepair(game,worker,current,nav)&&adopted;}finally{nav.setState=original;}
      }
    });
  }

  async function stopNativeStructureActors(owner,impact){
    if(impact.status!=='ready')throw Error('Native structure stop query '+impact.status);
      // Reject unsupported consumers before stopping any actor. No JS route
      // approximation may decide whether a native trajectory is affected.
      for(const actor of impact.actors)if(!planner.nativeFarmArrivalRouteBinding(actor))throw Error('Native structure preflight requires an unsupported route stop');
      for(const actor of impact.actors){
        if(planner.nativeFarmArrivalHeldExecution(actor))continue;
        if(!planner.nativeFarmArrivalRouteBinding(actor))throw Error('Native structure route source changed');
        const resources=nativeResourcePreparation,manifest=getTerrainManifest?.(),minSequence=sequence;
        if(!resources||!manifest)throw Error('Native structure preparation lacks its resource owner');
        const stopped=await planner.stopNativeFarmArrivalAfterGpuQuiescence({actorId:actor,getPublication:()=>nativeIntentControl,signal:owner.controller.signal,
          prepareResources:({resources:proposal,signal})=>resources.prepareNativeGateResources(proposal,{signal,minSequence,terrainManifest:manifest})});
        if(stopped.status!=='committed'){
          const error=Error('Native structure stop '+stopped.status+(stopped.error?': '+stopped.error:''));
          if(stopped.status==='committed-control-failed'){nativeStructureFailure=error;onNativeIntentControlError?.(error);}
          throw error;
        }
        for(const worker of game.workers)if(planner.nativeFarmArrivalHeldExecution(worker.id))planner.projectNativeFarmArrivalExecution(game,worker);
      }
  }
  function quoteNativeGateRemoval(command){
    if(typeof command.id!=='string'||!command.id||typeof command.targetId!=='string'||!command.targetId)throw TypeError('Invalid wall removal command');
    if(game.commandIds.includes(command.id)||Object.hasOwn(game.ledger.entries,command.id))return {duplicate:true};
    if(!permission(game,'wall'))return {rejection:'Esta acción no está disponible ahora'};
    const target=game.structures.find(s=>s.id===command.targetId&&s.kind==='wall');
    if(!target)return {rejection:'No existe esa defensa'};
    if(!nativeGateOwners.includes(target)||target.status!=='intact'||!nativeGateModelId(target.material)||target.wallPresentation||game.tasks.some(t=>t.targetId===target.id&&t.workerId))return {rejection:'La retirada nativa necesita una puerta intacta sin reparación adquirida'};
    const {gateOpen,...identity}=target;
    return {target,signature:JSON.stringify(identity)};
  }
  async function prepareNativeGateRemovalCommand(owner){
    const target=game.structures.find(s=>s.id===owner.command.targetId&&s.kind==='wall');
    // The new handshake must not intercept ordinary solid/legacy removal.
    if(!nativeBodies||!nativeGateOwners.includes(target)){owner.ready=true;return {version:1};}
    owner.receipt=await nativeProduction?.quiesce()??null;
    const first=quoteNativeGateRemoval(owner.command);
    if(first.rejection||first.duplicate){owner.rejection=first.rejection;owner.ready=true;return {version:1};}
    await stopNativeStructureActors(owner,planner.inspectNativeGateRemovalStops(first.target.id));
    planner.flushTaskEvents();planner.flushNativeIntentControl();
    const validate=()=>{if(!nativeCommandOwnerCurrent(owner))return false;const next=quoteNativeGateRemoval(owner.command);return next.target===first.target&&next.signature===first.signature;};
    if(!validate())throw Error('Native gate removal changed during stop');
    const manifest=getTerrainManifest?.(),minSequence=sequence;if(!manifest||!owner.resources)throw Error('Native removal lacks its resource owner');
    return prepareNativeCommandCommit(owner,({retain,atCommitBoundary})=>planner.addNativeBarriersAfterGpuQuiescence({
      removal:{entityId:first.target.id},getPublication:()=>nativeIntentControl,signal:owner.controller.signal,validate,atCommitBoundary,
      prepareResources:async({resources,signal})=>retain(await owner.resources.prepareNativeBarrierAdditionResources(resources,{signal,minSequence,terrainManifest:manifest,nativeBarrierWallEntities:[structuredClone(first.target)]}),signal),
      project:proof=>{
        const adopt=session.prepareNativeWallRemovalAdoption(first.target,proof),original=nav.setState;let adopted=false;
        nav.setState=next=>{if(next!==game||adopted)throw Error('Native removal Game owner changed');adopt();adopted=true;const index=nativeGateOwners.indexOf(first.target);if(index<0)throw Error('Native gate owner disappeared');nativeGateOwners.splice(index,1);return original(next);};
        try{return removeWall(game,owner.command.id,owner.command.targetId,nav)===true&&adopted;}finally{nav.setState=original;}
      }
    }),{label:'Native gate removal',rejection:'La retirada cambió durante su preparación'});
  }
  async function prepareNativeStructureCommand(command){
    if(closed||nativeStructurePreparation||nativeStructureFailure)throw Error('Native structure preparation unavailable');
    const captured=structuredClone(command),owner={command:captured,identity:structureIdentity(captured),receipt:null,ready:false,controller:new AbortController(),control:nativeIntentControl,resources:nativeResourcePreparation};nativeStructurePreparation=owner;
    try{
      if(captured.kind==='bless')return await prepareNativeBlessingCommand(owner);
      if(captured.kind==='removeWall')return await prepareNativeGateRemovalCommand(owner);
      // Dispatch is held; authority commands and native execution keep running.
      owner.receipt=await nativeProduction?.quiesce()??null;
      if(closed||nativeStructurePreparation!==owner)throw Error('Native structure preparation retired');
      const quoted=quoteStructureCommand(captured,[]),{plan,missingNativeChunks}=quoted;
      if(missingNativeChunks)throw Error('Native structure requires prepared regions: '+missingNativeChunks.map(p=>`${p.cx},${p.cz}`).join(';'));
      const nativeQuote=nativeBodies?nativeStructureQuote(quoted):null;
      if(nativeBodies&&(!plan||quoted.rejection||!nativeQuote)){
        owner.rejection=quoted.rejection??'La construcción nativa necesita un muro sólido o una puerta compatible en regiones residentes';
        owner.ready=true;return {version:1};
      }
      // A new gate changes the certified corridor even when its passage proxy
      // permits workers. Query the native mechanism; reuse the existing Stop24
      // handoff and kind2 acquisition, retaining the same body throughout.
      const impact=nativeQuote?.gate?planner.inspectNativeGateAdditionStops(nativeQuote.gate):inspectStructureStops(plan);
      if(impact.status!=='ready')throw Error('Native structure preflight '+impact.status);
      await stopNativeStructureActors(owner,impact);
      if(closed||nativeStructurePreparation!==owner)throw Error('Native structure preparation retired');
      if(nativeBodies)return await prepareNativeBarrierCommit(owner);
      owner.ready=true;return {version:1};
    }catch(error){if(nativeStructurePreparation===owner)await releaseNativeStructureCommand(owner);throw error;}
  }
  // Called by the existing authority Worker only after this command reaches
  // the runtime/client FIFO head. No purchase or sequence is consumed here.
  async function beginNativeStructureCommand(command){
    if(!command||!['buildWallChain','placeStructure','bless','removeWall'].includes(command.kind)||command.sequence!==sequence+1)throw Error('Native structure command is not the FIFO head');
    const owner=nativeStructurePreparation;
    if(owner?.commandSequence!==undefined)throw Error('Native structure command already entered');
    if(!owner?.ready||owner.identity!==structureIdentity(command)||!owner.enterCommit)return;
    owner.commandSequence=command.sequence;
    owner.enterCommit();
    await owner.commitReady;
    if(closed||nativeStructurePreparation!==owner)throw Error('Native structure command retired before execution');
    if(owner.failure)throw owner.failure;
  }
  async function releaseNativeStructureCommand(owner){
    if(!owner.consumed)owner.controller.abort();
    try{await owner.completion;}finally{owner.controller.abort();if(nativeStructurePreparation===owner)nativeStructurePreparation=null;}
    if(!closed&&!nativeStructureFailure&&nativeProduction&&owner.receipt!==null)nativeProduction.resume(owner.receipt);
    return {version:1};
  }
  function finishNativeStructureCommand(command){
    const owner=nativeStructurePreparation;
    if(!owner?.ready||owner.identity!==structureIdentity(command))throw Error('Native structure release identity mismatch');
    return releaseNativeStructureCommand(owner);
  }

  // Initial chunks are published separately at sequence zero. Later callback
  // deliveries, including those during asynchronous preparation or failed
  // commands, belong to the next successful authority publication.
  reportedTerrainGeneration=terrainGeneration;let hasPublishedSnapshot=false;
  function takeTerrainChanged(){const changed=terrainGeneration!==reportedTerrainGeneration;reportedTerrainGeneration=terrainGeneration;return changed;}
  function setGuardianMetadata(metadata){if(closed||!metadata||!Array.isArray(metadata.assets)||!metadata.cropHeights)throw TypeError('Invalid guardian metadata');guardianMetadata=metadata;guardianMetadataFailure=null;}
  function setGuardianMetadataFailure(error){if(closed||typeof error!=='string'||!error)throw TypeError('Invalid guardian metadata failure');guardianMetadata=null;guardianMetadataFailure=error;}
  function requireGuardianMetadata(){if(!guardianMetadata)throw Error(guardianMetadataFailure?`Guardian metadata unavailable: ${guardianMetadataFailure}`:'Guardian metadata unavailable');}
  function setGuardianTerrainEpoch(epoch,manifest=null){if(closed||epoch!==null&&(typeof epoch!=='string'||!epoch)||manifest!==null&&(manifest?.epoch!==epoch||!Array.isArray(manifest.chunks)))throw TypeError('Invalid guardian terrain epoch');guardianTerrainEpoch=epoch;guardianTerrainManifest=manifest===null?null:structuredClone(manifest);}
  return {
    prepareNativeStructureCommand,beginNativeStructureCommand,finishNativeStructureCommand,
    async attachNativeResourcePreparation(port,transportSession){
      if(closed||nativeResourcePreparation&&!['closed','failed'].includes(nativeResourcePreparation.status().phase))throw Error('Native resource attachment unavailable');
      nativeResourcePreparation?.dispose();
      const connection=createNativeResourcePreparationConnection({port,session:transportSession});nativeResourcePreparation=connection;
      try{const ready=await connection.ready;nativeProduction?.wake();return ready;}catch(error){if(nativeResourcePreparation===connection)nativeResourcePreparation=null;connection.dispose();throw error;}
    },
    nativeResourcePreparationStatus:()=>nativeResourcePreparation?.status()??null,
    flushNativeResourcePreparation({allowRetired=false}={}){
      if(closed)return Promise.reject(Error('Simulation authority is closed'));
      if(typeof allowRetired!=='boolean')return Promise.reject(TypeError('Invalid native resource recovery mode'));
      if(allowRetired&&nativeProduction&&nativeProduction.status().phase!=='suspended')return Promise.reject(Error('Native resource retirement requires suspended production'));
      return (allowRetired?nativeResourcePreparation?.settleForRecovery():nativeResourcePreparation?.flush())??Promise.resolve(null);
    },
    nativeIntentProductionStatus:()=>nativeProduction?{...nativeProduction.status(),publicationSequence:sequence}:{phase:nativeRestoration?'unsupported-cohort':'inactive',fault:null,active:null,last:null},
    quiesceNativeIntentProduction(){
      if(nativeStructurePreparation)return Promise.reject(Error('Native production is held by a structure command'));
      if(closed)return Promise.reject(Error('Simulation authority is closed'));
      return nativeProduction?.quiesce()??Promise.resolve(null);
    },
    resumeNativeIntentProduction(receipt){
      if(closed)throw Error('Simulation authority is closed');
      if(nativeProduction)return nativeProduction.resume(receipt);
      if(receipt!==null)throw TypeError('Invalid native production quiescence receipt');
      return true;
    },
    prepareNativeGateResources(resources,options){
      if(closed||!nativeResourcePreparation)return Promise.reject(Error('Native resource preparation unavailable'));
      return nativeResourcePreparation.prepareNativeGateResources(resources,options);
    },
    prepareNativeResumeResources(resources,options){
      if(closed||!nativeResourcePreparation)return Promise.reject(Error('Native resource preparation unavailable'));
      return nativeResourcePreparation.prepareNativeResumeResources(resources,options);
    },
    prepareNativeTaskActionResources(resources,options){
      if(closed||!nativeResourcePreparation)return Promise.reject(Error('Native resource preparation unavailable'));
      return nativeResourcePreparation.prepareNativeTaskActionResources(resources,options);
    },
    prepareNativeTaskStartResources(resources,options){
      if(closed||!nativeResourcePreparation)return Promise.reject(Error('Native resource preparation unavailable'));
      return nativeResourcePreparation.prepareNativeTaskStartResources(resources,options);
    },
    attachNativeIntentControl(port,transportSession){
      if(closed)return Promise.reject(Error('Native intent control attachment unavailable'));
      if(qualifyAnimalCrop===true)prepareColdNativeCrop();
      return nativeIntentControl.attach(port,transportSession).then(ready=>{nativeProduction?.wake();return ready;});
    },
    nativeIntentControlStatus:()=>nativeIntentControl.connections(),
   setGuardianMetadata,setGuardianMetadataFailure,setGuardianTerrainEpoch,setGuardianMetadataForQa:setGuardianMetadata,setGuardianTerrainEpochForQa:setGuardianTerrainEpoch,farVisualRevision:()=>session.core.farVisualRevision(),
   captureFarVisualState(){
    if(closed||physicsInitializing)throw Error('Far visual snapshot unavailable');
    const snapshot=captureSpatialFarState(session.core);
    return {sequence,elapsed:game.elapsed,revision:snapshot.revision,snapshot};
   },
   // This is a read-only visual query at an exact committed authority
   // boundary. The caller must discard it if a later world revision arrives.
   queryFarVisualChunk({cx,cz,slots=[0,1,2,3],expectedSequence,expectedRevision=null}={}){
    if(closed)throw Error('Simulation authority is closed');
    if(!Number.isSafeInteger(expectedSequence)||expectedSequence<0)throw TypeError('Invalid far visual sequence');
    if(physicsInitializing||expectedSequence>sequence||expectedRevision===null&&expectedSequence!==sequence)return null;
    const result=session.core.queryFarVisualChunk(cx,cz,{slots,expectedRevision});
    return result?{sequence,elapsed:game.elapsed,...result}:null;
   },
   verifyNativeBootstrap(expected){
    if(closed||!expected||![1,2].includes(expected.version)||!Array.isArray(expected.chunkKeys)||!expected.spatialState)throw TypeError('Invalid native bootstrap verification');
    const actual=session.core.captureResidentChunks(),keys=[...expected.chunkKeys].sort();
    if(new Set(keys).size!==keys.length||JSON.stringify([...actual.keys].sort())!==JSON.stringify(keys)||JSON.stringify(session.core.snapshot())!==JSON.stringify(expected.spatialState))throw Error('Native bootstrap reconstruction mismatch');
    if(expected.version===2&&JSON.stringify(session.captureWallOwners())!==JSON.stringify([...expected.wallOwners].sort((a,b)=>a.entityId<b.entityId?-1:a.entityId>b.entityId?1:0)))throw Error('Native bootstrap owner reconstruction mismatch');
    return true;
   },
   async enableBeastPhysics(actorId,{actorIds=undefined,structureTemplates=null,allowEmpty=false,checkpoint=null,shareSpeciesClips=false,shareSpeciesRigs=false,shareAdmissionSource=false}={}){if(closed||physics||physicsInitializing)throw Error('Worker physics unavailable');physicsInitializing=true;try{const {createWorkerBeastPhysics}=await import('./worker-beast-physics.js');const driver=await createWorkerBeastPhysics(game,nav,{actorId,actorIds,structureTemplates,allowEmpty,checkpoint,shareSpeciesClips,shareSpeciesRigs,shareAdmissionSource});if(closed){driver.dispose();throw Error('Simulation authority closed during physics initialization');}physics=driver;}finally{physicsInitializing=false;}},
   async prepareBeastAttack(command){if(closed||physicsInitializing||!physics)throw Error('Worker physics unavailable');if(!command||command.kind!=='castAttack'||command.sequence!==sequence+1||typeof command.id!=='string'||!command.id||typeof command.targetId!=='string'||!command.targetId||!Number.isFinite(command.x)||!Number.isFinite(command.z))throw TypeError('Invalid attack command');if(game.commandIds.includes(command.id)||Object.hasOwn(game.ledger.entries,command.id)||spellRejection(command,'attack'))return false;if(!physics.supports(command.targetId)){physicsInitializing=true;try{return await physics.admit(command.targetId);}finally{physicsInitializing=false;}}return false;},
   execute(command){
    if(closed)throw Error('Simulation authority is closed');if(nativeProduction?.status().fault)throw Error('Native intent production failed: '+nativeProduction.status().fault);if(physicsInitializing)throw Error('Worker physics is initializing');
    if(!command||command.sequence!==sequence+1)throw Error('Simulation command out of order');
    if(nativeStructurePreparation?.commandSequence!==undefined){
      if(command.sequence!==nativeStructurePreparation.commandSequence||nativeStructurePreparation.identity!==structureIdentity(command))throw Error('Native structure FIFO head is occupied');
      if(!nativeStructurePreparation.commitBoundarySettled)throw Error('Native structure command boundary is not ready');
      delete nativeStructurePreparation.commandSequence;
    }
    if(command.captureClockSegments!==undefined&&(command.kind!=='advance'||typeof command.captureClockSegments!=='boolean'))throw TypeError('Invalid clock segment request');
    // A completed native admission may have projected Game since the last
    // publication. Publish that actual boundary atomically; a capture started
    // now cannot certify motion from the preceding, unpublished state change.
    const nativeBoundaryPending=pendingNativeWorldResources.length>0||nativeProduction?.status().last?.publicationSequence===sequence;
    let value=null,rejection=null,stepsExecuted=null,motionTrace=null,worldMotionTrace=null,motionTopologyBefore=null;const eventBoundaries=captureHistoricalEvents&&command.kind==='advance'?createHistoricalEventBoundaryCapture(game):null,commandLoadedChunks=[],previousTrackedActor=trackedActor,wasSuspended=game.pauses.length>0||!!game.result,clockCapture=command.captureClockSegments===true?{version:1,start:game.elapsed,end:game.elapsed,startPauses:[...game.pauses],endPauses:null,complete:true,segments:[]}:null;
    // trackIncome([]) can repair a stale day even when the game is paused.
    // A native owner may commit Game changes asynchronously, including while
    // paused or waiting for ports. Neither an idle slot nor unchanged terrain
    // certifies that its last published snapshot still describes Game.
    const pausedUnchangedCandidate=compactPausedAcks&&nativeProduction===null&&!clockCapture&&hasPublishedSnapshot&&command.kind==='advance'&&command.visualTerrain!==true&&game.pauses.length>0&&!trackedActor&&!trackWorldMotion&&(!physics||physics.actorIds.length===0)&&(!trackMicroIncome||game.microevents?.day===game.day)&&typeof nav.serviceRaidConnectivityDemand!=='function';
    if(command.kind==='advance'){
     if(!Number.isFinite(command.seconds)||command.seconds<=0||command.seconds>1||typeof command.nightFastForward!=='boolean'||command.steps!==undefined&&(!Number.isSafeInteger(command.steps)||command.steps<1||command.steps>256))throw TypeError('Invalid real-time interval');
     const start=trackedActor&&!nativeBoundaryPending?{at:game.elapsed,x:trackedActor.x,z:trackedActor.z}:null;if(start){motionSegments=[];motionTopologyBefore=nav.version;}const peerCapture=start&&trackMotionPeers?captureMotionPeers(game,trackedActor):null,worldCapture=trackWorldMotion&&!nativeBoundaryPending?captureWorldMotion(game,()=>({topology:nav.version,chunks:session.core.chunkRevision(),terrain:session.horizonSource.revision(),payloads:terrainGeneration}),()=>workerPhysicsActivity(physics),{...(command.captureClockSegments===true?{spatialNavigation:nav,...(physics?{readPhysicsPoses:()=>physics.postStepPoses()}:{})}:{}),includeHyenaSamples:captureHyenaDiagnostics}):null;
     const steps=command.steps??1;activeHistoricalCapture=eventBoundaries;try{for(let i=0;i<steps;i++){advanceReal(game,command.seconds,nav,{nightFastForward:command.nightFastForward,...(clockCapture?{onClockSegment:segment=>{if(!clockCapture.complete)return;const previous=clockCapture.segments.at(-1);if(previous&&previous.rate===segment.rate&&previous.end===segment.start){previous.end=segment.end;previous.realDuration+=segment.realDuration;}else if(clockCapture.segments.length<256)clockCapture.segments.push(segment);else{clockCapture.complete=false;clockCapture.segments=[];}}}:{}),...(worldCapture||eventBoundaries?{onTick:()=>{if(worldCapture)try{worldCapture.sampleTick();}catch{worldCapture.invalidateSamples();}if(eventBoundaries)try{eventBoundaries.sample(game,events);}catch{eventBoundaries.invalidate();}}}:{})});peerCapture?.checkpoint();worldCapture?.checkpoint();if(trackMicroIncome)trackIncome(game,[]);nav.serviceRaidConnectivityDemand?.();stepsExecuted=i+1;if(i+1<steps&&residency().missing.length)break;}}finally{activeHistoricalCapture=null;if(clockCapture){clockCapture.end=game.elapsed;clockCapture.endPauses=[...game.pauses];}if(worldCapture)worldMotionTrace=worldCapture.finish();if(start){const end={at:game.elapsed,x:trackedActor.x,z:trackedActor.z},segments=motionSegments;motionSegments=null;let x=start.x,z=start.z,continuous=true,timed=true,lastTime=start.at;for(const segment of segments){if(segment.x0!==x||segment.z0!==z)continuous=false;x=segment.x1;z=segment.z1;if(!Number.isFinite(segment.t0)||!Number.isFinite(segment.t1)||segment.t0<lastTime-1e-8||segment.t1<segment.t0||segment.t1>end.at+1e-8)timed=false;else lastTime=segment.t1;}if(end.x!==x||end.z!==z||!(game.raid?.animals??[]).includes(trackedActor)&&!game.workers.includes(trackedActor))continuous=false;motionTrace={actorId:trackedActor.id,start,end,segments,continuous,timed,...(peerCapture?peerCapture.finish():{})};}}
    }else if(command.kind==='trackPathMotion'){
     if(command.actorId!==null&&(typeof command.actorId!=='string'||!command.actorId)||command.includePeers!==undefined&&typeof command.includePeers!=='boolean'||command.world!==undefined&&typeof command.world!=='boolean'||command.world===true&&(command.actorId!==null||command.includePeers===true))throw TypeError('Invalid motion actor');
     const next=command.actorId===null?null:[...(game.raid?.animals??[]),...game.workers].find(a=>a.id===command.actorId)??null;
     if(command.actorId!==null&&!next){rejection='No existe ese personaje';value=false;}
     else{stopMotion?.();stopMotion=null;trackedActor=next;trackWorldMotion=command.world===true;trackMotionPeers=!!trackedActor&&command.includePeers===true;if(trackedActor)stopMotion=observePathMotion(trackedActor,(x0,z0,x1,z1,t0,t1)=>{if(motionSegments)motionSegments.push({at:game.elapsed,x0,z0,x1,z1,t0,t1});});value=true;}
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
    }else if(command.kind==='raidCameraFocus'){
     if(typeof command.raidId!=='string'||!command.raidId||typeof command.animalId!=='string'||!command.animalId)throw TypeError('Invalid raid camera focus');
     const raid=game.raid,animal=raid?.animals.find(item=>item.id===command.animalId);
     if(!raid||raid.id!==command.raidId||!animal||['gone','retreating'].includes(animal.status)||raid.cameraFocusedAnimalId&&raid.cameraFocusedAnimalId!==animal.id)value=false;
     else{raid.cameraFocusedAnimalId=animal.id;value=true;}
    }else if(command.kind==='tutorialStart'){
     if(tutorial)throw Error('Tutorial already started');tutorial=createWorkerTutorial(game,command.seen);value=tutorial.execute({action:'update',narrating:null});
    }else if(command.kind==='tutorialCommand'){
     if(!tutorial)throw Error('Tutorial not started');value=tutorial.execute(command);
    }else if(command.kind==='tutorialGuideTarget'){
     if(command.trackGuideRevision!==undefined&&typeof command.trackGuideRevision!=='boolean')throw TypeError('Invalid tutorial guide revision request');if(command.trackGuideRevision===false){tutorialGuideTracker.clear();value=null;}else{
     if(!['center','plant','spell'].includes(command.toolKind)||command.toolSpell!==null&&command.toolSpell!==undefined&&!['growth','multiply'].includes(command.toolSpell))throw TypeError('Invalid tutorial guide request');
     if(command.trackGuideRevision===true)tutorialGuideTracker.subscribe(game,{toolKind:command.toolKind,toolSpell:command.toolSpell??null});
     try{value=withResidentChunks(()=>{const config=tutorialHandTarget(game,nav,command.toolKind,command.toolSpell??null);if(!config||command.guardianContext===undefined)return config;const context=command.guardianContext;requireGuardianMetadata();if(!context||typeof context!=='object'||Array.isArray(context)||!guardianTerrainEpoch||context.epoch!==guardianTerrainEpoch)throw Error('Guardian terrain epoch unavailable or stale');const cropHeightInputs=new Map(),origin=queryGuardianTutorialOrigin({state:game,nav,sequence,epoch:context.epoch,terrainManifest:guardianTerrainManifest,publication:context.publication,camera:context.camera,exclusions:context.exclusions,assets:guardianMetadata.assets,cropHeights:guardianMetadata.cropHeights},config,cropHeightInputs);return {...config,origin,cropHeightInputs:[...cropHeightInputs.values()]};},commandLoadedChunks);}catch(error){if(error instanceof SpatialChunkUnavailable)value=null;else if(command.guardianContext!==undefined){rejection=String(error?.message??error);value=null;}else throw error;}
     if(command.trackGuideRevision===true&&value?.cropHeightInputs)tutorialGuideTracker.bindHeights(game,value.cropHeightInputs);}
    }else if(command.kind==='qaGuardianOrigin'){
     try{requireGuardianMetadata();if(!guardianTerrainEpoch||command.epoch!==guardianTerrainEpoch)throw Error('Guardian terrain epoch unavailable or stale');value=withResidentChunks(()=>queryGuardianOrigin({state:game,nav,sequence,epoch:command.epoch,terrainManifest:guardianTerrainManifest,publication:command.publication,camera:command.camera,exclusions:command.exclusions,assets:guardianMetadata.assets,cropHeights:guardianMetadata.cropHeights,targetId:command.targetId}),commandLoadedChunks);}catch(error){rejection=String(error?.message??error);value=false;}
    }else if(command.kind==='tutorialActionPause'){
     if(typeof command.hudTarget!=='boolean'||typeof command.worldTarget!=='boolean'||typeof command.selectionOpen!=='boolean')throw TypeError('Invalid tutorial guidance');
     value=syncTutorialActionPause(game,command);
    }else if(command.kind==='castAttack'){
     if(typeof command.id!=='string'||!command.id||!Number.isFinite(command.x)||!Number.isFinite(command.z))throw TypeError('Invalid attack command');
     rejection=spellRejection(command,'attack');
     let selection=command.selection??{};
     if(!rejection&&command.guardianContext!==undefined&&!game.commandIds.includes(command.id)&&!Object.hasOwn(game.ledger.entries,command.id)){
      try{requireGuardianMetadata();const context=command.guardianContext;if(!context||typeof context!=='object'||Array.isArray(context))throw Error('Invalid guardian context');if(!guardianTerrainEpoch||context.epoch!==guardianTerrainEpoch)throw Error('Guardian terrain epoch unavailable or stale');const origin=withResidentChunks(()=>queryGuardianOrigin({state:game,nav,sequence,epoch:context.epoch,terrainManifest:guardianTerrainManifest,publication:context.publication,camera:context.camera,exclusions:context.exclusions,assets:guardianMetadata.assets,cropHeights:guardianMetadata.cropHeights,targetId:command.targetId}),commandLoadedChunks);selection={...selection,origin};}catch(error){rejection=String(error?.message??error);}
     }
     if(rejection||game.commandIds.includes(command.id)||Object.hasOwn(game.ledger.entries,command.id))value=false;
     else{if(!physics||!physics.supports(command.targetId))throw Error('Target is not supported by worker physics');if(!game.commandIds.includes(command.id))physics.assertEnvironment(command.targetId);value=cast(game,command.id,'attack',command.x,command.z,nav,{...selection,targetId:command.targetId});}
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
    }else if(command.kind==='previewBlessing'){
     if(typeof command.targetId!=='string'||!command.targetId)throw TypeError('Invalid blessing preview target');value=previewBlessing(game,command.targetId);
    }else if(command.kind==='bless'){
     const quote=quoteBlessing(command),owner=nativeStructurePreparation;
     rejection=quote.rejection??null;
     if(!rejection&&!quote.duplicate&&nativeBlessingWorkers(command.targetId).length){
      if(owner?.identity===structureIdentity(command)&&nativeCommandOwnerCurrent(owner)&&owner.consume){
       const result=owner.consume();if(result.status==='committed-control-failed')throw Error(result.error);
       value=result.status==='committed';if(!value)rejection='El cultivo cambió durante la preparación del Despertar.';
      }else{value=false;rejection='El Despertar necesita preparar el relevo del trabajador asignado.';}
     }else value=rejection?false:bless(game,command.id,command.targetId);
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
     const previousWorkers=nativeBodies?new Set(game.workers.map(w=>w.id)):null;
     value=rejection?false:(command.kind==='hire'?hire(game,command.id,command.selection):hireAdditional(game,command.id,command.selection,command.centerId))??null;
     if(previousWorkers){
      planner.flushTaskEvents();
      const newborns=game.workers.filter(worker=>!previousWorkers.has(worker.id)&&worker.status==='arriving');
      for(const worker of newborns)planner.requestNativeFarmArrivalResources(game,worker,{canonical:false});
      if(newborns.length)nativeBirthsPending=true;
      planner.flushTaskEvents();admitPendingNativeBirths({force:newborns.length>0});
     }
    }else if(command.kind==='buildWallChain'||command.kind==='placeStructure'){
     if(nativeBodies){
      const owner=nativeStructurePreparation;
      if(nativeStructureFailure)throw nativeStructureFailure;
      if(!owner?.ready||owner.identity!==structureIdentity(command)||owner.control!==nativeIntentControl||owner.resources!==nativeResourcePreparation||owner.control.status().closed||owner.resources?.status().phase!=='running'){value=false;rejection='La construcción necesita su preparación nativa';}
      else if(owner.rejection||!owner.consume){value=false;rejection=owner.rejection??'La construcción ya no tiene una preparación vigente';}
      else{const result=owner.consume();if(result.status==='committed-control-failed')throw Error(result.error);value=result.status==='committed';if(!value)rejection='La construcción cambió durante su preparación: '+result.status;}
     }else{
     const prepared=quoteStructureCommand(command,commandLoadedChunks);rejection=prepared.rejection??null;
     if(prepared.plan&&!rejection){
      const owner=nativeStructurePreparation;
      if(nativeStructureFailure)throw nativeStructureFailure;
      if(owner&&nativeBodies&&(!owner.ready||owner.identity!==structureIdentity(command)||owner.control!==nativeIntentControl||owner.resources!==nativeResourcePreparation||owner.control.status().closed||owner.resources?.status().phase!=='running'))rejection='La construcción tiene otra preparación pendiente';
      else{const impact=inspectStructureStops(prepared.plan);if(impact.status!=='ready'||impact.actors.length)rejection='La construcción necesita preparar la parada de las rutas afectadas';}
     }
     value=rejection||!prepared.plan?false:command.kind==='buildWallChain'?buildWallChain(game,command.id,command.material,command.points,nav,{...prepared.options,preparedPlan:prepared.plan}):commitStructurePlacement(game,command.id,prepared.plan,nav);
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
     const duplicate=game.commandIds.includes(command.id)||Object.hasOwn(game.ledger.entries,command.id),target=game.structures.find(s=>s.id===command.targetId&&s.kind==='wall');
     if(!duplicate&&!permission(game,'wall'))rejection='Esta acción no está disponible ahora';
     else if(!duplicate&&!target)rejection='No existe esa defensa';
     if(!duplicate&&!rejection&&nativeBodies&&nativeGateOwners.includes(target)){
      const owner=nativeStructurePreparation;if(nativeStructureFailure)throw nativeStructureFailure;
      if(!owner?.ready||owner.identity!==structureIdentity(command)||!nativeCommandOwnerCurrent(owner)||owner.rejection||!owner.consume){value=false;rejection=owner?.rejection??'La retirada de la puerta necesita preparación nativa';}
      else{const result=owner.consume();if(result.status==='committed-control-failed')throw Error(result.error);value=result.status==='committed';if(!value)rejection='La retirada cambió durante su preparación: '+result.status;}
     }else value=rejection?false:removeWall(game,command.id,command.targetId,nav);
    }else if(command.kind!=='snapshot')throw TypeError('Unknown simulation command');
     admitPendingNativeBirths();planner.flushNativeIntentControl();
     const tutorialOnly=['tutorialStart','tutorialCommand','tutorialActionPause','tutorialGuideTarget'].includes(command.kind),suspensionChanged=wasSuspended!==(game.pauses.length>0||!!game.result);
    const invalidated=previousTrackedActor&&command.kind!=='advance'&&!['snapshot','setNavigationView','raidCameraFocus','previewVillage'].includes(command.kind)&&(command.kind!=='trackPathMotion'||value===true)&&(!tutorialOnly||suspensionChanged);
    // Until event-level dependencies and continuous contacts are certified,
    // stop at the beginning of an affected batch rather than extrapolating
    // through an event, an untimed segment or an unobserved displacement.
    const peerGap=motionTrace?.peers&&(motionTrace.rosterChanged||motionTrace.peers.some(p=>!p.continuous||!p.timed)),topologyChanged=motionTrace&&motionTopologyBefore!==nav.version;
    const batchInvalidation=motionTrace&&(events.length>0||!motionTrace.continuous||!motionTrace.timed||peerGap||topologyChanged);
    const motionInvalidation=batchInvalidation?{actorId:motionTrace.actorId,...motionTrace.start,reason:events.length?'simulation-event':!motionTrace.continuous?'unobserved-motion':!motionTrace.timed?'untimed-motion':peerGap?'peer-motion-unknown':'topology-changed',eventTypes:events.map(e=>e.type),actorRelated:events.some(e=>[e.actorId,e.targetId,e.workerId,e.animalId].includes(motionTrace.actorId)),topologyChanged:!!topologyChanged}:invalidated?{actorId:previousTrackedActor.id,at:game.elapsed,x:previousTrackedActor.x,z:previousTrackedActor.z,reason:command.kind}:null;
    if(worldMotionTrace&&terrainGeneration!==reportedTerrainGeneration)worldMotionTrace.terrainChanged=true;
    sequence=command.sequence;const emitted=events,emittedSettlements=settlements;events=[];settlements=[];const lifecycle=presentationJournal.drain();
    const resident=residency(),presentationWorkerHeadings=presentationHeadings?.capture(game);let pausedPoses;
    // Only authority can certify that skipping future paused ticks removes no work.
    // Remain conservative when a physics registry or a navigation service exists.
    const pausedQuiescent=pausedAuthorityQuiescent({enabled:compactPausedAcks,hasSnapshot:hasPublishedSnapshot,game,physics,trackMicroIncome,nav,resident,terrainGeneration,reportedTerrainGeneration,hasNativeProduction:nativeProduction!==null});
    const tutorialGuideRevision=tutorialGuideTracker.publication(game);
    if(pausedUnchangedCandidate&&!pendingNativeWorldResources.length&&game.pauses.length>0&&!emitted.length&&!emittedSettlements.length&&!lifecycle.length&&!presentationWorkerHeadings?.length&&terrainGeneration===reportedTerrainGeneration){
     // Preserve the physics driver's normal publication-side work even for an
     // empty registry; a nonempty result fails closed to the full snapshot.
     pausedPoses=physics?.poses({activeOnly:compactPhysicsPoses})??null;
     if(!pausedPoses?.length)return {sequence,value,...(tutorial?{tutorialUpdate:tutorial.updateStatus(JSON.stringify(game))}:{}),...(tutorialGuideRevision===null?{}:{tutorialGuideRevision}),unchanged:true,pausedAdvance:true,...(pausedQuiescent?{pausedQuiescent:true}:{}),slotId:game.slotId,stateSequence:game.sequence,elapsed:game.elapsed,pauses:[...game.pauses],events:[],residency:resident,saveAvailable:saveAvailable(),terrainChanged:takeTerrainChanged(),...(command.steps!==undefined?{stepsExecuted}:{})};
    }
    if(compactViewAcks&&!nativeBoundaryPending&&!pendingNativeWorldResources.length&&command.kind==='setNavigationView'&&command.visualTerrain!==true&&!emitted.length&&!emittedSettlements.length&&!lifecycle.length&&!presentationWorkerHeadings?.length)return {sequence,value,...(tutorial?{tutorialUpdate:tutorial.updateStatus(JSON.stringify(game))}:{}),...(pausedQuiescent?{pausedQuiescent:true}:{}),...(tutorialGuideRevision===null?{}:{tutorialGuideRevision}),unchanged:true,slotId:game.slotId,stateSequence:game.sequence,elapsed:game.elapsed,pauses:[...game.pauses],events:[],residency:resident,saveAvailable:saveAvailable(),terrainChanged:takeTerrainChanged()};
    let terrainCheckpoint;
    if(command.visualTerrain===true){
     const selected=session.core.currentChunk(),chunks=[];
     try{for(const key of loaded.keys()){const [x,z]=parseSimulationChunkKey(key);if(session.core.selectChunk(x,z)<0)throw Error('Resident native chunk disappeared: '+key);chunks.push({...withMud(session.core.chunkPayload()),capturedAt:game.elapsed});}}
     finally{if(selected&&session.core.selectChunk(selected.cx,selected.cz)<0)throw Error('Could not restore selected native chunk');}
     const nativeWorldBoundary=planner.nativeWorldResourceBoundary();
     terrainCheckpoint={sequence,chunks,...(nativeWorldBoundary?{nativeWorldBoundary}:{}),...(presentationHeadings?{workerHeadings:presentationHeadings.snapshot()}:{}),...(command.visualRecoveryOnly===true?{recoveryOnly:true}:{})};
    }
    const physicsPoses=pausedPoses===undefined?(physics?.poses({activeOnly:command.visualTerrain===true?false:compactPhysicsPoses})??null):pausedPoses;
    const physical=command.kind==='snapshot'&&(command.physicsCheckpoint===true||command.physicsCheckpoint==='encoded')?physics?.checkpointFall()??null:undefined;
    const nativeAuthorityCheckpoint=command.kind==='snapshot'&&command.nativeAuthorityCheckpoint===true?{version:2,wallOwners:session.captureWallOwners(),chunkKeys:session.core.captureResidentChunks().keys,spatialState:session.core.snapshot(),navigationView:nav.activeBounds&&nav.raidView?{bounds:[...nav.activeBounds],eye:{...nav.raidView.eye},target:{...nav.raidView.target}}:null}:null;
    const projectedPaths=compactPresentationPaths&&!captureHistoricalEvents&&command.kind==='advance'&&!terrainCheckpoint&&!motionTrace&&!motionInvalidation&&(game.workers.some(actor=>Array.isArray(actor.path)&&actor.path.length>1)||(game.raid?.animals??[]).some(actor=>Array.isArray(actor.path)&&actor.path.length>1));
    const preparedState=prepareTransportSnapshots?prepareConfirmedStateTransport(game,{projectPaths:projectedPaths}):null;const result={sequence,value,...(pausedQuiescent?{pausedQuiescent:true}:{}),...(tutorialGuideRevision===null?{}:{tutorialGuideRevision}),...(projectedPaths?{presentationPaths:'head-v1'}:{}),...(nativeAuthorityCheckpoint?{nativeAuthorityCheckpoint}:{}),...(presentationWorkerHeadings?.length?{presentationWorkerHeadings}:{}),...(terrainCheckpoint?{terrainCheckpoint}:{}),...(command.steps!==undefined?{stepsExecuted}:{}),...(clockCapture?{clockSegments:clockCapture}:{}),...(eventBoundaries&&emitted.length?{historicalEventBoundaries:eventBoundaries.finish(emitted)}:{}),...(motionTrace?{motionTrace}:{}),...(worldMotionTrace?{worldMotionTrace}:{}),...(motionInvalidation?{motionInvalidation}:{}),...(rejection?{rejection}:{}),...(commandLoadedChunks.length?{commandLoadedChunks}:{}),...(physical===undefined?{}:{physicsCheckpoint:physical&&command.physicsCheckpoint==='encoded'?encodePhysicsCheckpoint(physical):physical}),residency:resident,physicsPose:physicsPoses?.[0]??null,...(physicsPoses?.length>1?{physicsPoses}:{}),elapsed:game.elapsed,pauses:[...game.pauses],events:emitted,...(emittedSettlements.length?{settlements:emittedSettlements}:{}),...(emitted.length?{presentationJournalVersion:2}:{}),presentationJournal:lifecycle,...(!checkpointRaidWaitsOnly||command.kind==='snapshot'?{raidWaitBindings:captureRaidWaitBindings(game,nav)}:{}),saveAvailable:saveAvailable(),snapshot:preparedState?null:(projectedPaths?serializeConfirmedPresentationState(game):serializeConfirmedState(game)),terrainChanged:takeTerrainChanged()};if(preparedState){Object.defineProperty(result,'snapshot',{enumerable:true,configurable:true,get:()=>preparedState.snapshot});Object.defineProperty(result,authoritySnapshotFields,{value:preparedState.fields});}if(tutorial)result.tutorialUpdate=tutorial.updateStatus(projectedPaths?JSON.stringify(game):result.snapshot);if(pendingNativeWorldResources.length){result.nativeWorldResources=pendingNativeWorldResources;pendingNativeWorldResources=[];}hasPublishedSnapshot=true;nativeProduction?.wake();return result;
   },
   publishResidentTerrainForQa(publish){if(closed||typeof publish!=='function')throw TypeError('Invalid terrain bootstrap');const selected=session.core.currentChunk();try{for(const key of loaded.keys()){const [x,z]=parseSimulationChunkKey(key);if(session.core.selectChunk(x,z)<0)throw Error('Resident native chunk disappeared: '+key);publish(withMud(session.core.chunkPayload()),game.elapsed);}}finally{if(selected&&session.core.selectChunk(selected.cx,selected.cz)<0)throw Error('Could not restore selected native chunk');}},
    dispose(){if(closed)return;closed=true;nativeStructurePreparation?.controller.abort();nativeProduction?.dispose();nativeResourcePreparation?.dispose();nativeIntentControl?.dispose();presentationJournal.dispose();stopMotion?.();stopEvents?.();stopSettlements?.();stopTasks?.();stopWorld?.();try{physics?.dispose();}finally{try{nativeBodies?.dispose();}finally{session.dispose();}}},
  };
 }catch(error){nativeProduction?.dispose();nativeResourcePreparation?.dispose();nativeIntentControl?.dispose();stopEvents?.();stopSettlements?.();stopTasks?.();stopWorld?.();try{nativeBodies?.dispose();}finally{session?.dispose();}throw error;}
}
