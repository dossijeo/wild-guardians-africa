import {readFileSync} from 'node:fs';

const [baselinePath,candidatePath]=process.argv.slice(2);
if(!baselinePath||!candidatePath)
  throw Error('Usage: node compare-worker-traces.mjs baseline.jsonl candidate.jsonl');
const read=path=>readFileSync(path,'utf8').trimEnd().split('\n').map(JSON.parse);
const baseline=read(baselinePath),candidate=read(candidatePath);
const firstDifference=(a,b)=>{
  const ids=new Set([...a.workers.map(worker=>worker.id),
    ...b.workers.map(worker=>worker.id)]);
  const left=new Map(a.workers.map(worker=>[worker.id,worker]));
  const right=new Map(b.workers.map(worker=>[worker.id,worker]));
  const workers=[];
  for(const id of ids){
    const before=left.get(id),after=right.get(id);
    if(JSON.stringify(before)!==JSON.stringify(after))workers.push({id,before,after});
  }
  return {tickTime:[a.time,b.time],money:[a.money,b.money],
    living:[a.living,b.living],routeStamp:[a.routeStamp,b.routeStamp],
    workerCount:[a.workers.length,b.workers.length],
    changedWorkers:workers.slice(0,5),changedWorkerCount:workers.length};
};
const count=Math.min(baseline.length,candidate.length),first={};
for(let i=0;i<count;i++){
  const a=baseline[i],b=candidate[i];
  const record=()=>({tick:i,previousTime:i?baseline[i-1].time:null,
    ...firstDifference(a,b)});
  if(!first.revision&&JSON.stringify(a.routeStamp)!==JSON.stringify(b.routeStamp))
    first.revision=record();
  if(!first.actor&&JSON.stringify(a.workers)!==JSON.stringify(b.workers))
    first.actor=record();
  if(!first.position&&JSON.stringify(a.workers.map(w=>[w.id,w.x,w.z]))!==
      JSON.stringify(b.workers.map(w=>[w.id,w.x,w.z])))
    first.position=record();
  if(!first.economy&&(a.money!==b.money||a.living!==b.living))
    first.economy=record();
  if(Object.keys(first).length===4)break;
}
console.log(JSON.stringify({comparedTicks:count,baselineTicks:baseline.length,
  candidateTicks:candidate.length,first},null,2));
