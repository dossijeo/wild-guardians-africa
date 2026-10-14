import {performance} from 'node:perf_hooks';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import * as Game from '../../src/simulation/game.js';
import {rational} from '../../src/simulation/money.js';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';

// Native daytime navigation stress. These are constructed workloads, not
// claims that a virtual player reached the stated day or farm size.
const phases=[{day:6,crops:40},{day:50,crops:150},{day:100,crops:300}];
const biome=process.argv[2]??'sabana',seed=Number(process.argv[3]??712);
const output=process.argv[4],duration=Number(process.argv[5]??120);
if(!Number.isFinite(seed)||!Number.isFinite(duration)||duration<=0||duration>300)
  throw RangeError('Usage: profile-wild-engine-worker-phases [biome] [seed] [report.json] [seconds <= 300]');
const hash=path=>createHash('sha256').update(readFileSync(new URL(path,import.meta.url))).digest('hex');
const source={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  cppSha256:hash('../../src/world/hierarchical-wasm/spatial-savanna.cpp'),
  wasmSha256:hash('../../src/world/hierarchical-wasm/spatial-savanna.wasm'),
  runnerSha256:hash('./profile-wild-engine-worker-phases.mjs')};
const candidates=[];
for(let dz=-54;dz<=54;dz+=2)for(let dx=-54;dx<=54;dx+=2)
  candidates.push({dx,dz,distance:Math.hypot(dx,dz)});
candidates.sort((a,b)=>a.distance-b.distance||a.dz-b.dz||a.dx-b.dx);
const rows=[];
for(const phase of phases){
  const {state,nav,session,start,loaded}=await createSpatialCampaignOpening({
    seed,biome,slotId:`engine-workers-${biome}-${seed}-${phase.day}`});
  try{
    state.tutorial.step='done';state.initialPreparation=false;
    state.ledger.balance=rational(1000000);
    let placed=0;
    for(const {dx,dz} of candidates){
      if(placed===phase.crops)break;
      const x=start.site.center.x+dx,z=start.site.center.z+dz;
      const [x0,z0,x1,z1]=nav.activeBounds;
      if(x<x0+5||x>x1-5||z<z0+5||z>z1-5||!nav.placement(x,z,.4).valid)continue;
      try{if(Game.plant(state,`worker-stage-${placed}`,'mijo',x,z,nav))placed++;}
      catch(error){if(error.message!=='Necesitas separar las plantas')throw error;}
    }
    if(placed!==phase.crops)throw Error(`Only ${placed}/${phase.crops} crops could be placed`);
    state.day=phase.day;state.completedNights=phase.day-1;state.time=15;
    state.dayPlan={done:true};state.nightPlan={done:true};
    Game.pause(state,'hiring');
    Game.hire(state,`worker-stage-hire-${phase.day}`,{olderFemale:3});
    if(state.workers.length!==3)
      throw Error('Could not hire three native workers');
    const initial=state.workers.map(worker=>({id:worker.id,x:worker.x,z:worker.z}));
    const before=process.memoryUsage(),startMs=performance.now(),tickMs=[];
    let elapsed=0,peakLoaded=loaded.size,peakTasks=state.tasks.length;
    while(elapsed<duration&&!state.result&&!state.pauses.length){
      const dt=Math.min(.25,duration-elapsed),tickStart=performance.now();
      Game.tick(state,dt,nav);
      tickMs.push(performance.now()-tickStart);elapsed+=dt;
      peakLoaded=Math.max(peakLoaded,loaded.size);
      peakTasks=Math.max(peakTasks,state.tasks.length);
    }
    const after=process.memoryUsage();
    const sortedTicks=[...tickMs].sort((a,b)=>a-b);
    rows.push({biome,seed,day:phase.day,crops:placed,workers:state.workers.length,
      elapsed,ticks:tickMs.length,loopMs:performance.now()-startMs,
      tickMsTotal:tickMs.reduce((sum,value)=>sum+value,0),
      firstTickMs:tickMs[0],tickMsP95:sortedTicks[Math.floor((sortedTicks.length-1)*.95)],
      tickMsMax:Math.max(...tickMs),
      tickMsMean:tickMs.reduce((sum,value)=>sum+value,0)/tickMs.length,
      workerDistance:initial.map(point=>{
        const worker=state.workers.find(item=>item.id===point.id);
        return {id:point.id,distance:Math.hypot(worker.x-point.x,worker.z-point.z),status:worker.status};
      }),
      events:Object.fromEntries(['WaterSatisfied','CropPicked','CrateDelivered','ActorMobileCollisionRecovery']
        .map(type=>[type,state.events.filter(event=>event.type===type).length])),
      tasks:state.tasks.length,peakTasks,
      loadedChunks:loaded.size,peakLoadedChunks:peakLoaded,
      heapDeltaBytes:after.heapUsed-before.heapUsed,
      result:state.result,pauses:state.pauses,topologyRevision:session.topologySource.revision(),
      native:session.core.metrics()});
  }catch(error){rows.push({biome,seed,day:phase.day,error:error.message});}
  finally{session.dispose();}
}
const report={source,description:'Constructed native worker workloads; no virtual-player campaign or balance claim',rows};
if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
