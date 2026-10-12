// QA wall-clock observations only. No state/navigation commands or RNG access.
export function createNativeShortTimingObserver({now=()=>performance.now(),slowMs=2000,maximumSlowWindows=3}={}){
 if(!Number.isFinite(slowMs)||slowMs<=0||!Number.isSafeInteger(maximumSlowWindows)||maximumSlowWindows<1)throw Error('Invalid timing stop');
 let start=null,decision=null,count=0,totalMs=0,maximumMs=0,slowWindows=0,last=null;const longest=[],histogram={below10:0,below100:0,below1000:0,below2000:0,atLeast2000:0};
 return {decision(row){decision={...row};start=now();},tick(state){
  if(start===null)return null;const milliseconds=now()-start;if(!Number.isFinite(milliseconds)||milliseconds<0)throw Error('Invalid observed clock');start=null;
  count++;totalMs+=milliseconds;maximumMs=Math.max(maximumMs,milliseconds);if(milliseconds>=slowMs)slowWindows++;
  histogram[milliseconds<10?'below10':milliseconds<100?'below100':milliseconds<1000?'below1000':milliseconds<2000?'below2000':'atLeast2000']++;
  last={count,milliseconds,day:state.day,time:state.time,elapsed:state.elapsed,decision,
   workers:state.workers.length,tasks:state.tasks.length,living:state.plants.filter(p=>p.alive).length,activeAnimals:state.raid?.animals.filter(a=>a.status!=='gone').length??0};
  longest.push(last);longest.sort((a,b)=>b.milliseconds-a.milliseconds);if(longest.length>16)longest.length=16;
  return {...last,slow:milliseconds>=slowMs,stop:slowWindows>=maximumSlowWindows};
 },report:()=>({count,totalMs,maximumMs,slowWindows,slowMs,maximumSlowWindows,histogram,last,longest,
  scope:'onDecision to onTick window: native Game.tick plus agricultural/evidence/accounting observers. Excludes prior strategy/entry presentation work; not isolated Game.tick, GPU or comparative performance.'})};
}
