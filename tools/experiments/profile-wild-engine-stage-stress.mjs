import {performance} from 'node:perf_hooks';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import * as Game from '../../src/simulation/game.js';
import {spawnRaid} from '../../src/simulation/raids.js';
import {rational} from '../../src/simulation/money.js';
import {serialize} from '../../src/persistence/snapshots.js';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';

// Synthetic phase-equivalent engine stress, never a virtual-player campaign or
// an economic-balance result. Every crop and raid uses the real game actions.
const phases=[
  {name:'early',day:6,crops:40,group:['warthog','warthog','warthog','hyena','hyena','hyena']},
  {name:'middle',day:50,crops:150,group:[...Array(5).fill('warthog'),...Array(5).fill('hyena'),...Array(3).fill('buffalo'),'lion']},
  // Sixteen simultaneous attackers match the current wave-residency target;
  // the other animals in a full late raid arrive in subsequent native waves.
  {name:'late',day:100,crops:300,group:[...Array(3).fill('warthog'),...Array(4).fill('hyena'),...Array(4).fill('buffalo'),...Array(3).fill('lion'),...Array(2).fill('rhino')]}
];

const biome=process.argv[2]??'sabana';
const seed=Number(process.argv[3]??712);
const output=process.argv[4];
const tickLimit=Number(process.argv[5]??2400);
const waitCapturePrefix=process.argv[6];
const wallRing=process.env.WG_ENGINE_WALL_RING==='1';
const wallCropTarget=Number(process.env.WG_ENGINE_WALL_CROPS??100);
if(wallRing&&(!Number.isSafeInteger(wallCropTarget)||wallCropTarget<1||wallCropTarget>300))
  throw RangeError('WG_ENGINE_WALL_CROPS must be an integer from 1 to 300');
const timedCaptureTick=Number(process.env.WG_ENGINE_CAPTURE_TICK??0);
const timedCapturePrefix=process.env.WG_ENGINE_CAPTURE_PREFIX;
const results=[];
const sha=path=>createHash('sha256').update(readFileSync(new URL(path,import.meta.url))).digest('hex');
const source={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  cppSha256:sha('../../src/world/hierarchical-wasm/spatial-savanna.cpp'),
  wasmSha256:sha('../../src/world/hierarchical-wasm/spatial-savanna.wasm'),
  raidsSha256:sha('../../src/simulation/raids.js'),
  canyonFormationSha256:sha('../../src/simulation/canyon-raid-formation.js'),
  animalRouteClearanceSha256:sha('../../src/simulation/animal-route-clearance.js'),
  runnerSha256:sha('./profile-wild-engine-stage-stress.mjs')};

for(const phase of phases){
  const {state,nav,session,start,loaded}=await createSpatialCampaignOpening({
    seed,biome,slotId:`engine-stage-${biome}-${seed}-${phase.name}`
  });
  try{
    state.tutorial.step='done';state.initialPreparation=false;
    state.ledger.balance=rational(1000000);
    const {x:cx,z:cz}=start.site.center;
    let ringBounds=null;
    if(wallRing){
      const x0=cx-10,x1=cx+22,
        z0=Math.min(...start.farm.map(point=>point.z))-10,z1=cz+10;
      ringBounds={x0,x1,z0,z1};
      if(!Game.buildWallChain(state,`engine-stage-ring-${phase.name}`,'zarzas',
        [[x0,z0],[x1,z0],[x1,z1],[x0,z1],[x0,z0]],nav,
        {smooth:false,snap:false}))throw Error('Could not construct native wall ring');
    }
    const originalWallHp=new Map(state.structures.filter(item=>item.kind==='wall')
      .map(item=>[item.id,item.hp]));
    const cropTarget=wallRing?Math.min(phase.crops,wallCropTarget):phase.crops;
    let placed=0;
    const preparationStart=performance.now();
    for(let dz=-54;dz<=54&&placed<cropTarget;dz+=2)
      for(let dx=-54;dx<=54&&placed<cropTarget;dx+=2){
        const x=cx+dx,z=cz+dz;
        if(ringBounds&&(x<=ringBounds.x0+2||x>=ringBounds.x1-2||
          z<=ringBounds.z0+2||z>=ringBounds.z1-2))continue;
        const [x0,z0,x1,z1]=nav.activeBounds;
        if(x<x0+5||x>x1-5||z<z0+5||z>z1-5)continue;
        if(!nav.placement(x,z,.4).valid)continue;
        try{if(Game.plant(state,`stage-${placed}`,'mijo',x,z,nav))placed++;}
        catch(error){if(error.message!=='Necesitas separar las plantas')throw error;}
      }
    if(placed<cropTarget)throw Error(`Only ${placed}/${cropTarget} crops could be placed`);
    state.day=phase.day;state.completedNights=phase.day-1;
    state.time=310;state.nightPlan={done:true};state.dayPlan={done:true};
    const preparationMs=performance.now()-preparationStart;
    const before=process.memoryUsage();
    const spawned=spawnRaid(state,{at:310,group:phase.group,
      done:false,introductory:false},nav);
    if(spawned===false)throw Error(`Raid could not enter physically: ${JSON.stringify({
      phase:phase.name,entryVersion:nav.raidEntryFailure?.version,
      group:nav.raidEntryFailure?.group,
      bounds:nav.activeBounds})}`);
    const actors=[...state.raid.animals];
    const initial=actors.map(actor=>({id:actor.id,x:actor.x,z:actor.z,
      hitsRemaining:actor.hitsRemaining}));
    const tickStart=performance.now();
    const eventCounts={},retreatReasons={},retreatUnusedHits={},retreatDiagnostics=[],exitAbandonments=[];
    let capturedWait=false;
    let positionAt2000=null;
    let connectivityChunksServiced=0;
    let maxLoadedChunks=loaded.size;
    let invalidStaticMoves=0;
    const invalidStaticMoveExamples=[];
    let lastEventId=Number(state.events.at(-1)?.id.split('-')[1]??-1);
    let ticks=0;
    for(;ticks<tickLimit&&state.raid&&!state.result;ticks++){
      const priorPositions=wallRing?actors.map(actor=>({x:actor.x,z:actor.z})):null;
      const priorWaypoints=wallRing?actors.map(actor=>actor.path?.[0]):null;
      Game.tick(state,.25,nav);
      if(nav.serviceRaidConnectivityDemand?.())connectivityChunksServiced++;
      if(priorPositions)for(const [index,actor] of actors.entries()){
        const prior=priorPositions[index];
        if(Math.hypot(actor.x-prior.x,actor.z-prior.z)<1e-8)continue;
        if(nav.segmentClear(prior,actor,actor.radius,null,false))continue;
        // A single tick can pass one waypoint and turn. The straight chord
        // can cut a corner even though both physical substeps were clear.
        const via=priorWaypoints[index],viaLength=via?
          Math.hypot(via.x-prior.x,via.z-prior.z)+
          Math.hypot(actor.x-via.x,actor.z-via.z):Infinity;
        if(via&&viaLength<=1.05&&
          nav.segmentClear(prior,via,actor.radius,null,false)&&
          nav.segmentClear(via,actor,actor.radius,null,false))continue;
        invalidStaticMoves++;
        if(invalidStaticMoveExamples.length<4)invalidStaticMoveExamples.push({
          tick:ticks+1,id:actor.id,species:actor.species,
          status:actor.status,from:prior,to:{x:actor.x,z:actor.z},
          fromStandable:nav.walkable(prior.x,prior.z,actor.radius,null,false),
          toStandable:nav.walkable(actor.x,actor.z,actor.radius,null,false),
          pathNext:actor.path?.[0],targetId:actor.targetId,
          recoveryAttempts:actor.mobileRecoveryAttempts,
          dynamicStallSeconds:actor.dynamicStallSeconds});
      }
      maxLoadedChunks=Math.max(maxLoadedChunks,loaded.size);
      if(timedCapturePrefix&&ticks+1===timedCaptureTick){
        const capture={source,phase:phase.name,seed,biome,
          activeBounds:nav.activeBounds,raidView:nav.raidView,
          loadedChunks:[...loaded.keys()],snapshot:serialize(state)};
        writeFileSync(`${timedCapturePrefix}-${phase.name}-${ticks+1}.json.gz`,
          gzipSync(JSON.stringify(capture),{level:9}));
      }
      if(ticks===1999)positionAt2000=actors.map(actor=>({
        status:actor.status,x:actor.x,z:actor.z}));
      for(const item of state.events){
        const id=Number(item.id.split('-')[1]);
        if(id<=lastEventId)continue;
        eventCounts[item.type]=(eventCounts[item.type]??0)+1;
        if(item.type==='AnimalRetreating'){
          retreatReasons[item.reason]=(retreatReasons[item.reason]??0)+1;
          retreatUnusedHits[item.reason]=(retreatUnusedHits[item.reason]??0)+item.hitsRemaining;
          const actor=actors.find(candidate=>candidate.id===item.targetId);
          retreatDiagnostics.push({species:item.species,reason:item.reason,
            hitsRemaining:item.hitsRemaining,x:actor?.x,z:actor?.z,
            spawnWalkable:actor?nav.walkable(actor.spawn.x,actor.spawn.z,
              actor.radius,null,false):null});
          if(waitCapturePrefix&&!capturedWait&&item.reason==='waiting-expired-or-stage-blocked'){
            const capture={source,phase:phase.name,seed,biome,
              actorId:item.targetId,activeBounds:nav.activeBounds,
              raidView:nav.raidView,loadedChunks:[...loaded.keys()],
              snapshot:serialize(state)};
            writeFileSync(`${waitCapturePrefix}-${phase.name}.json.gz`,
              gzipSync(JSON.stringify(capture),{level:9}));
            capturedWait=true;
          }
        }
        if(item.type==='AnimalRetreatExitAbandoned')
          exitAbandonments.push({actorId:item.actorId,reason:item.reason,
            x:item.x,z:item.z,seconds:item.seconds});
        lastEventId=id;
      }
      for(const actor of state.raid?.animals??[]){
        if(!Number.isFinite(actor.x)||!Number.isFinite(actor.z))
          throw Error(`Non-finite position for ${actor.id}`);
      }
    }
    const tickMs=performance.now()-tickStart;
    const moved=initial.filter(({x,z},i)=>
      Math.hypot(actors[i].x-x,actors[i].z-z)>1).length;
    const after=process.memoryUsage();
    const row={phase:phase.name,day:phase.day,biome,seed,
      crops:placed,animals:phase.group.length,preparationMs,tickMs,ticks,
      wallRing,wallModules:originalWallHp.size,
      automaticGates:state.structures.filter(item=>item.kind==='wall'&&item.gate).length,
      wallHpLost:state.structures.filter(item=>originalWallHp.has(item.id))
        .reduce((sum,item)=>sum+Math.max(0,originalWallHp.get(item.id)-item.hp),0),
      ruinedWalls:state.structures.filter(item=>originalWallHp.has(item.id)&&
        item.status==='ruined').length,
      invalidStaticMoves,invalidStaticMoveExamples,
      moved,raidActive:!!state.raid,result:state.result,
      raidEnded:eventCounts.RaidEnded??0,
      connectivityChunksServiced,
      loadedChunks:loaded.size,maxLoadedChunks,
      cropHits:eventCounts.CropHit??0,
      structureHits:eventCounts.StructureHit??0,
      logicalMisses:eventCounts.AnimalLogicalMiss??0,
      routeUnavailable:eventCounts.AnimalRouteUnavailable??0,
      targetUnavailable:eventCounts.AnimalTargetUnavailable??0,
      attackBudgetUsed:initial.reduce((sum,entry,i)=>
        sum+entry.hitsRemaining-actors[i].hitsRemaining,0),
      retreatReasons:Object.entries(retreatReasons),
      retreatUnusedHits:Object.entries(retreatUnusedHits),
      retreatDiagnostics,
      exitAbandonments,
      heapBefore:before.heapUsed,heapAfter:after.heapUsed,
      native:session.core.metrics()};
    if(positionAt2000)row.positionAt2000=positionAt2000;
    row.issues=[];
    if(moved!==phase.group.length)row.issues.push(`Only ${moved}/${phase.group.length} animals moved`);
    if(invalidStaticMoves)row.issues.push(`${invalidStaticMoves} movements crossed native static collision`);
    if(state.raid){
      row.issues.push(`Raid did not finish within ${ticks} ticks`);
      row.activeAnimals=actors.filter(actor=>actor.status!=='gone').map(actor=>({
        id:actor.id,species:actor.species,status:actor.status,
        hitsRemaining:actor.hitsRemaining,x:actor.x,z:actor.z,exit:actor.exit,
        targetId:actor.targetId,destinationId:actor.destinationId,
        pathLength:actor.path?.length??0,pathVersion:actor.pathVersion}));
    }
    if(row.raidEnded!==(state.raid?0:1))row.issues.push(`Raid ended ${row.raidEnded} times`);
    results.push(row);
    process.stdout.write(`${JSON.stringify(row)}\n`);
  }catch(error){
    const row={phase:phase.name,biome,seed,wallRing,raidActive:null,
      issues:[error.message]};
    results.push(row);
    process.stderr.write(`${phase.name}: ${error.message}\n`);
  }finally{session.dispose();}
}

if(output)writeFileSync(output,JSON.stringify({kind:'synthetic phase-equivalent spatial stress',tickLimit,source,results},null,2));
if(results.some(row=>row.issues.length))process.exitCode=1;
