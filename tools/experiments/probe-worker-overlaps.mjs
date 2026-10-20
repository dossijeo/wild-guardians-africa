import {simulateNativeCampaign} from '../native-campaign-runner.mjs';

const [daysArg='14',seedArg='712',strategy='good',biome='sabana',culture='mapungubwe']=process.argv.slice(2);
const days=Number(daysArg),seed=Number(seedArg);
if(!Number.isSafeInteger(days)||days<1||days>100||!Number.isSafeInteger(seed)||seed<0)
  throw Error('Usage: node tools/experiments/probe-worker-overlaps.mjs [days] [seed] [strategy] [biome] [culture]');

let sampledTicks=0,overlapTicks=0,lateOverlapTicks=0,pairs=0,maxPenetration=0;
const byDay=new Map(),byStatus=new Map(),examples=[];
const onTick=state=>{
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
    if(examples.length<12)examples.push({day:state.day,time:state.time,a:a.id,b:b.id,
      aStatus:a.status,bStatus:b.status,distance,penetration});
  }
  if(found){
    overlapTicks++;byDay.get(state.day).ticks++;
    if(state.time>3+1e-6)lateOverlapTicks++;
  }
};

const result=await simulateNativeCampaign({days,strategy,seed,biome,culture,
  slotId:`native-${strategy}-${seed}`,onTick});
console.log(JSON.stringify({days,seed,strategy,biome,culture,
  completedNights:result.completedNights,result:result.result,
  money:result.money,living:result.daily?.at(-1)?.living,staff:result.daily?.at(-1)?.staff,
  delivered:result.counts?.CrateDelivered,
  collisionRecoveries:result.counts?.ActorMobileCollisionRecovery,
  gameTickMs:result.daily?.reduce((n,d)=>n+(d.wallTime?.gameTickMs??0),0),
  sampledTicks,overlapTicks,lateOverlapTicks,pairs,maxPenetration,
  byDay:[...byDay],byStatus:[...byStatus],examples}));
