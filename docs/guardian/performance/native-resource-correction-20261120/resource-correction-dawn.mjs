import fs from 'node:fs';import readline from 'node:readline';
const prefix=process.argv[2],events=[],counts={},profiles=[],names=new Map();let scanned=0;
for await(const line of readline.createInterface({input:fs.createReadStream(prefix+'.trace.json'),crlfDelay:Infinity})){
 const s=line.trim().replace(/,$/,'');if(!s.startsWith('{')||!s.endsWith('}'))continue;let e;try{e=JSON.parse(s);}catch{continue;}if(!e.ph)continue;scanned++;
 if(e.ph==='M')names.set(e.pid+':'+e.tid,e.args?.name);
 if(e.cat?.includes('gpu.dawn'))counts[e.name]=(counts[e.name]??0)+1;
 if(e.name?.includes('Profile')&&profiles.length<2)profiles.push(e);
 if(e.ph==='M'||e.cat?.includes('gpu.dawn')||e.cat?.includes('cpu_profiler')||e.cat?.includes('user_timing')||['FunctionCall','RunMicrotasks','FireAnimationFrame','ThreadControllerImpl::RunTask','Scheduler::RunTask'].includes(e.name))events.push(e);
}
fs.writeFileSync(prefix+'-focused.trace.json',JSON.stringify({traceEvents:events}));
const top=events.filter(e=>e.cat?.includes('gpu.dawn')&&e.dur).sort((a,b)=>b.dur-a.dur).slice(0,35).map(e=>({name:e.name,ms:e.dur/1000,cpu:e.tdur/1000,ts:e.ts,pid:e.pid,tid:e.tid,thread:names.get(e.pid+':'+e.tid),args:e.args}));
fs.writeFileSync(prefix+'-dawn.json',JSON.stringify({scanned,kept:events.length,counts,top,profiles:profiles.map(e=>({...e,args:JSON.stringify(e.args).slice(0,2000)}))},null,2));console.log(JSON.stringify({scanned,kept:events.length,top,profiles:profiles.map(e=>({name:e.name,cat:e.cat,args:Object.keys(e.args)}))}));
