import {workVfxPlans} from './work-vfx.js';

// The visual interval may use only an already confirmed, uninterrupted
// watering task. Derive effect times using the same function as normal VFX.
export function confirmedHistoricalWaterPlans(state,preview){
 const ticks=preview?.trace?.actorTickStates;
 if(!state||!Array.isArray(state.workers)||!Array.isArray(state.tasks)||!ticks?.complete||!Array.isArray(ticks.actors)||!Number.isFinite(preview.start)||!Number.isFinite(preview.end)||preview.end<=preview.start)return null;
 const plans=workVfxPlans({...state,events:[]}),water=plans.filter(plan=>plan.id==='water');
 if(!water.length)return {plans:[],watering:false};
 if(plans.length!==water.length)return null;
 const result=[];
 for(const plan of water){
  const worker=state.workers.find(item=>item.id===plan.workerId),task=state.tasks.find(item=>item.id===worker?.taskId),matches=ticks.actors.filter(item=>item.actorId===plan.workerId),samples=matches[0]?.samples;
  if(!worker||task?.kind!=='water'||typeof task.targetId!=='string'||!task.targetId||matches.length!==1||!Array.isArray(samples)||samples.length<2||samples[0]?.at!==preview.start||samples.at(-1)?.at!==preview.end)return null;
  const times=[];for(let i=0;i<samples.length;i++){
   const sample=samples[i];if(!Number.isFinite(sample.at)||i&&sample.at<=samples[i-1].at||sample.status!=='acting'||sample.taskId!==worker.taskId||sample.actionTaskKind!=='water'||sample.actionTargetId!==task.targetId||!Number.isFinite(sample.actionRemaining)||sample.actionRemaining<=0||i&&sample.actionRemaining>samples[i-1].actionRemaining||sample.x!==worker.x||sample.z!==worker.z||sample.heading!==(worker.heading??null))return null;
   if(!i&&sample.actionRemaining!==worker.actionRemaining)return null;
   const next=workVfxPlans({...state,workers:[{...worker,actionRemaining:sample.actionRemaining}],events:[]});if(next.length!==1||next[0].key!==plan.key||next[0].id!=='water'||!Number.isFinite(next[0].time)||i&&next[0].time<times[i-1].time)return null;
   times.push({at:sample.at,time:next[0].time});
  }
  result.push({worker,task,plan,times});
 }
 return {plans:result,watering:true};
}

export function historicalWaterTime(samples,elapsed){
 if(!Array.isArray(samples)||samples.length<2||!Number.isFinite(elapsed))throw TypeError('Invalid historical water time');
 if(elapsed<=samples[0].at)return samples[0].time;if(elapsed>=samples.at(-1).at)return samples.at(-1).time;
 let i=1;while(samples[i].at<elapsed)i++;const a=samples[i-1],b=samples[i],t=(elapsed-a.at)/(b.at-a.at);return a.time+(b.time-a.time)*t;
}
