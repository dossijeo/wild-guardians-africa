import {readFileSync} from 'node:fs';

const file=process.argv[2];
if(!file)throw Error('Usage: analyze-worker-route-progress.mjs <probe-report.json>');
const report=JSON.parse(readFileSync(file,'utf8'));
const recoveries=report.recoverySamples??[],events=report.motionSamples??[];
const overlapEvents=new Set();
for(const example of (report.workExamples??[]).filter(item=>item.time>30)){
  const match=events.filter(event=>event.day===example.day&&
    (event.actorId===example.a||event.actorId===example.b)&&
    event.time<=example.time+1e-6&&example.time-event.time<=3.2)
    .sort((a,b)=>b.time-a.time)[0];
  if(match)overlapEvents.add(`${match.actorId}:${match.elapsed.toFixed(1)}`);
}
const observations=events.map(event=>{
  const recovery=recoveries.find(item=>item.actorId===event.actorId&&
    Math.abs(item.elapsed-event.elapsed)<.11);
  const history=recovery?.priorMotion??[],first=history[0],last=history.at(-1);
  let travelled=0;
  for(let i=1;i<history.length;i++)travelled+=Math.hypot(
    history[i].x-history[i-1].x,history[i].z-history[i-1].z);
  return {actorId:event.actorId,status:event.status,trigger:event.trigger,
    elapsed:event.elapsed,overlap:overlapEvents.has(`${event.actorId}:${event.elapsed.toFixed(1)}`),
    samples:history.length,windowSeconds:first&&last?last.elapsed-first.elapsed:0,
    travelled,routeDecrease:first&&last?first.remainingRoute-last.remainingRoute:null,
    directHomeDecrease:first?.directHomeDistance!=null&&last?.directHomeDistance!=null?
      first.directHomeDistance-last.directHomeDistance:null,
    pathLengthChange:first&&last?last.pathLength-first.pathLength:null};
});
const summarize=items=>({count:items.length,withTwoSamples:items.filter(x=>x.samples>=2).length,
  movingMoreThan075m:items.filter(x=>x.travelled>.75).length,
  routeDecreasedMoreThan075m:items.filter(x=>x.routeDecrease>.75).length,
  directHomeDecreasedMoreThan075m:items.filter(x=>x.directHomeDecrease>.75).length,
  movingButHomeDistanceNotImproved:items.filter(x=>x.travelled>.75&&
    x.directHomeDecrease!=null&&x.directHomeDecrease<=.75).length});
const destinationStalls=observations.filter(x=>x.trigger==='destination-stall');
console.log(JSON.stringify({stateHash:report.stateHash,
  all:summarize(observations),destinationStalls:summarize(destinationStalls),
  overlapDestinationStalls:summarize(destinationStalls.filter(x=>x.overlap)),
  illustrative:destinationStalls.filter(x=>x.status==='returning'&&x.routeDecrease>2&&
    x.directHomeDecrease!=null&&x.directHomeDecrease<.75).slice(0,6)},null,2));
