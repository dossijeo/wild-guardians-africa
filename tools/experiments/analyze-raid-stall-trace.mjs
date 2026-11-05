import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
const path=process.argv[2]??'.cache/raid-stall-trace.json';
const compressed=path.endsWith('.json.gz'),raw=await readFile(path);
const {traceEvents:events}=JSON.parse(compressed?gunzipSync(raw):raw.toString('utf8'));
const metadata=JSON.parse(await readFile(compressed?path.replace(/\.json\.gz$/,'-metadata.json'):path+'.metadata.json','utf8'));
const names=new Map(events.filter(e=>e.name==='thread_name').map(e=>[`${e.pid}:${e.tid}`,e.args.name]));
const processes=new Map(events.filter(e=>e.name==='process_name').map(e=>[e.pid,e.args.name]));
const start=events.find(e=>e.name==='WG_RAID_TRACE_START'),end=events.find(e=>e.name==='WG_RAID_TRACE_END');
if(!start||!end)throw Error('Trace markers missing');
const describe=e=>({name:e.name,thread:names.get(`${e.pid}:${e.tid}`),process:processes.get(e.pid),pid:e.pid,tid:e.tid,startMs:(e.ts-start.ts)/1000,durationMs:(e.dur??0)/1000,args:e.args});
const slices=events.filter(e=>e.ph==='X'&&e.ts<end.ts&&e.ts+(e.dur??0)>start.ts);
const longest=slices.filter(e=>e.dur>=50000).sort((a,b)=>b.dur-a.dur).slice(0,150).map(describe);
const profiles=new Map();
for(const e of events){if(!['Profile','ProfileChunk'].includes(e.name))continue;const key=`${e.pid}:${e.id}`,p=profiles.get(key)??{pid:e.pid,tid:e.tid,nodes:new Map(),samples:[],time:null};profiles.set(key,p);const d=e.args?.data;if(e.name==='Profile')p.time=d.startTime;else{for(const n of d.cpuProfile?.nodes??[])p.nodes.set(n.id,n);for(let i=0;i<(d.cpuProfile?.samples??[]).length;i++){p.time+=(d.timeDeltas?.[i]??0);p.samples.push({id:d.cpuProfile.samples[i],ts:p.time,delta:d.timeDeltas?.[i]??0});}}}
const cpu=[...profiles.values()].map(p=>{const groups=new Map();for(const s of p.samples){if(s.ts<start.ts||s.ts>end.ts)continue;const n=p.nodes.get(s.id),f=n?.callFrame,key=JSON.stringify(f);const g=groups.get(key)??{frame:f,samples:0,estimatedMs:0};g.samples++;g.estimatedMs+=s.delta/1000;groups.set(key,g);}return {pid:p.pid,tid:p.tid,thread:names.get(`${p.pid}:${p.tid}`),samples:p.samples.length,top:[...groups.values()].sort((a,b)=>b.estimatedMs-a.estimatedMs).slice(0,35)};});
const report={dataLossOccurred:metadata.dataLossOccurred,durationMs:(end.ts-start.ts)/1000,eventCount:events.length,start,end,threads:[...names],longest,cpu,longTasks:metadata.observations.longTasks,frames:metadata.observations.frames.slice().sort((a,b)=>b.delta-a.delta).slice(0,20),limits:['Nested trace slices overlap: durations must not be added.','CPU sample deltas estimate wall-clock attribution, not exclusive measured CPU time; sparse samples may span waits.','GPU service trace durations are host-side work/waits, not hardware GPU timer queries.']};
const anchor=start.args.data.startTime;
const sumEvents=(rows,from,to)=>({count:rows.length,wallMs:rows.reduce((n,e)=>n+Math.max(0,Math.min(to,e.ts+e.dur)-Math.max(from,e.ts))/1000,0),cpuMsUnclipped:rows.reduce((n,e)=>n+(e.tdur??0)/1000,0),maxMs:rows.reduce((n,e)=>Math.max(n,e.dur/1000),0)});
const parsedDetail=e=>{try{return JSON.parse(e.args?.data?.detail??e.args?.detail??'{}');}catch{return {};}};
report.stalls=report.frames.filter(f=>f.delta>100&&f.at-f.delta>=anchor).map(f=>{
 const from=start.ts+(f.at-f.delta-anchor)*1000,to=start.ts+(f.at-anchor)*1000,overlap=slices.filter(e=>e.ts<to&&e.ts+e.dur>from),namesToSum=['WebGPU','DeviceBase::APICreateRenderPipeline','CompileShaderDXC','ShaderModuleD3D12::Compile','DeviceBase::APICreateShaderModule','tint::hlsl::writer::Generate','Queue::Submit','RasterDecoderImpl::DoWritePixelsINTERNAL'];
 const pipes=overlap.filter(e=>e.name==='DeviceBase::APICreateRenderPipeline'),byLabel={};
 for(const e of pipes){const label=e.args.label,a=byLabel[label]??={label,count:0,ms:0};a.count++;a.ms+=e.dur/1000;}
 return {startMs:(from-start.ts)/1000,endMs:(to-start.ts)/1000,durationMs:f.delta,activity:Object.fromEntries(namesToSum.map(name=>[name,sumEvents(overlap.filter(e=>e.name===name),from,to)])),mainTasks:sumEvents(overlap.filter(e=>e.name==='RunTask'&&e.pid===start.pid&&e.tid===start.tid),from,to),pipelines:Object.values(byLabel),requests:events.filter(e=>e.name==='WG_GPU_REQUEST'&&e.ts>=from&&e.ts<to).map(e=>({atMs:(e.ts-start.ts)/1000,...parsedDetail(e)}))};
});
report.requests=events.filter(e=>e.name==='WG_GPU_REQUEST').map(e=>({atMs:(e.ts-start.ts)/1000,...parsedDetail(e)}));
report.phaseMarks=events.filter(e=>e.name.startsWith('WG_RAID')).map(e=>({name:e.name,atMs:(e.ts-start.ts)/1000}));
const workerDraws=slices.filter(e=>e.name==='FunctionCall'&&e.args?.data?.functionName==='draw'&&e.args?.data?.url?.includes('/webgpu-world-worker.js')).sort((a,b)=>a.ts-b.ts);
report.workerDraws={count:workerDraws.length,longestGaps:workerDraws.slice(1).map((e,i)=>({pid:e.pid,tid:e.tid,startMs:(workerDraws[i].ts-start.ts)/1000,intervalMs:(e.ts-workerDraws[i].ts)/1000,previousDrawMs:workerDraws[i].dur/1000})).sort((a,b)=>b.intervalMs-a.intervalMs).slice(0,20)};
report.apiRequests=Object.fromEntries(['createShaderModule','createRenderPipeline','createRenderPipelineAsync'].map(method=>[method,report.requests.filter(e=>e.method===method).length]));
report.legacyProgramQueries=slices.filter(e=>e.name==='GLES2Implementation::GetProgramiv').map(describe);
// Keep sampled stacks beside each observed frame gap, rather than attributing
// whole-capture hotspots to every stall. Sample deltas are not CPU timers.
for(const stall of report.stalls){
 const from=start.ts+stall.startMs*1000,to=start.ts+stall.endMs*1000;
 stall.sampledStacks=[...profiles.values()].map(p=>{
  const parents=new Map();for(const n of p.nodes.values()){if(n.parent)parents.set(n.id,n.parent);for(const child of n.children??[])parents.set(child,n.id);}
  const groups=new Map();for(const s of p.samples){
   if(s.ts<from||s.ts>=to)continue;
   const key=s.id,g=groups.get(key)??{id:key,samples:0,estimatedWallMs:0};g.samples++;g.estimatedWallMs+=Math.max(0,s.ts-Math.max(from,s.ts-s.delta))/1000;groups.set(key,g);
  }
  return {pid:p.pid,tid:p.tid,thread:names.get(`${p.pid}:${p.tid}`),top:[...groups.values()].sort((a,b)=>b.estimatedWallMs-a.estimatedWallMs).slice(0,5).map(g=>{
   const chain=[],seen=new Set();let id=g.id;while(id&&!seen.has(id)){seen.add(id);chain.push(p.nodes.get(id)?.callFrame);id=parents.get(id);}return {...g,chain};
  })};
 }).filter(p=>p.top.length);
}
report.limits.push('Window wallMs is clipped to the frame interval; cpuMsUnclipped and maxMs describe complete overlapping scopes, including time outside the interval. The initial partial frame can start at the trace anchor rather than at a prior rAF.');
await writeFile(compressed?path.replace(/\.json\.gz$/,'-summary.json'):path+'.summary.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({durationMs:report.durationMs,dataLossOccurred:report.dataLossOccurred,threads:report.threads,longest:longest.slice(0,18),cpu:cpu.map(p=>({...p,top:p.top.slice(0,7)})),frames:report.frames.slice(0,5)},null,2));
