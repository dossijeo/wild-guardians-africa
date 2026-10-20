import {writeFileSync,mkdirSync} from 'node:fs';
import {simulateNativeCampaign} from '../native-campaign-runner.mjs';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';

const variant=process.argv[2];
if(!['reference','candidate'].includes(variant))
  throw Error('Usage: node tools/experiments/trace-mobile-detour.mjs reference|candidate [days]');
const days=Number(process.argv[3]??2);
globalThis.__wildDisableMobileDetour=variant==='reference';
const ticks=[],detours=[];
let attempts=0,found=0,maxLength=0;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
globalThis.__wildMobileDetourProbe=event=>{
  attempts++;
  if(event.result==='found'){
    found++;
    let previous=event.start,length=0;
    for(const point of event.points){length+=distance(previous,point);previous=point;}
    maxLength=Math.max(maxLength,length);
    if(detours.length<300)detours.push({clock:globalThis.__wildTraceClock,
      ...event,length,direct:distance(event.start,event.goal)});
  }
};
const hash=value=>{
  let result=2166136261;
  for(let i=0;i<value.length;i++)result=Math.imul(result^value.charCodeAt(i),16777619);
  return (result>>>0).toString(16).padStart(8,'0');
};
const result=await simulateNativeCampaign({days,seed:712,strategy:'good',
  biome:'sabana',culture:'mapungubwe',slotId:'native-good-712',
  openingFactory:createSpatialCampaignOpening,spatialAdvice:true,
  nativeIntents:true,nativeWallPlans:true,reloadRaids:false,
  onTick:state=>{
    const clock={day:state.day,time:Number(state.time.toFixed(3))};
    globalThis.__wildTraceClock=clock;
    const actors=[...state.workers.map(actor=>[actor.id,actor.status,actor.x,actor.z,
      actor.taskId,actor.destinationId,actor.path?.[0]?.x,actor.path?.[0]?.z]),
      ...(state.raid?.animals??[]).map(actor=>[actor.id,actor.status,actor.x,
        actor.z,actor.targetId,actor.path?.[0]?.x,actor.path?.[0]?.z])];
    ticks.push({...clock,hash:hash(JSON.stringify(actors))});
  }});
mkdirSync('.cache',{recursive:true});
const output={variant,days,attempts,found,maxLength,detours,ticks,
  completedNights:result.completedNights,money:result.money,
  living:result.daily.at(-1)?.living,delivered:result.counts.CrateDelivered};
const path=`.cache/mobile-detour-${variant}-${days}.json`;
writeFileSync(path,JSON.stringify(output));
console.log(JSON.stringify({path,variant,days,attempts,found,maxLength,
  ticks:ticks.length,completedNights:output.completedNights,
  money:output.money,living:output.living,delivered:output.delivered}));
