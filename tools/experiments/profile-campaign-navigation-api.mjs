import {performance} from 'node:perf_hooks';
import {simulateNativeCampaign} from '../native-campaign-runner.mjs';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';

const days=Number(process.argv[2]??8),seed=Number(process.argv[3]??712),
  mode=process.argv[4]??'sampled',backend=process.argv[5]??'wild-engine';
if(!Number.isSafeInteger(days)||days<1||days>30||!Number.isSafeInteger(seed)||seed<0||
  !['sampled','baseline','stack'].includes(mode)||
  !['wild-engine','legacy'].includes(backend))
  throw Error('Usage: node tools/experiments/profile-campaign-navigation-api.mjs [days 1..30] [seed] [sampled|baseline|stack] [wild-engine|legacy]');

const methods=['workerPath','path','approachPath','walkable','segmentClear',
  'workerMotionClear','propsAt','regionFor','regionConnected','wallPlacement',
  'workerSegmentRisk','knownWorkerSegmentRisk'];
const rows=new Map(),callers=new Map();
let installed=false,observedTicks=0,gameTickMs=0,currentDay=1;
const install=nav=>{
  for(const name of methods){
    const original=nav[name];if(typeof original!=='function')continue;
    const stride=['segmentClear','walkable','propsAt','workerMotionClear',
      'knownWorkerSegmentRisk'].includes(name)?64:1;
    nav[name]=function(...args){
      const key=`${currentDay}:${name}`;
      let row=rows.get(key);
      if(!row){row={day:currentDay,name,stride,count:0,samples:0,sampledMs:0};rows.set(key,row);}
      row.count++;
      if(row.count%stride!==0)return original.apply(this,args);
      if(mode==='stack'&&name==='segmentClear'){
        const caller=new Error().stack?.split('\n')[2]?.trim()??'unknown';
        callers.set(caller,(callers.get(caller)??0)+1);
      }
      const start=performance.now();
      try{return original.apply(this,args);}
      finally{row.samples++;row.sampledMs+=performance.now()-start;}
    };
  }
  installed=true;
};
const result=await simulateNativeCampaign({days,strategy:'good',seed,
  biome:'sabana',culture:'mapungubwe',slotId:`native-good-${seed}`,
  ...(backend==='wild-engine'?{openingFactory:createSpatialCampaignOpening,
    spatialAdvice:true,nativeIntents:true,nativeWallPlans:true,reloadRaids:false}:{}),
  onTick:(state,nav,timing)=>{
    observedTicks++;gameTickMs+=timing.gameTickMs??0;
    currentDay=state.day;
    if(mode!=='baseline'&&!installed)install(nav);
  }});
const summary=[...rows.values()].map(row=>({...row,
  estimatedInclusiveMs:row.samples?row.sampledMs*row.count/row.samples:null}))
  .sort((a,b)=>a.day-b.day||b.estimatedInclusiveMs-a.estimatedInclusiveMs);
console.log(JSON.stringify({scope:'Actual good-policy campaign. Sampled and stack modes wrap navigation methods after the first tick and time one in 64 hot calls; estimates are inclusive, may double-count nested calls, and cannot separate C++ from JS. Stack mode also records the immediate caller of sampled segmentClear calls. Compare baseline and sampled Game.tick time to gauge profiler overhead; neither is an algorithm A/B.',
  days,seed,mode,backend,completedNights:result.completedNights,result:result.result,
  money:result.money,living:result.daily?.at(-1)?.living,
  delivered:result.counts?.CrateDelivered,
  observedTicks,gameTickMs,methods:summary,
  segmentClearCallers:[...callers].sort((a,b)=>b[1]-a[1])}));
