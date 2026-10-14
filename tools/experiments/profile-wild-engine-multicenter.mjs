import {performance} from 'node:perf_hooks';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as Game from '../../src/simulation/game.js';
import {rational} from '../../src/simulation/money.js';
import {serialize,deserialize} from '../../src/persistence/snapshots.js';
import {centerServicePoint} from '../../src/world/centers.js';
import {createSpatialGameSession} from '../../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/hierarchical-wasm/spatial-navigation-movement.js';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';

// Constructed late-estate QA. Every center, crop and hire is a paid native
// game command; the large starting balance is only a fixture funding source.
const biome=process.argv[2]??'sabana',seed=Number(process.argv[3]??712);
const output=process.argv[4],duration=Number(process.argv[5]??120);
if(!Number.isFinite(seed)||!Number.isFinite(duration)||duration<=0||duration>300)
  throw RangeError('Usage: profile-wild-engine-multicenter [biome] [seed] [report.json] [seconds <= 300]');
const hash=path=>createHash('sha256').update(readFileSync(new URL(path,import.meta.url))).digest('hex');
const source={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  cppSha256:hash('../../src/world/hierarchical-wasm/spatial-savanna.cpp'),
  wasmSha256:hash('../../src/world/hierarchical-wasm/spatial-savanna.wasm'),
  runnerSha256:hash('./profile-wild-engine-multicenter.mjs')};
const {state,nav,session,start,loaded}=await createSpatialCampaignOpening({
  seed,biome,slotId:`engine-multicenter-${biome}-${seed}`});
try{
  state.tutorial.step='done';state.initialPreparation=false;
  state.ledger.balance=rational(1000000);
  const centerSites=[];
  let unresolvedCenterCandidates=0;
  for(const radius of [24,32,40,48,56,64])for(let angle=0;angle<24;angle++)
    centerSites.push({x:start.site.center.x+Math.cos(angle*Math.PI/12)*radius,
      z:start.site.center.z+Math.sin(angle*Math.PI/12)*radius});
  for(const site of centerSites){
    if(state.structures.filter(item=>item.kind==='center').length>=3)break;
    const [x0,z0,x1,z1]=nav.activeBounds;
    if(site.x<x0+12||site.x>x1-12||site.z<z0+12||site.z>z1-12)continue;
    if(state.structures.some(item=>item.kind==='center'&&Math.hypot(item.x-site.x,item.z-site.z)<20))continue;
    let preview;
    try{preview=Game.previewCenter(state,site,nav);}
    catch(error){
      if(error.name!=='SpatialChunkUnavailable')throw error;
      unresolvedCenterCandidates++;continue;
    }
    if(!preview.valid)continue;
    Game.placeStructure(state,`multicenter-${state.structures.length}`,{kind:'center',x:site.x,z:site.z},nav);
  }
  const centers=state.structures.filter(item=>item.kind==='center');
  if(centers.length<2){
    const negative={source,biome,seed,unresolvedCenterCandidates,
      centers:centers.map(item=>({id:item.id,x:item.x,z:item.z})),
      error:`Only ${centers.length} centers could be placed within the resident bounds`};
    if(output)writeFileSync(output,JSON.stringify(negative,null,2)+'\n');
    throw Error(negative.error);
  }
  const offsets=[];
  for(let dz=-38;dz<=38;dz+=2)for(let dx=-38;dx<=38;dx+=2)
    offsets.push({dx,dz,distance:Math.hypot(dx,dz)});
  offsets.sort((a,b)=>a.distance-b.distance||a.dz-b.dz||a.dx-b.dx);
  let placed=0;
  for(const {dx,dz} of offsets){
    for(const center of centers){
      if(placed===300)break;
      const x=center.x+dx,z=center.z+dz,[x0,z0,x1,z1]=nav.activeBounds;
      if(x<x0+5||x>x1-5||z<z0+5||z>z1-5||!nav.placement(x,z,.4).valid)continue;
      try{if(Game.plant(state,`multi-crop-${placed}`,'mijo',x,z,nav))placed++;}
      catch(error){if(error.message!=='Necesitas separar las plantas')throw error;}
    }
    if(placed===300)break;
  }
  if(placed<300)throw Error(`Only ${placed}/300 crops could be planted`);
  state.day=100;state.completedNights=99;state.time=15;
  state.dayPlan={done:true};state.nightPlan={done:true};
  Game.pause(state,'hiring');
  Game.hire(state,'multicenter-hire',{olderFemale:centers.length*3});
  if(state.workers.length!==centers.length*3)throw Error('Paid staff count does not match centers');
  const village=state.villages[0],entry=village.entry??village;
  const centerRoutes=centers.map(center=>({id:center.id,entry,
    departure:centerServicePoint(center,state,.8),
    path:nav.workerPath(entry,centerServicePoint(center,state,.8),.28)?.length??0}));
  const initial=state.workers.map(item=>({id:item.id,x:item.x,z:item.z}));
  const before=process.memoryUsage(),tickMs=[],startMs=performance.now();
  let elapsed=0,peakTasks=state.tasks.length,peakLoaded=loaded.size;
  while(elapsed<duration&&!state.result&&!state.pauses.length){
    const dt=Math.min(.25,duration-elapsed),now=performance.now();
    Game.tick(state,dt,nav);tickMs.push(performance.now()-now);elapsed+=dt;
    peakTasks=Math.max(peakTasks,state.tasks.length);
    peakLoaded=Math.max(peakLoaded,loaded.size);
  }
  const sorted=[...tickMs].sort((a,b)=>a-b),after=process.memoryUsage();
  const saved=serialize(state),restored=deserialize(saved);
  if(serialize(restored)!==saved)throw Error('Multi-center save did not round-trip');
  const wasm=new WebAssembly.Module(readFileSync(new URL(
    '../../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
  const resident=new Map(),fresh=createSpatialGameSession(wasm,restored,{
    loaded:()=>resident,onData:data=>resident.set(`${data.cx},${data.cz}`,data)});
  let reload;
  try{
    for(const key of loaded.keys()){
      const [cx,cz]=key.split(',').map(Number);
      if(fresh.core.selectChunk(cx,cz)<0&&fresh.core.addChunk(cx,cz)<0)
        throw Error(`Could not restore resident chunk ${key}`);
      resident.set(key,fresh.core.chunkPayload());
    }
    const freshNav=createSpatialNavigationMovement(fresh,restored);
    freshNav.setActiveBounds(nav.activeBounds);
    const beforeWorkers=restored.workers.map(item=>({id:item.id,x:item.x,z:item.z}));
    const beforeSequence=restored.sequence,now=performance.now();
    for(let i=0;i<120&&!restored.result&&!restored.pauses.length;i++)
      Game.tick(restored,.25,freshNav);
    reload={savedBytes:saved.length,tickMs:performance.now()-now,
      result:restored.result,pauses:restored.pauses,
      centerRoutes:centers.map(center=>({id:center.id,
        path:freshNav.workerPath(entry,centerServicePoint(center,restored,.8),.28)?.length??0})),
      workersMoved:beforeWorkers.filter(point=>{
        const worker=restored.workers.find(item=>item.id===point.id);
        return Number.isFinite(worker.x)&&Number.isFinite(worker.z)&&
          Math.hypot(worker.x-point.x,worker.z-point.z)>.1;
      }).length,
      newWaterEvents:restored.events.filter(event=>event.type==='WaterSatisfied'&&
        Number(event.id.slice(6))>=beforeSequence).length,
      native:fresh.core.metrics()};
  }finally{fresh.dispose();}
  const report={source,biome,seed,description:'Constructed native day-100 workload, not a played campaign or balance result',
    unresolvedCenterCandidates,
    centers:centers.map(center=>({id:center.id,x:center.x,z:center.z,
      crops:state.plants.filter(plant=>plant.centerId===center.id).length,
      workers:state.workers.filter(worker=>worker.centerId===center.id).length})),
    centerRoutes,
    crops:placed,workers:state.workers.length,elapsed,ticks:tickMs.length,
    loopMs:performance.now()-startMs,tickMsTotal:tickMs.reduce((sum,value)=>sum+value,0),
    firstTickMs:tickMs[0],tickMsP95:sorted[Math.floor((sorted.length-1)*.95)],
    tickMsMax:Math.max(...tickMs),
    workerDistance:initial.map(point=>{
      const worker=state.workers.find(item=>item.id===point.id);
      return {id:point.id,centerId:worker.centerId,
        start:{x:point.x,z:point.z},end:{x:worker.x,z:worker.z},
        distance:Math.hypot(worker.x-point.x,worker.z-point.z),
        status:worker.status,pathLength:worker.path?.length??0,
        taskId:worker.taskId,arrivalSeconds:worker.arrivalSeconds};
    }),
    events:Object.fromEntries(['WaterSatisfied','CropPicked','CrateDelivered','ActorMobileCollisionRecovery']
      .map(type=>[type,state.events.filter(event=>event.type===type).length])),
    tasks:state.tasks.length,peakTasks,loadedChunks:loaded.size,peakLoadedChunks:peakLoaded,
    heapDeltaBytes:after.heapUsed-before.heapUsed,result:state.result,pauses:state.pauses,
    topologyRevision:session.topologySource.revision(),native:session.core.metrics(),reload};
  if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
}finally{session.dispose();}
