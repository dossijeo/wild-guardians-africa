import fs from'node:fs';import readline from'node:readline';
const prefix=process.argv[2],marks=[],tasks=[];
for await(const line of readline.createInterface({input:fs.createReadStream(prefix+'.trace.json'),crlfDelay:Infinity})){
 if(!line.includes('native-mutation:')&&!line.includes('RunMicrotasks'))continue;
 let e;try{e=JSON.parse(line.trim().replace(/,$/,''));}catch{continue;}
 if(e.name?.startsWith('native-mutation:')){let detail=e.args?.data?.detail;try{if(typeof detail==='string')detail=JSON.parse(detail);}catch{}if(detail?.at)marks.push({...detail,pid:e.pid,tid:e.tid,traceAt:e.ts/1000});}
 if(e.name==='RunMicrotasks'&&e.ph==='X')tasks.push({pid:e.pid,tid:e.tid,traceAt:e.ts/1000,durationMs:e.dur/1000});
}
const history=JSON.parse(fs.readFileSync(prefix+'-report.json')).history,from=history.frames[0]?.at,to=history.frames.at(-1)?.at,host=marks.find(m=>m.owner==='host'),offset=host?.at-host?.traceAt;
const rows=tasks.map(t=>({...t,at:t.traceAt+offset,owner:marks.find(m=>m.pid===t.pid&&m.tid===t.tid)?.owner??'other'})).filter(t=>t.at>=from&&t.at<=to).sort((a,b)=>b.durationMs-a.durationMs);
const out={source:prefix,window:{from,to},traceEpochOffset:offset,marks,largestMicrotasks:rows.slice(0,20),largestHostMicrotasks:rows.filter(t=>t.owner==='host').slice(0,20)};fs.writeFileSync(prefix+'-trace-report.json',JSON.stringify(out,null,2)+'\n');console.log({source:prefix,marks:marks.length,maxMicrotaskMs:rows[0]?.durationMs,maxHostMicrotaskMs:out.largestHostMicrotasks[0]?.durationMs});
