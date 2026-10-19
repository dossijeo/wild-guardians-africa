import {readFileSync} from 'node:fs';
import * as Game from '../../src/simulation/game.js';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from
  '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from
  '../../src/world/wild-engine/spatial-navigation-movement.js';
import {syncNativeCampaignRaidView} from '../native-campaign-runner.mjs';
import {cameraRaidEntry,chooseRaidEntry,spawnRaid,targetFor} from '../../src/simulation/raids.js';
import {createEventDrivenTaskPlanner} from '../../src/world/wild-engine/spatial-intent-bridge.js';
import {raidWallEnvelope,exteriorRaidWitness} from '../../src/simulation/raid-exterior-entry.js';
import {animalSpec,randomInt} from '../../src/simulation/rules.js';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';

const path=process.argv[2];
if(!path)throw TypeError('Pass a frozen native campaign state');
const receiptPath=process.argv[3];
const state=deserialize(gunzipSync(readFileSync(path)).toString());
const wasm=new WebAssembly.Module(readFileSync(
  process.env.WILD_ENGINE_SPATIAL_SERVICES_WASM??
  'src/world/wild-engine/spatial-savanna.wasm'));
const loaded=new Map(),session=createSpatialGameSession(wasm,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
try{
  const nav=createSpatialNavigationMovement(session,state);
  const view=syncNativeCampaignRaidView(state,nav,null),bounds=view.bounds;
  const jobsFor=area=>{
    const jobs=new Map();
    for(let z=Math.floor((area[1]+24)/48);
      z<=Math.floor((area[3]+23.999)/48);z++)
      for(let x=Math.floor((area[0]+24)/48);
        x<=Math.floor((area[2]+23.999)/48);x++)
        jobs.set(`${x},${z}`,{cx:x,cz:z,score:0});
    return jobs;
  };
  const group=state.nightPlan.group;
  const specs=group.map(id=>({spec:animalSpec(id),
    radius:ANIMAL_ACTIONS.animals[id].presentation.footprint.radius}));
  const preferredSide=randomInt({rng:state.rng},0,3);
  const narrow=receiptPath?JSON.parse(readFileSync(receiptPath,'utf8'))
    .arms[0].partial.navigation.bounds:
    [bounds[0]+48,bounds[1]+48,bounds[2]-48,bounds[3]-48];
  session.stream.plan(jobsFor(narrow));await session.stream.whenIdle();
  const narrowResident=loaded.size;
  nav.setActiveBounds(narrow);
  const narrowCamera=cameraRaidEntry(state,specs,narrow,nav,nav.raidView,0);
  const narrowStarted=performance.now();
  const narrowEntry=chooseRaidEntry(state,specs,narrow,preferredSide,nav);
  const narrowMs=performance.now()-narrowStarted;
  session.stream.plan(jobsFor(bounds));await session.stream.whenIdle();
  nav.setActiveBounds(bounds);
  const started=performance.now();
  const entry=chooseRaidEntry(state,specs,bounds,preferredSide,nav);
  const wallBox=raidWallEnvelope(state,nav);
  const narrowProof=narrowEntry?.entries?.map((point,index)=>({
    point,radius:specs[index].radius,
    wideWitness:exteriorRaidWitness(point,specs[index].radius,wallBox,nav),
    nativeWitness:session.actorExteriorRegionWitness(point,bounds,wallBox,
      {worker:false,species:specs[index].spec.id})}));
  const reachableWalls=entry?.entries?.map((point,index)=>{
    const profile={worker:false,species:specs[index].spec.id};
    const sides=session.actorRelevantWallApproachSides(point,profile);
    const reachable=sides.filter(side=>session.actorRouteStatus(point,side,
      profile)==='found');
    return {actor:index,sides:sides.length,reachable:reachable.length,
      firstWall:reachable[0]?.wallId??null};
  });
  let chosenTargets=null;
  let replay=null;
  if(entry){
    spawnRaid(state,state.nightPlan,nav);
    const planner=createEventDrivenTaskPlanner(session);
    planner.resetFromState(state);planner.nativeWallSelectionEnabled=true;
    nav.intentTaskPlanner=planner;
    chosenTargets=state.raid.animals.map((actor,index)=>{
      const selected=targetFor(state,actor,nav);
      planner.cancelAttackIntent(actor.id);
      return {actor:index,kind:selected?.target?.kind??null,
        target:selected?.target?.id??null,unknown:!!selected?.unknown};
    });
    const seconds=Number(process.env.PROBE_RAID_SECONDS??0);
    if(Number.isInteger(seconds)&&seconds>0){
      const stopTasks=planner.observeTasks(state),
        stopWorld=planner.observeWorld(state),events={};
      const stopEvents=Game.observeGameEvents(state,event=>{
        if(event.type.startsWith('Animal')||event.type==='StructureRuined')
          events[event.type]=(events[event.type]??0)+1;
      });
      try{
        for(let second=0;second<seconds&&state.raid&&!state.result;second++){
          Game.tick(state,1,nav);
          planner.flushWorldEvents();
        }
        replay={elapsed:state.elapsed,raidActive:!!state.raid,events,
          encounters:state.raid?.encounters?.length??0,
          actors:state.raid?.animals.map(actor=>({id:actor.id,
            status:actor.status,hitsRemaining:actor.hitsRemaining,
            targetId:actor.targetId}))??[]};
      }finally{stopTasks();stopWorld();stopEvents();}
    }
  }
  console.log(JSON.stringify({day:state.day,time:state.time,
    groupSize:group.length,hyenas:group.filter(id=>id==='hyena').length,
    wallCount:state.structures.filter(item=>item.kind==='wall'&&item.hp>0).length,
    bounds,narrowBounds:narrow,view:view.eye,narrowResident,
    resident:loaded.size,preferredSide,
    narrowMs,narrowEntryCount:narrowEntry?.entries?.length??0,
    narrowCameraCount:narrowCamera?.entries?.length??0,
    elapsedMs:performance.now()-started,
    entryCount:entry?.entries?.length??0,selectionBounds:entry?.selectionBounds??null,
    narrowProof,reachableWalls,chosenTargets,replay,
    raidSelectionStats:nav.raidSelectionStats??null},null,2));
}finally{session.dispose();}
