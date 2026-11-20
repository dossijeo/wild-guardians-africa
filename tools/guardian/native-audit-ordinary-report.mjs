import fs from 'node:fs';import readline from 'node:readline';import {pathToFileURL} from 'node:url';
import {mutationReport,mutationTrace} from './native-audit-mutation-report.mjs';
const ORDINARY_STAGES=['start','packet-bytes','retained-preparations','draw-world-checks','combined-bytes','validate-operations','clock-contract','references','dependencies-wait','dependencies-ready','snapshot','control-rendezvous','clock-admission','classify-ownership','replay-analysis','pipeline-identities','pin-and-publish-pending','admitted'];
export function ordinarySequenceComplete(marks){return marks.length===ORDINARY_STAGES.length&&marks.every((m,i)=>m.stage===ORDINARY_STAGES[i]&&Number.isFinite(m.at)&&(i===0||m.at>=marks[i-1].at));}
export async function reportOrdinary(prefix){
if(!prefix)throw Error('Usage: node tools/guardian/native-audit-ordinary-report.mjs PREFIX (receipt, full trace and completion metadata)');
const completion=JSON.parse(fs.readFileSync(prefix+'.trace-complete.json')),frozen=fs.existsSync(prefix+'-frozen.json')?JSON.parse(fs.readFileSync(prefix+'-frozen.json')):null;
const receipt=JSON.parse(fs.readFileSync(prefix+(fs.existsSync(prefix+'.json')?'.json':'.failure.json')));
const trace=await mutationTrace(prefix+'.trace.json'),report=mutationReport(receipt,{targetMs:1000/60,trace});fs.writeFileSync(prefix+'-report.json',JSON.stringify(report,null,2));
const ordinary=[],tasks=[];let offset=null,host=null;
for await(const line of readline.createInterface({input:fs.createReadStream(prefix+'.trace.json'),crlfDelay:Infinity})){
 if(!line.includes('native-ordinary-frame:')&&!line.includes('native-mutation:host:')&&!line.includes('RunMicrotasks')&&!line.includes('ThreadControllerImpl::RunTask'))continue;
 let e;try{e=JSON.parse(line.trim().replace(/,$/,''));}catch{continue;}
 if(e.name?.startsWith('native-ordinary-frame:')||e.name?.startsWith('native-mutation:host:')){let d=e.args?.data?.detail;if(typeof d==='string')try{d=JSON.parse(d);}catch{continue;}if(!Number.isFinite(d?.at))continue;if(e.name.startsWith('native-ordinary-frame:'))ordinary.push({...d,pid:e.pid,tid:e.tid});else if(!host){host={pid:e.pid,tid:e.tid};offset=d.at-e.ts/1000;}}
 if(e.ph==='X'&&['RunMicrotasks','ThreadControllerImpl::RunTask'].includes(e.name))tasks.push({name:e.name,pid:e.pid,tid:e.tid,traceAt:e.ts/1000,ms:e.dur/1000,cpuMs:e.tdur===undefined?null:e.tdur/1000});
}
const bySequence=new Map();for(const mark of ordinary){if(!bySequence.has(mark.sequence))bySequence.set(mark.sequence,[]);bySequence.get(mark.sequence).push(mark);}
const spans=[...bySequence.entries()].flatMap(([sequence,marks])=>marks.slice(1).map((m,i)=>({sequence,activeSequence:marks[i].activeSequence,holdId:marks[i].holdId,stage:marks[i].stage,through:m.stage,at:marks[i].at,end:m.at,ms:m.at-marks[i].at})));
const stages=[...new Set(spans.map(s=>s.stage))].map(stage=>{const rows=spans.filter(s=>s.stage===stage).sort((a,b)=>b.ms-a.ms);return{stage,count:rows.length,max:rows[0],residentMax:rows.find(s=>s.activeSequence!==null),medianMs:rows[Math.floor(rows.length/2)]?.ms,top:rows.slice(0,3)};});
const worst=report.history.frames.reduce((a,b)=>(b.intervalMs??0)>(a?.intervalMs??0)?b:a,null),from=worst.at-worst.intervalMs;
const inHost=tasks.filter(t=>t.pid===host.pid&&t.tid===host.tid).map(t=>({...t,at:t.traceAt+offset}));
const out={head:frozen?.head??null,traceCompletion:completion,traceLossFree:completion.dataLossOccurred===false,functionalOutcome:receipt.error?'failed':'receipt-present-not-revalidated',sourceFreezeChanged:frozen?.changed??null,targetMs:1000/60,scope:'Instrumented ordinary admission wall spans; async spans include waits and yields. Host tasks are CDP observations. Not physical cadence acceptance.',coverage:report.coverage,counts:report.counts,maxima:report.maxima,ordinarySequences:bySequence.size,incompleteSequences:[...bySequence].filter(([,m])=>!ordinarySequenceComplete(m)).map(([s])=>s),stages,largestHostMicrotasks:inHost.filter(t=>t.name==='RunMicrotasks').sort((a,b)=>b.ms-a.ms).slice(0,8),worstWindow:{from,to:worst.at,frame:worst,ordinary:ordinary.filter(m=>m.at>=from-10&&m.at<=worst.at+10),hostTasks:inHost.filter(t=>t.at+t.ms>=from&&t.at<=worst.at)},firstHold:report.holds[0],firstHoldPhases:report.holds.length?trace.phases.filter(p=>p.at>=report.holds[0].stages[0].at&&p.at<=report.holds[0].stages.at(-1).at):[]};
fs.writeFileSync(prefix+'-ordinary-report.json',JSON.stringify(out,null,2));return out;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const out=await reportOrdinary(process.argv[2]);console.log({traceLossFree:out.traceLossFree,functionalOutcome:out.functionalOutcome,counts:out.counts,maxima:out.maxima,ordinary:out.ordinarySequences,incomplete:out.incompleteSequences,stages:out.stages.map(s=>({stage:s.stage,medianMs:s.medianMs,maxMs:s.max.ms,sequence:s.max.sequence}))});
}
