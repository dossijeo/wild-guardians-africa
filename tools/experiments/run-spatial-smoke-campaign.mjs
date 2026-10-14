import {performance} from 'node:perf_hooks';
import {writeFileSync} from 'node:fs';
import * as Game from '../../src/simulation/game.js';
import {numberOf} from '../../src/simulation/money.js';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';

// Continuous functional/performance smoke, not a balanced virtual player.
// All changes to the game are ordinary paid commands and native Game.tick.
const nights=Number(process.argv[2]??14);
const output=process.argv[3]??'docs/qa/hierarchical-navigation/spatial-smoke-campaign.json';
const walled=process.argv.includes('--walled');
const biome=process.argv.find(arg=>arg.startsWith('--biome='))?.slice('--biome='.length)??'sabana';
const maxTicks=Number(process.env.WG_SPATIAL_SMOKE_MAX_TICKS??20000);
if(!Number.isSafeInteger(nights)||nights<1||nights>100)
  throw RangeError('Expected 1–100 nights');
const started=performance.now(),opening=await createSpatialCampaignOpening({biome});
const {state,nav,session,start}=opening,rows=[];
try{
  let sequence=0;
  if(walled){
    const center=start.site.center;
    const x0=center.x-10,x1=center.x+22;
    const z0=Math.min(...start.farm.map(point=>point.z))-10,z1=center.z+10;
    const perimeter=[[x0,z0],[x1,z0],[x1,z1],[x0,z1],[x0,z0]];
    if(!Game.buildWallChain(state,'spatial-smoke-ring','zarzas',perimeter,nav,
      {smooth:false,snap:false}))throw Error('Native smoke perimeter was rejected');
  }
  for(const point of start.farm.slice(0,10))
    Game.plant(state,`spatial-smoke-crop-${sequence++}`,'mijo',point.x,point.z,nav);
  Game.openInitialHiring(state);
  Game.hire(state,'spatial-smoke-hire-1',{olderFemale:1});
  for(let day=1;day<=nights&&!state.result;day++){
    const dayStart=performance.now(),eventStart=state.events.length;
    let ticks=0;
    while(state.day===day&&!state.result&&ticks<maxTicks){
      if(state.pauses.length)throw Error(`Unexpected pause on day ${day}: ${state.pauses}`);
      Game.tick(state,state.time<300||state.raid?1:5,nav);
      ticks++;
    }
    const events=state.events.slice(eventStart),row={day,ticks,
      wallMs:performance.now()-dayStart,completedNights:state.completedNights,
      balance:numberOf(state.ledger.balance),living:state.plants.filter(p=>p.alive).length,
      spawned:events.filter(event=>event.type==='RaidSpawned').length,
      waves:events.filter(event=>event.type==='RaidWaveSpawned').length,
      hits:events.filter(event=>event.type==='CropHit'||event.type==='StructureHit').length,
      ended:events.filter(event=>event.type==='RaidEnded').length,
      result:state.result,loadedChunks:session.core.metrics().loadedChunks};
    rows.push(row);
    console.log(JSON.stringify(row));
    if(state.day===day&&!state.result)
      throw Error(`Day ${day} did not complete: ${JSON.stringify({ticks,time:state.time,
        pauses:state.pauses,nightPlan:state.nightPlan,
        raid:state.raid?.animals.map(animal=>({status:animal.status,
          x:animal.x,z:animal.z,hitsRemaining:animal.hitsRemaining,
          spawn:animal.spawn,exit:animal.exit,path:animal.path?.length,
          destinationId:animal.destinationId,
          standable:nav.walkable(animal.x,animal.z,animal.radius,null,false),
          routeToSpawn:(()=>{try{return !!nav.path(animal,animal.spawn,animal.radius,null,false)}catch(error){return error.name}})(),
          routeToExit:(()=>{try{const route=nav.path(animal,animal.exit,animal.radius,null,false);
            return route?{head:route.slice(0,3),clear:nav.segmentClear(animal,route[0],animal.radius,null,false)}:null;
          }catch(error){return error.name}})()})),
        raidEntryFailure:nav.raidEntryFailure,raidEntryDemand:nav.raidEntryDemand,
        activeBounds:nav.activeBounds,raidView:nav.raidView,
        workers:state.workers.map(worker=>({status:worker.status,x:worker.x,z:worker.z}))})}`);
    if(state.day<=nights&&!state.result){
      Game.hire(state,`spatial-smoke-hire-${state.day}`,{olderFemale:1});
    }
  }
  const report={scope:'Continuous C++ spatial-world smoke; ten opening mijo crops, one paid worker per day, optional single opening wall ring, no magic or reloading. Diagnostic navigation/performance evidence only; not a balance campaign.',
    biome,walled,
    requestedNights:nights,completedNights:state.completedNights,result:state.result,
    elapsedMs:performance.now()-started,rows};
  writeFileSync(output,JSON.stringify(report,null,2)+'\n');
}finally{session.dispose();}
