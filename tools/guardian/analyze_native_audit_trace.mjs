import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const [receiptPath,outputPath]=process.argv.slice(2);
if(!receiptPath||!outputPath)throw Error('Usage: node analyze_native_audit_trace.mjs receipt.json output.json');
const tracePath=receiptPath.replace(/\.json$/,'.trace.json'),receiptBytes=await readFile(receiptPath),traceBytes=await readFile(tracePath),receipt=JSON.parse(receiptBytes),events=JSON.parse(traceBytes).traceEvents;
const r=receipt.result,anchor=receipt.traceClockAnchor,marks=events.filter(e=>e.name===anchor?.name&&e.cat?.includes('user_timing'));
if(!r?.hostAllocations||!anchor||marks.length!==1)throw Error('Trace needs one explicit clock anchor and a completed native receipt');
const offset=anchor.absoluteMs*1000-marks[0].ts,a=r.hostAllocations,start=a.before.samples.at(-1).at,end=a.ready.samples.at(-1).at,samples=a.after.samples.filter(e=>e.at>=start&&e.at<=end);
if(samples.length<2||samples[0].at!==start||samples.at(-1).at!==end)throw Error('Trace receipt does not retain the full preparation sample window');
const gaps=samples.slice(1).map((next,i)=>({previous:samples[i],next,milliseconds:next.at-samples[i].at})),largest=gaps.reduce((a,b)=>a.milliseconds>=b.milliseconds?a:b),key=e=>`${e.pid}:${e.tid}`,roles=new Map(),threadNames=new Map();
for(const e of events){
 if(e.ph==='M'&&e.name==='thread_name')threadNames.set(key(e),e.args?.name);
 if(e.name!=='FunctionCall')continue;const url=e.args?.data?.url??'';
 if(url.includes('/src/rendering/remote-webgpu-host.js'))roles.set(key(e),'draw');
 else if(url.includes('/tests/browser/fixtures/webgpu-preparation-stall-worker.js'))roles.set(key(e),'prepare');
}
if(![...roles.values()].includes('draw')||![...roles.values()].includes('prepare'))throw Error('Trace cannot identify both actual worker roles');
const absolute=e=>(e.ts+offset)/1000,overlaps=(e,from,to)=>e.ph==='X'&&absolute(e)<to&&absolute(e)+(e.dur??0)/1000>from;
const summarize=e=>({name:e.name,at:absolute(e),durationMs:(e.dur??0)/1000,offsetFromGapMs:absolute(e)-largest.previous.at,...(e.args?.data?.functionName?{function:e.args.data.functionName}:{}),...(e.args?.data?.url?{url:e.args.data.url,line:e.args.data.lineNumber}:{} )});
const workers=[...roles].map(([thread,role])=>{const current=events.filter(e=>key(e)===thread),tasks=current.filter(e=>e.name==='ThreadControllerImpl::RunTask'&&overlaps(e,start,end));return {role,thread,name:threadNames.get(thread),preparationTaskCount:tasks.length,maxPreparationTaskMs:Math.max(0,...tasks.map(e=>(e.dur??0)/1000)),tasksOverlappingLargestGap:current.filter(e=>overlaps(e,largest.previous.at,largest.next.at)).sort((a,b)=>(b.dur??0)-(a.dur??0)).slice(0,12).map(summarize)};});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),result={receipt:receiptPath,receiptSha256:sha(receiptBytes),trace:tracePath,traceSha256:sha(traceBytes),traceBytes:traceBytes.length,traceClockAnchor:anchor,traceOffsetMicroseconds:offset,window:{from:start,through:end,milliseconds:end-start,frames:samples.length,complete:true},largestGap:largest,resourceMaxima:Object.fromEntries(['before','ready','after'].map(p=>[p,Object.fromEntries(['resourceJobMaxMs','resourceJobMaxType','resourceJobMaxStage','resourceJobMaxAt'].map(k=>[k,a[p][k]??null]))])),workers,limit:'Tracing adds overhead. Task overlap identifies work in this execution, not the cause of a different untraced historical gap. Async waits are not synchronous task durations; duplicate nested events must not be added.'};
await writeFile(outputPath,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({outputPath,window:result.window,maxIntervalMs:largest.milliseconds,workers:workers.map(w=>({role:w.role,maxTaskMs:w.maxPreparationTaskMs})),resourceMaxima:result.resourceMaxima}));
