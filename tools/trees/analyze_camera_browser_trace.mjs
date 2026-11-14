import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';

const tracePath=process.env.CAMERA_TRACE_INPUT??'docs/guardian/gpu-animation/camera-browser-trace.json.gz';
const reportPath=process.env.CAMERA_TRACE_REPORT??'docs/guardian/gpu-animation/camera-browser-trace-input.json';
const output=process.env.CAMERA_TRACE_OUTPUT??'docs/guardian/gpu-animation/camera-browser-trace-summary.json';
const trace=JSON.parse(gunzipSync(await readFile(tracePath))),report=JSON.parse(await readFile(reportPath,'utf8')),events=trace.traceEvents??[],marker=events.find(e=>e.name==='qa-camera-trace-anchor'),p=report.cameraPause;
if(!marker||!Number.isFinite(p?.traceAnchor)||!p.frameRows?.length)throw Error('Trace anchor or camera frames missing');
const names=new Map(events.filter(e=>e.name==='thread_name').map(e=>[`${e.pid}:${e.tid}`,e.args?.name??'unknown']));
const top=[...p.frameRows].sort((a,b)=>b.wallInterval-a.wallInterval).slice(0,8).map(frame=>{
 const start=marker.ts+(frame.at-frame.wallInterval-p.traceAnchor)*1000,end=marker.ts+(frame.at-p.traceAnchor)*1000;
 const overlapping=events.filter(e=>e.ph==='X'&&Number.isFinite(e.ts)&&e.dur>=1000&&e.ts<=end&&e.ts+e.dur>=start).sort((a,b)=>b.dur-a.dur).slice(0,30).map(e=>({name:e.name,category:e.cat,thread:names.get(`${e.pid}:${e.tid}`)??`${e.pid}:${e.tid}`,start:(e.ts-marker.ts)/1000+p.traceAnchor,duration:e.dur/1000,overlap:Math.max(0,Math.min(end,e.ts+e.dur)-Math.max(start,e.ts))/1000,...(e.name==='FunctionCall'?{functionName:e.args?.data?.functionName,url:e.args?.data?.url,line:e.args?.data?.lineNumber}: {})}));
 return {at:frame.at,wallInterval:frame.wallInterval,rafInterval:frame.rafInterval,overlapping};
});
await writeFile(output,JSON.stringify({scope:'One instrumented paused-camera browser trace. Events overlap and nest; durations cannot be summed. A thread event does not alone prove the cause of a frame delay or GPU execution time.',renderer:report.renderer,selected:p.selected,traceBytes:p.traceBytes,traceAnchor:p.traceAnchor,frames:p.frameRows.length,top},null,2)+'\n');
console.log(JSON.stringify({frames:p.frameRows.length,traceBytes:p.traceBytes,top:top.slice(0,2)}));
