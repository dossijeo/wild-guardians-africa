import {simulateNativeCampaign} from '../native-campaign-runner.mjs';

const days=Number(process.argv[2]??8),seed=Number(process.argv[3]??712);
if(!Number.isSafeInteger(days)||days<1||days>100||!Number.isSafeInteger(seed)||seed<0)
  throw Error('Usage: node tools/experiments/probe-worker-recovery-context.mjs [days] [seed]');

const seen=new Set(),rows=[];
const counts={worker:0,animal:0},destinations={watering:0,crop:0,home:0,delivery:0,other:0};
const onTick=state=>{
  for(const event of state.events.slice(-30)){
    if(event.type!=='ActorMobileCollisionRecovery'||seen.has(event.id))continue;
    seen.add(event.id);
    const worker=event.actorId?.startsWith('worker-');
    counts[worker?'worker':'animal']++;
    const actor=state.workers.find(w=>w.id===event.actorId)??
      state.raid?.animals.find(a=>a.id===event.actorId);
    if(!actor)continue;
    if(worker){
      const destination=actor.destinationId??'';
      const kind=destination.startsWith('water-point')?'watering':
        destination.startsWith('plant')?'crop':
        destination.startsWith('home')?'home':
        destination.startsWith('delivery')?'delivery':'other';
      destinations[kind]++;
    }
    if(rows.length>=10)continue;
    const nearby=state.workers.filter(w=>w!==actor&&w.status!=='home')
      .map(w=>({id:w.id,status:w.status,distance:Math.hypot(w.x-actor.x,w.z-actor.z)}))
      .filter(w=>w.distance<3).sort((a,b)=>a.distance-b.distance).slice(0,3);
    rows.push({day:state.day,time:state.time,id:event.actorId,
      status:actor.status,destinationId:actor.destinationId,taskId:actor.taskId,nearby});
  }
};

const result=await simulateNativeCampaign({days,strategy:'good',seed,
  biome:'sabana',culture:'mapungubwe',slotId:`native-good-${seed}`,onTick});
console.log(JSON.stringify({days,seed,completedNights:result.completedNights,
  result:result.result,counts,destinations,examples:rows}));
