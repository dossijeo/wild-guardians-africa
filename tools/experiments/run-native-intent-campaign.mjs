import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import {execFileSync} from 'node:child_process';
import {simulateNativeCampaign} from '../native-campaign-runner.mjs';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';

const [daysArg='7',biome='sabana',seedArg='712',strategy='good',
  out='docs/qa/wild-engine-intent-lifecycle/campaign-qa.json',mode='intent']=
  process.argv.slice(2);
const days=Number(daysArg),seed=Number(seedArg);
if(!Number.isSafeInteger(days)||days<1||days>100||
  !Number.isSafeInteger(seed)||seed<0)throw RangeError('Invalid campaign arguments');
if(!['intent','control'].includes(mode))throw RangeError('Unknown campaign mode');
const path=resolve(out),started=performance.now(),rows=[];
let latestState=null,latestNav=null,dayWorkerSnapshot=[];
const assignments=[],seenAssignments=new Set();
const intentTiming={};
let timedPlanner=null;
mkdirSync(dirname(path),{recursive:true});
const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const openingFactory=async (...args)=>{
  const opening=await createSpatialCampaignOpening(...args);
  opening.nav.raidSelectionStats={};
  return opening;
};
const raidSelection=()=>{
  const {groupVisits,...summary}=latestNav?.raidSelectionStats??{};
  return structuredClone(summary);
};
const entryDriverFactory=nav=>({
  async advancePresentation(){
    if(nav.raidEntryFailure)throw Error('Native entry failed: '+
      JSON.stringify(nav.raidEntryFailure));
  },
  async waitForEntry(){
    if(nav.raidEntryFailure)throw Error('Native entry failed: '+
      JSON.stringify(nav.raidEntryFailure));
  },
  report(){return {mode:'continuous-native-entry'};},
  async dispose(){}
});
const parameters={days,biome,seed,strategy,nativeIntents:mode==='intent',
  spatialAdvice:false,defensePolicy:'legacy',reloadRaids:false};
try{
  const result=await simulateNativeCampaign({...parameters,
    culture:'mapungubwe',nativeEvidence:false,
    openingFactory,entryDriverFactory,
    onTick:(state,nav)=>{
      latestState=state;latestNav=nav;nav.serviceRaidConnectivityDemand?.();
      if(nav.intentTaskPlanner&&timedPlanner!==nav.intentTaskPlanner){
        timedPlanner=nav.intentTaskPlanner;
        for(const name of ['planIfNeeded','reconcileWorkerRoutes',
          'reconcileNavigationRevision','flushTaskEvents','flushWorldEvents']){
          const original=timedPlanner[name];
          if(typeof original!=='function')continue;
          intentTiming[name]={calls:0,milliseconds:0};
          timedPlanner[name]=(...args)=>{
            const began=performance.now();
            try{return original(...args);}
            finally{
              intentTiming[name].calls++;
              intentTiming[name].milliseconds+=performance.now()-began;
            }
          };
        }
      }
      for(const worker of state.workers){
        if(!worker.taskId||!worker.path?.length)continue;
        const key=`${worker.id}:${worker.taskId}`;
        if(seenAssignments.has(key))continue;
        seenAssignments.add(key);
        const task=state.tasks.find(item=>item.id===worker.taskId);
        const target=state.plants.find(item=>item.id===task?.targetId)??
          state.crates.find(item=>item.id===task?.targetId)??
          state.structures.find(item=>item.id===task?.targetId);
        let length=0,from=worker;
        for(const point of worker.path){length+=Math.hypot(from.x-point.x,from.z-point.z);from=point;}
        assignments.push({day:state.day,time:state.time,workerId:worker.id,
          taskId:task?.id,kind:task?.kind,routeLength:length,
          directDistance:target?Math.hypot(worker.x-target.x,worker.z-target.z):null,
          pathCount:worker.path.length});
      }
      if(state.time>=290&&state.time<300)
        dayWorkerSnapshot=state.workers.map(worker=>{
          const target=worker.path?.at(-1);
          const task=state.tasks.find(item=>item.id===worker.taskId);
          return {id:worker.id,status:worker.status,
            taskId:worker.taskId,taskKind:task?.kind??null,
            pathCount:worker.path?.length??0,
            endpointDistance:target?
              Math.hypot(worker.x-target.x,worker.z-target.z):null,
            x:worker.x,z:worker.z};
        });
    },
    onDay:row=>{
      const counts=(items,key)=>Object.fromEntries([...new Set(items.map(key))]
        .sort().map(value=>[value,items.filter(item=>key(item)===value).length]));
      rows.push({day:row.day,living:row.living,money:row.money,
        staff:row.staff,planted:row.planted,delivered:row.delivered,
        destroyed:row.destroyed,pendingTasks:row.pendingTasks,
        workerStatuses:counts(dayWorkerSnapshot,item=>item.status),
        workers:dayWorkerSnapshot,
        taskKinds:counts(latestState?.tasks??[],item=>item.kind),
        blockedTaskKinds:counts((latestState?.tasks??[]).filter(item=>item.blocked),
          item=>item.kind),
        finance:{income:row.finance.income,wages:row.finance.wages,
          seeds:row.finance.seeds,repairs:row.finance.repairs,
          walls:row.finance.walls},
        result:row.result,wallTime:row.wallTime,
        nativeIntent:row.nativeIntent,
        raidSelection:raidSelection(),
        intentTiming:JSON.parse(JSON.stringify(intentTiming))});
      console.log(JSON.stringify(rows.at(-1)));
    }});
  const report={status:'completed',source,parameters,assignments,intentTiming,
    elapsedSeconds:(performance.now()-started)/1000,
    completedNights:result.completedNights,result:result.result,
    nativeIntent:result.nativeIntent,raidEvidence:result.raidEvidence,
    raidSelection:raidSelection(),rows};
  writeFileSync(path,JSON.stringify(report,null,2)+'\n');
}catch(error){
  const report={status:'error',source,parameters,assignments,intentTiming,
    elapsedSeconds:(performance.now()-started)/1000,
    day:error.nativeCampaignPartial?.day,message:error.message,stack:error.stack,rows};
  writeFileSync(path,JSON.stringify(report,null,2)+'\n');
  console.error(JSON.stringify({status:'error',day:report.day,message:report.message}));
  process.exitCode=1;
}
