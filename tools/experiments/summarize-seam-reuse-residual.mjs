import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
const base='docs/qa/residual-spikes-20261027',rows=[];
for(const group of ['seam-reuse-abab','seam-reuse-volcano-abab'])for(const run of ['2-candidate','4-candidate']){
 const source=`${base}/${group}/${run}/report.json.gz`,report=JSON.parse(gunzipSync(fs.readFileSync(source))),e=report.result.qualityCycle.execution;
 const worst=[...e.frames].sort((a,b)=>b.ms-a.ms).slice(0,10).map(frame=>{
  const phases=e.phases.filter(p=>p.timestamp===frame.timestamp),render=phases.find(p=>p.label==='render');
  if(!render)throw Error('Missing render phase');
  const start=render.at-render.ms,end=render.at;
  const operations=e.farOperations.filter(s=>s.at>=start-.01&&s.at+s.ms<=end+.01);
  const intervals=operations.map(s=>[Math.max(start,s.at),Math.min(end,s.at+s.ms)]).sort((a,b)=>a[0]-b[0]);
  let covered=0,right=start;for(const [a,b]of intervals){covered+=Math.max(0,b-Math.max(a,right));right=Math.max(right,b);}
  return {frame,phases,operations,recordedOperationUnionMs:covered,renderOutsideRecordedOperationsMs:Math.max(0,render.ms-covered)};
 });
 rows.push({source,hardware:e.hardware,worst});
}
const result={scope:'Existing instrumented candidate runs, top ten CPU frames per run. Main phase at is the end timestamp. Far operations only include selected methods >=1ms; union avoids nested double counting. Uncovered render time is unclassified, not evidence of GPU or driver cost. No new benchmark or performance claim.',rows};
fs.writeFileSync(`${base}/seam-reuse-residual-attribution.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(rows.map(r=>({source:r.source,worst:r.worst.slice(0,3).map(f=>({cpuMs:f.frame.ms,renderMs:f.phases.find(p=>p.label==='render').ms,coveredMs:f.recordedOperationUnionMs,operations:f.operations.map(s=>({label:s.label,ms:s.ms}))}))})),null,2));
