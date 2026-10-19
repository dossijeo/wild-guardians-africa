import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {serialize} from '../../src/persistence/snapshots.js';
import {simulateNativeCampaign} from '../native-campaign-runner.mjs';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';

const [biome='desierto',daysText='40',seedText='123',output]=process.argv.slice(2);
const days=Number(daysText),seed=Number(seedText);
if(!output||!Number.isInteger(days)||days<1||days>100||!Number.isInteger(seed))
  throw Error('Usage: audit-defended-raid-pressure.mjs BIOME DAYS SEED OUTPUT.json.gz');
const sha256=value=>createHash('sha256').update(value).digest('hex');
const wasm=process.env.WILD_ENGINE_SPATIAL_SERVICES_WASM??
  'src/world/wild-engine/spatial-savanna.wasm';
const daily=[],report={biome,days,seed,
  runnerSha256:sha256(readFileSync(new URL('../native-campaign-runner.mjs',import.meta.url))),
  wasmSha256:sha256(readFileSync(wasm))};
const began=performance.now();
let navigation,spatialSession;
let captured=false;
const captureDay=Number(process.env.WILD_ENGINE_CAPTURE_RAID_DAY??0);
const captureDawnDay=Number(process.env.WILD_ENGINE_CAPTURE_DAWN_DAY??0);
let capturedDawn=false;
const captureTickDay=Number(process.env.WILD_ENGINE_CAPTURE_TICK_DAY??0);
const captureTickTime=Number(process.env.WILD_ENGINE_CAPTURE_TICK_TIME??1);
let capturedTick=false;
const traceDay=Number(process.env.WILD_ENGINE_TRACE_TICK_DAY??0);
const tickTrace=[];
const taskTraceDay=Number(process.env.WILD_ENGINE_TRACE_TASK_DAY??0);
const taskTrace=[];
let taskTraceInstalled=false,taskTraceState;
const openingFactory=async options=>{
  const opening=await createSpatialCampaignOpening(options);
  opening.nav.raidSelectionStats={};
  navigation=opening.nav;
  spatialSession=opening.session;
  return opening;
};
try{
  const run=await simulateNativeCampaign({days,seed,biome,strategy:'good',
    culture:'mapungubwe',defend:true,defensePolicy:'topological',
    spatialAdvice:true,decisionProfile:true,nativeIntents:true,
    nativeWallPlans:true,reloadRaids:false,
    openingFactory,onTick:(state,nav,step)=>{
      taskTraceState=state;
      if(!capturedTick&&state.day===captureTickDay&&
        state.time>=captureTickTime){
        capturedTick=true;
        writeFileSync(output+'.tick-state.json.gz',gzipSync(serialize(state)));
      }
      if(taskTraceDay&&state.day>=taskTraceDay-1&&!taskTraceInstalled&&
        nav.intentTaskPlanner){
        taskTraceInstalled=true;
        const planner=nav.intentTaskPlanner;
        const original=planner.planIfNeeded;
        planner.planIfNeeded=seconds=>{
          const started=performance.now();
          const result=original(seconds);
          if(taskTraceState.day===taskTraceDay&&result&&taskTrace.length<1024){
            const tasks=new Map(taskTraceState.tasks.map(task=>[Number(task.id.split('-').at(-1)),task]));
            taskTrace.push({time:taskTraceState.time,ms:performance.now()-started,
              routeQueries:result.length?
                spatialSession.core.wasm.nav_intent_route_queries():0,
              candidates:result.length?
                spatialSession.core.wasm.nav_intent_candidate_count():0,
              workers:taskTraceState.workers.map(worker=>({id:worker.id,
                x:worker.x,z:worker.z,status:worker.status})),
              proposals:result.map(row=>({taskId:row.taskId,
                kind:tasks.get(row.taskId)?.kind,
                targetId:tasks.get(row.taskId)?.targetId,
                workerId:row.workerId,status:row.status,
                reason:row.cause}))});
          }
          return result;
        };
      }
      if(!capturedDawn&&state.day===captureDawnDay&&state.time<=1){
        capturedDawn=true;
        writeFileSync(output+'.dawn-state.json.gz',gzipSync(serialize(state)));
      }
      if(state.day===traceDay&&tickTrace.length<2048){
        const intent=nav.intentTaskPlanner?.metrics(state.elapsed);
        tickTrace.push({time:state.time,ms:step.gameTickMs,
          loaded:spatialSession?.stream.loaded().size??null,
          demand:nav.raidConnectivityDemand?.size??0,
          animals:state.raid?.animals.length??0,
          taskRoutes:intent?.nativeTaskRouteQueries??null,
          taskPlans:intent?.nativePlanningCalls??null,
          active:state.raid?.animals.filter(animal=>
            !['waiting','gone','retreating'].includes(animal.status)).length??0});
      }
      if(!captured&&captureDay===state.day&&
        state.raid?.animals.some(animal=>animal.status==='waiting')){
        captured=true;
        writeFileSync(output+'.raid-state.json.gz',gzipSync(serialize(state)));
      }
    },onDay:row=>{
      daily.push({day:row.day,living:row.living,money:row.money,
        gameTickMs:row.wallTime.gameTickMs,decisionMs:row.wallTime.decisionMs,
        raidSelection:structuredClone(navigation.raidSelectionStats)});
      console.log(JSON.stringify({day:row.day,living:row.living,money:row.money}));
    }});
  Object.assign(report,{status:'completed',result:run.result,
    completedNights:run.completedNights,daily,
    raids:run.raidEvidence,defense:run.defense,
    ...(traceDay?{tickTrace}:{}),
    ...(taskTraceDay?{taskTrace}:{}),
    finalStateSha256:sha256(serialize(run.state))});
}catch(error){
  Object.assign(report,{status:'error',message:error.message,stack:error.stack,
    daily,partialDay:error.nativeCampaignPartial?.day,
    partialTime:error.nativeCampaignPartial?.time,
    partialStateSha256:error.nativeCampaignPartial?.state?
      sha256(error.nativeCampaignPartial.state):null});
  if(error.nativeCampaignPartial?.state)
    writeFileSync(output+'.partial-state.json.gz',
      gzipSync(error.nativeCampaignPartial.state));
}
report.elapsedMs=performance.now()-began;
writeFileSync(output,gzipSync(JSON.stringify(report)));
console.log(JSON.stringify({status:report.status,result:report.result,
  completedNights:report.completedNights,partialDay:report.partialDay,
  elapsedMs:report.elapsedMs,output}));
if(report.status==='error')process.exitCode=1;
