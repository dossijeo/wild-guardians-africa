import {readFile,writeFile} from 'node:fs/promises';
const [path,output]=process.argv.slice(2);if(!path)throw Error('Usage: node summarize_village_gpu_trace.mjs <trace.json> [output.json]');
const data=JSON.parse(await readFile(path,'utf8')),events=data.traceEvents;if(!Array.isArray(events))throw Error('Invalid Chromium trace');
const threads=new Map(),processes=new Map();for(const event of events)if(event.ph==='M'){if(event.name==='thread_name')threads.set(`${event.pid}:${event.tid}`,event.args?.name);if(event.name==='process_name')processes.set(event.pid,event.args?.name);}
const marks=events.filter(e=>e.name==='wg-village-gap'&&e.args?.data?.detail);if(!marks.length)throw Error('Trace contains no marked frame gaps');
const gaps=marks.map(mark=>{
 const ms=JSON.parse(mark.args.data.detail).ms;if(!Number.isFinite(ms)||ms<=0)throw Error('Invalid frame-gap duration');
 // Mark execution can occur after the RAF timestamp; overlap is approximate.
 const end=mark.ts,start=end-ms*1000;
 const overlaps=events.filter(event=>event.dur>10000&&event.ts<end&&event.ts+event.dur>start&&(event.name==='GLES2Implementation::GetProgramiv'||event.name==='WebGL'&&processes.get(event.pid)==='GPU Process')).map(event=>({name:event.name,process:processes.get(event.pid)??null,thread:threads.get(`${event.pid}:${event.tid}`)??null,durationMs:event.dur/1000,overlapMs:Math.max(0,Math.min(end,event.ts+event.dur)-Math.max(start,event.ts))/1000})).sort((a,b)=>b.overlapMs-a.overlapMs);
 return {intervalMs:ms,markTimeMs:mark.args.data.startTime,overlaps};
});
const result={scope:'Chromium trace correlation only. RAF timestamp and execution time of its mark can differ; overlap does not establish causality or measure GPU completion. The capture adds overhead.',gaps};
if(output)await writeFile(output,JSON.stringify(result,null,2));else console.log(JSON.stringify(result,null,2));
