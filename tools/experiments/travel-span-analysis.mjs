import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';

// Trace spans are nested (renderer -> draw -> GL). Their durations must not
// be summed as independent work. This is temporal association, not causality.
export function coveredDuration(spans,start,end){
 const clipped=spans.map(s=>[Math.max(start,s.at),Math.min(end,s.at+s.cpuMs)])
  .filter(([a,b])=>Number.isFinite(a)&&Number.isFinite(b)&&b>a).sort((a,b)=>a[0]-b[0]);
 let total=0,left=0,right=0;
 for(const [a,b] of clipped){if(a>right){total+=right-left;left=a;right=b;}else right=Math.max(right,b);}
 return total+right-left;
}

export function analyzeTravelSpans(report,threshold=100){
 if(!report.done||report.failed||!Array.isArray(report.frames)||!Array.isArray(report.segments))throw Error('Completed travel report required');
 const groups=new Map();
 for(const span of report.segments){if(!Number.isFinite(span.at)||!Number.isFinite(span.cpuMs)||span.cpuMs<0)throw Error('Invalid trace span');const list=groups.get(span.name)??[];list.push(span);groups.set(span.name,list);}
 const gaps=report.frames.filter(f=>Number.isFinite(f.intervalMs)&&f.intervalMs>threshold).map(f=>{
  const start=f.at-f.intervalMs,end=f.at;
  return {endMs:end,intervalMs:f.intervalMs,traceCoveredMs:coveredDuration(report.segments,start,end),
   categories:[...groups].map(([name,spans])=>({name,coveredMs:coveredDuration(spans,start,end)})).filter(s=>s.coveredMs>0).sort((a,b)=>b.coveredMs-a.coveredMs)};
 });
 return {scope:'Temporal overlap with RAF timestamp gaps; nested categories overlap and must not be added. Trace instrumentation perturbs timing. Uncovered time is not a GPU measurement or proof of idle CPU.',
  frames:report.frames.length,traceSpans:report.segments.length,thresholdMs:threshold,gaps};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const bytes=await readFile(process.argv[2]);
 const text=bytes[0]===31&&bytes[1]===139?gunzipSync(bytes).toString('utf8'):bytes.toString('utf8');
 console.log(JSON.stringify(analyzeTravelSpans(JSON.parse(text)),null,2));
}
