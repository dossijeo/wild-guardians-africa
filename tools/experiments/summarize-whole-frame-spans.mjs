import fs from 'node:fs';
const root=process.argv[2]??'docs/qa/residual-spikes-20261027/whole-frame-expanded';
const r=JSON.parse(fs.readFileSync(root+'/1-baseline/raid-ui.json')),c=r.casts[0],start=c.start,end=start+40000;
const spans=r.residual.phases.filter(x=>x.at>=start&&x.at+x.ms<=end&&!x.label.startsWith('world-frame-'));
const grouped=new Map();for(const x of spans){const key=x.label+'|'+(x.scope??'wrapped synchronous call'),v=grouped.get(key)??{label:x.label,scope:x.scope,count:0,total:0,max:0};v.count++;v.total+=x.ms;v.max=Math.max(v.max,x.ms);grouped.set(key,v);}
const longFrames=r.wholeFrame.longFrames.filter(x=>x.startTime>=start&&x.startTime+x.duration<=end&&x.scripts?.some(s=>s.invoker==='Worker.onmessage'));
const result={dropped:r.residual.droppedPhases,grouped:[...grouped.values()].sort((a,b)=>b.max-a.max),workerFrames:longFrames.map(x=>({...x,overlappingSpans:spans.filter(s=>s.at<x.startTime+x.duration&&s.at+s.ms>x.startTime)})),limits:['Awaited spans include concurrent work/waits and are not CPU time. Nested synchronous spans overlap; do not sum them.','CPU sampling and added spans make this diagnostic rather than performance acceptance.','Worker listener attribution may include promise continuations; source location alone is not proof of expensive message deserialization or termination.']};
fs.writeFileSync(root+'/span-attribution.json',JSON.stringify(result,null,2));console.log(JSON.stringify({dropped:result.dropped,grouped:result.grouped.slice(0,25),workerFrames:longFrames.length},null,2));
