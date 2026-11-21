import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const [receiptPath,outputPath]=process.argv.slice(2);
if(!receiptPath||!outputPath)throw Error('Usage: node analyze_native_farm_birth_trace.mjs receipt.json output.json');
const tracePath=receiptPath.replace(/\.json$/,'.trace.json'),receiptBytes=await readFile(receiptPath),traceBytes=await readFile(tracePath),receipt=JSON.parse(receiptBytes),trace=JSON.parse(traceBytes),events=trace.traceEvents;
const r=receipt.result,anchor=receipt.traceClockAnchor,marks=events.filter(e=>e.name===anchor?.name&&e.cat?.includes('user_timing'));
if(!r?.ordinaryFarmBirth||!anchor||marks.length!==1)throw Error('Expected an ordinary birth receipt and one explicit trace clock anchor');
const offset=anchor.absoluteMs*1000-marks[0].ts,key=e=>`${e.pid}:${e.tid}`,absolute=e=>(e.ts+offset)/1000,roles=new Map(),names=new Map();
const roleUrls={draw:'/src/rendering/remote-webgpu-host.js',prepare:'/tests/browser/fixtures/native-farm-birth-audit-worker.js',authority:'/src/simulation/simulation-authority-worker.js',observer:'/tests/browser/native-farm-birth-world-owner.js'};
for(const e of events){
 if(e.ph==='M'&&e.name==='thread_name')names.set(key(e),e.args?.name);
 if(e.name!=='FunctionCall')continue;
 for(const [role,url]of Object.entries(roleUrls))if(e.args?.data?.url?.includes(url)){
  if(roles.has(role)&&roles.get(role)!==key(e))throw Error('Ambiguous trace role '+role);
  roles.set(role,key(e));
 }
}
if(Object.keys(roleUrls).some(role=>!roles.has(role)))throw Error('Trace does not identify each original owner');
const summarize=e=>({name:e.name,at:absolute(e),durationMs:(e.dur??0)/1000,...(Number.isFinite(e.tdur)?{threadDurationMs:e.tdur/1000}:{}),...(e.args?.data?.url?{url:e.args.data.url,line:e.args.data.lineNumber}:{}),...(e.args?.data?.functionName?{function:e.args.data.functionName}:{})});
const overlap=(e,from,to)=>e.ph==='X'&&absolute(e)<to&&absolute(e)+(e.dur??0)/1000>from;
const intervalStats=values=>{const gaps=values.slice(1).map((v,i)=>v-values[i]).sort((a,b)=>a-b);return {count:values.length,maxIntervalMs:gaps.at(-1)??null,over50:gaps.filter(v=>v>50).length};};
// Optional observational metadata from the same native resource jobs. A remote
// descriptor hash includes reference IDs; it is NOT a structural cache key.
let pipelineTimings=null;
if(r.host.qaPipelineTimings!==undefined){
 const jobs=r.host.qaPipelineTimings,resourceTrace=r.settlement?.after?.qaResourceTrace;
 if(!Array.isArray(jobs)||!jobs.length||!Array.isArray(resourceTrace))throw Error('Incomplete optional pipeline timing observation');
 const resources=new Map(resourceTrace.filter(v=>v.reference).map(v=>[v.reference,v])),owners=r.owners.after.actors,markTimes=new Map();
 for(const e of events)if(e.name?.startsWith('native-pipeline-')&&e.cat?.includes('user_timing')){const list=markTimes.get(e.name)??[];list.push(absolute(e));markTimes.set(e.name,list);}
 const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
 const sha=value=>createHash('sha256').update(value).digest('hex');
 const provenance=scope=>{if(!scope)return null;return {scope,actors:owners.filter(a=>a.root===scope.object||a.meshes.some(m=>m.id===scope.object)).map(a=>({root:a.root,mesh:scope.object,geometry:scope.geometry}))};};
 pipelineTimings=jobs.map(job=>{
  if(!Number.isFinite(job.receivedAt)||job.startedAt!==null&&!Number.isFinite(job.startedAt)||job.returnedAt!==null&&!Number.isFinite(job.returnedAt)||job.finishedAt!==null&&!Number.isFinite(job.finishedAt)||job.startedAt!==null&&job.startedAt<job.receivedAt||job.returnedAt!==null&&job.returnedAt<job.startedAt||job.finishedAt!==null&&job.finishedAt<job.startedAt)throw Error('Invalid observed pipeline ordering '+job.id);
  const mark=(kind,time)=>{if(time===null)return null;const name='native-pipeline-'+kind+':'+job.id,values=markTimes.get(name);if(values?.length!==1||Math.abs(values[0]-time)>5)throw Error('Original pipeline mark differs from its observed factory '+name);return values[0];};
  const stages=['vertex','fragment','compute'].filter(k=>job.descriptor[k]?.module).map(stage=>{const reference=job.descriptor[stage].module.__remoteGpuId,record=resources.get(reference),source=record?.source;return {stage,reference,entryPoint:job.descriptor[stage].entryPoint??null,sha256:typeof source==='string'?sha(source):null,bytes:typeof source==='string'?Buffer.byteLength(source):null,lines:typeof source==='string'?source.split('\n').length:null,producerAfterFactoryAt:record?.afterFactoryAt??null,producerResolvedAt:record?.resolvedAt??null,owner:provenance(record?.scope)};});
  return {...job,encodedDescriptorSha256:sha(JSON.stringify(canonical(job.descriptor))),factoryMs:job.returnedAt===null?null:job.returnedAt-job.startedAt,nativePromiseMs:job.finishedAt===null?null:job.finishedAt-job.startedAt,dependencyWaitMs:job.startedAt===null?null:job.startedAt-job.receivedAt,traceMarks:{build:mark('build',job.startedAt),finished:mark(job.status==='rejected'?'rejected':'resolved',job.finishedAt)},owner:provenance(resources.get(job.id)?.scope),stages};
 });
}

const windows=[['preparationBlock',r.preparationBlock.start,r.preparationBlock.end],['birthThroughPreparedReady',r.publications.find(p=>p.born).at,r.block.start],['commitBlock',r.block.start,r.block.end],...(r.settlement?[['ordinaryBirthThroughSettlement',r.publications.find(p=>p.born).at,r.host.samples.at(-1).at],['settlementReadyBlock',r.settlement.readyBlock.start,r.settlement.readyBlock.end],['settlementCommitBlock',r.settlement.commitBlock.start,r.settlement.commitBlock.end]]:[])].map(([label,from,to])=>{
 if(!Number.isFinite(from)||!Number.isFinite(to)||to<=from)throw Error('Invalid window '+label);
 const samples=r.host.samples;
 if(samples[0].at>from||samples.at(-1).at<to)throw Error('Incomplete draw sample history for '+label);
 const frames=samples.filter(e=>e.at>=from&&e.at<to),gaps=frames.slice(1).map((next,i)=>({from:frames[i].at,through:next.at,milliseconds:next.at-frames[i].at})).sort((a,b)=>b.milliseconds-a.milliseconds);
 // Only intervals with both samples inside the window count, matching the
 // original harness. Explicit edge margins prevent implying edge coverage.
 const threads=[...roles].map(([role,thread])=>{
  const current=events.filter(e=>key(e)===thread),tasks=current.filter(e=>e.name==='ThreadControllerImpl::RunTask'&&overlap(e,from,to));
  const gap=gaps[0];
  // Microtask checkpoints may be outside RunTask scopes in Chromium's trace.
  // Report them separately. Flow endpoints with the same name are not calls.
  return {role,thread,name:names.get(thread),tasks:tasks.length,maxTaskMs:Math.max(0,...tasks.map(e=>(e.dur??0)/1000)),longestTasks:tasks.sort((a,b)=>(b.dur??0)-(a.dur??0)).slice(0,3).map(summarize),longestScopes:current.filter(e=>overlap(e,from,to)).sort((a,b)=>(b.dur??0)-(a.dur??0)).slice(0,5).map(summarize),raf:Object.fromEntries(['BeginFrameProvider::OnBeginFrame','WorkerAnimationFrameProvider::BeginFrame','WorkerAnimationFrameProvider::RequestAnimationFrame','FireAnimationFrame'].map(name=>[name,intervalStats(current.filter(e=>e.ph==='X'&&e.name===name&&absolute(e)>=from&&absolute(e)<to).map(absolute).sort((a,b)=>a-b))])),largestGapOverlap:gap?current.filter(e=>overlap(e,gap.from,gap.through)).sort((a,b)=>(b.dur??0)-(a.dur??0)).slice(0,10).map(summarize):[]};
 });
 const pipelineJobs=pipelineTimings?.filter(p=>p.receivedAt<to&&(p.finishedAt??to)>=from),overlappingLargestGap=pipelineJobs?.filter(p=>p.startedAt!==null&&p.startedAt<gaps[0]?.through&&(p.finishedAt??to)>gaps[0]?.from);
 return {label,from,through:to,milliseconds:to-from,draws:frames.length,...(pipelineJobs?{pipelineJobs:{count:pipelineJobs.length,overlappingLargestGap:overlappingLargestGap.map(p=>({id:p.id,status:p.status,startedAt:p.startedAt,finishedAt:p.finishedAt,factoryMs:p.factoryMs,nativePromiseMs:p.nativePromiseMs,encodedDescriptorSha256:p.encodedDescriptorSha256,owner:p.owner,stages:p.stages}))}}:{}),edgeMarginsMs:{start:frames[0]?.at-from,end:to-frames.at(-1)?.at},largestGaps:gaps.slice(0,5),threads};
});
const hash=b=>createHash('sha256').update(b).digest('hex');
let completion=null;
try{completion=JSON.parse(await readFile(receiptPath.replace(/\.json$/,'.trace-complete.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
if(completion&&completion.dataLossOccurred!==false)throw Error('Trace does not establish loss-free completion');
const traceMetadata={userAgent:trace.metadata?.['user-agent'],revision:trace.metadata?.revision,nonzeroProcessorStats:Object.fromEntries(Object.entries(trace.metadata?.trace_processor_stats??{}).filter(([,v])=>v!==0)),protocolDataLossOccurred:completion?.dataLossOccurred??null};
const result={receipt:receiptPath,receiptSha256:hash(receiptBytes),trace:tracePath,traceSha256:hash(traceBytes),traceBytes:traceBytes.length,traceEvents:events.length,traceMetadata,traceClockAnchor:anchor,traceOffsetMicroseconds:offset,windows,...(pipelineTimings?{pipelineTimings}:{}),limit:'Diagnostic tracing adds overhead; it cannot attribute a different historical untraced gap. Task durations are wall time, not CPU time; overlapping nested events must not be added. BeginFrame/RAF counts do not by themselves establish why a callback was omitted. A missing completion sidecar leaves protocol data loss unknown; absence of an event is not proof of inactivity. No cadence acceptance.'};
await writeFile(outputPath,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({outputPath,windows:windows.map(w=>({label:w.label,draws:w.draws,maxGapMs:w.largestGaps[0]?.milliseconds,threads:w.threads.map(t=>({role:t.role,maxTaskMs:t.maxTaskMs}))}))}));
