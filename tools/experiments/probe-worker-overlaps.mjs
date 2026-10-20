import {simulateNativeCampaign} from '../native-campaign-runner.mjs';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';
import {actorBlockers,actorSegmentClear} from '../../src/simulation/actor-motion.js';

const [daysArg='14',seedArg='712',strategy='good',biome='sabana',culture='mapungubwe',
  backend='wild-engine']=process.argv.slice(2);
const days=Number(daysArg),seed=Number(seedArg);
if(!Number.isSafeInteger(days)||days<1||days>100||!Number.isSafeInteger(seed)||seed<0||
  !['wild-engine','legacy'].includes(backend))
  throw Error('Usage: node tools/experiments/probe-worker-overlaps.mjs [days] [seed] [strategy] [biome] [culture] [wild-engine|legacy]');

let sampledTicks=0,overlapTicks=0,lateOverlapTicks=0,pairs=0,maxPenetration=0;
let workOverlapPairs=0,phasedWorkOverlapPairs=0;
const byDay=new Map(),byStatus=new Map(),examples=[],workExamples=[];
const overlapWindows={'0-3':0,'3-10':0,'10-30':0,'30+':0};
let villageEntry=null;
const inspectDay=Number(process.env.WG_WORKER_INSPECT_DAY??0),
  inspectTime=Number(process.env.WG_WORKER_INSPECT_TIME??0),
  inspectIds=new Set((process.env.WG_WORKER_INSPECT_IDS??'').split(',').filter(Boolean));
let diagnostic=null;
const onTick=(state,nav)=>{
  villageEntry??=state.villages[0]?.entry??null;
  sampledTicks++;
  const workers=state.workers.filter(w=>w.status!=='home'&&Number.isFinite(w.x)&&Number.isFinite(w.z));
  let found=false;
  for(let i=0;i<workers.length;i++)for(let j=i+1;j<workers.length;j++){
    const a=workers[i],b=workers[j],distance=Math.hypot(a.x-b.x,a.z-b.z);
    const penetration=(a.radius??.28)+(b.radius??.28)-distance;
    if(penetration<=1e-6)continue;
    found=true;pairs++;maxPenetration=Math.max(maxPenetration,penetration);
    const day=byDay.get(state.day)??{ticks:0,pairs:0,firstTime:state.time,lastTime:state.time};
    day.pairs++;day.firstTime=Math.min(day.firstTime,state.time);day.lastTime=Math.max(day.lastTime,state.time);
    byDay.set(state.day,day);
    const status=[a.status,b.status].sort().join('/');
    byStatus.set(status,(byStatus.get(status)??0)+1);
    if(state.time>30+1e-6){
      workOverlapPairs++;
      if((a.mobilePhaseRemaining??0)>0||(b.mobilePhaseRemaining??0)>0)
        phasedWorkOverlapPairs++;
    }
    if(examples.length<12)examples.push({day:state.day,time:state.time,a:a.id,b:b.id,
      aStatus:a.status,bStatus:b.status,distance,penetration});
    if(state.time>10&&workExamples.length<500)workExamples.push({day:state.day,time:state.time,
      a:a.id,b:b.id,aStatus:a.status,bStatus:b.status,
      aPhase:a.mobilePhaseRemaining??0,bPhase:b.mobilePhaseRemaining??0,
      ax:a.x,az:a.z,bx:b.x,bz:b.z,
      aDestination:a.destinationId,bDestination:b.destinationId,
      aNext:a.path?.[0]??null,bNext:b.path?.[0]??null,
      aPathLength:a.path?.length??0,bPathLength:b.path?.length??0,
      aRaidReturn:a.raidReturn??false,bRaidReturn:b.raidReturn??false,
      distance,penetration});
    if(!diagnostic&&inspectDay===state.day&&state.time>=inspectTime&&
      inspectIds.has(a.id)&&inspectIds.has(b.id)){
      const inspect=w=>{
        const next=w.path?.[0],blockers=actorBlockers(state,w,true,8);
        return {id:w.id,x:w.x,z:w.z,status:w.status,destinationId:w.destinationId,
          next,pathLength:w.path?.length??0,phase:w.mobilePhaseRemaining??0,
          blockers:blockers.map(item=>({id:item.id,x:item.x,z:item.z,status:item.status})),
          nextChecks:next?{stand:nav.walkable(next.x,next.z,w.radius??.28,null,true),
            static:nav.workerMotionClear(w,next,w.radius??.28),
            dynamic:actorSegmentClear(w,next,w,blockers)}:null};
      };
      diagnostic={day:state.day,time:state.time,villageEntry,workers:[inspect(a),inspect(b)]};
    }
  }
  if(found){
    overlapTicks++;byDay.get(state.day).ticks++;
    if(state.time>3+1e-6)lateOverlapTicks++;
    overlapWindows[state.time<=3+1e-6?'0-3':state.time<=10+1e-6?'3-10':
      state.time<=30+1e-6?'10-30':'30+']++;
  }
};

const result=await simulateNativeCampaign({days,strategy,seed,biome,culture,
  slotId:`native-${strategy}-${seed}`,
  ...(backend==='wild-engine'?{openingFactory:createSpatialCampaignOpening,
    spatialAdvice:true,nativeIntents:true,nativeWallPlans:true,reloadRaids:false}:{}),
  onTick});
console.log(JSON.stringify({days,seed,strategy,biome,culture,backend,
  completedNights:result.completedNights,result:result.result,
  money:result.money,living:result.daily?.at(-1)?.living,staff:result.daily?.at(-1)?.staff,
  delivered:result.counts?.CrateDelivered,
  collisionRecoveries:result.counts?.ActorMobileCollisionRecovery,
  gameTickMs:result.daily?.reduce((n,d)=>n+(d.wallTime?.gameTickMs??0),0),
  sampledTicks,overlapTicks,lateOverlapTicks,pairs,maxPenetration,
  villageEntry,diagnostic,overlapWindows,workOverlapPairs,phasedWorkOverlapPairs,
  byDay:[...byDay],byStatus:[...byStatus],examples,workExamples}));
