import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import readline from 'node:readline';
import {createGunzip} from 'node:zlib';

export async function mutationTrace(input){
 const stream=fs.createReadStream(input),history={stages:[],opportunities:[],frames:[]},phases=[],hosts=new Set();
 for await(const line of readline.createInterface({input:input.endsWith('.gz')?stream.pipe(createGunzip()):stream,crlfDelay:Infinity})){
  if(!line.includes('native-mutation:')&&!line.includes('native-presentation-opportunity')&&!line.includes('native-submitted-draw'))continue;
  let event,detail;try{event=JSON.parse(line.trim().replace(/,$/,''));detail=event.args?.data?.detail;if(typeof detail==='string')detail=JSON.parse(detail);}catch{continue;}
  if(!detail||!Number.isFinite(detail.at))continue;
  if(event.name?.startsWith('native-mutation:')){phases.push({...detail,pid:event.pid,tid:event.tid,traceAt:event.ts/1000});if(detail.owner==='host'){history.stages.push(detail);hosts.add(event.pid+':'+event.tid);}}
  if(event.name==='native-presentation-opportunity')history.opportunities.push(detail);
  if(event.name==='native-submitted-draw')history.frames.push(detail);
 }
 if(hosts.size>1)throw Error('This report requires one Host thread per trace; do not merge consumer identities');
 return {history,phases,hosts:[...hosts]};
}

// Consume the existing auditor's whole-history annotations, never the Host's
// last-512 opportunity ring. Repeated snapshots contain the same observations.
export function mutationHistory(receipt){
 const stages=new Map(),opportunities=new Map(),frames=new Map();
 const add=(map,rows)=>{for(const row of rows??[])map.set(JSON.stringify(row),row);};
 function visit(value){
  if(!value||typeof value!=='object')return;
  add(stages,value.qaMutationStages);add(opportunities,value.qaPresentationOpportunities);
  if(value.rafIndependent)add(frames,value.samples);
  for(const [key,child] of Object.entries(value))if(!['qaMutationStages','qaPresentationOpportunities','samples'].includes(key))visit(child);
 }
 visit(receipt);
 return Object.fromEntries(Object.entries({stages,opportunities,frames}).map(([key,map])=>[key,[...map.values()].sort((a,b)=>a.at-b.at)]));
}
export function mutationReport(receipt,{targetMs=null,trace=null}={}){
 if(targetMs!==null&&(!Number.isFinite(targetMs)||targetMs<=0))throw Error('A target must be an explicit positive frame interval');
 const history=mutationHistory(receipt);
 if(trace)for(const key of ['stages','opportunities','frames'])history[key]=[...new Map([...history[key],...trace.history[key]].map(row=>[key==='frames'?JSON.stringify([row.at,row.sequence,row.trigger]):key==='opportunities'?JSON.stringify([row.at,row.sequence,row.outcome,row.holdId]):JSON.stringify(row),row])).values()].sort((a,b)=>a.at-b.at);
 const {stages,opportunities,frames}=history;
 if(new Set(stages.map(s=>s.session).filter(Boolean)).size>1)throw Error('This report requires one consumer session');
 const groups=new Map();
 for(const stage of stages)if(stage.holdId!==null&&stage.holdId!==undefined){
  const key=JSON.stringify([stage.session,stage.authorityEpoch,stage.holdId]);
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(stage);
 }
 const required=['request-received','hold-start','drained','ack-send','release-received','world-installed','released'];
 const holds=[...groups.values()].map(rows=>{
  const first=rows[0],at=Object.fromEntries(rows.map(row=>[row.stage,row.at])),missing=required.filter(stage=>at[stage]===undefined);
  const ordered=required.every((stage,index)=>!index||at[stage]===undefined||at[required[index-1]]===undefined||at[stage]>=at[required[index-1]]);
  const start=at['hold-start'],end=at.released;
  const misses=opportunities.filter(o=>o.outcome==='mutation-hold'&&o.holdId===first.holdId&&o.at>=start&&(end===undefined||o.at<=end));
  const request=rows.find(r=>r.stage==='hold-start'),ready=stages.findLast(s=>s.stage==='ready-send'&&s.sequence===request?.preparedFrameSequence&&s.authorityEpoch===request?.authorityEpoch&&(!s.session||s.session===request?.session)&&s.at<=start);
  return {session:first.session,authorityEpoch:first.authorityEpoch,holdId:first.holdId,complete:!missing.length&&ordered,missing,ordered,
   holdMs:start!==undefined&&end!==undefined?end-start:null,drainMs:start!==undefined&&at.drained!==undefined?at.drained-start:null,
   readyToRequestMs:ready&&at['request-received']!==undefined?at['request-received']-ready.at:null,missedOpportunities:misses,stages:rows};
 });
 const maximum=(rows,key)=>rows.reduce((m,r)=>Number.isFinite(r[key])?Math.max(m??r[key],r[key]):m,null);
 const from=trace?.history.stages.find(s=>s.stage==='observation-start')?.at,terminal=trace?.history.stages.findLast(s=>s.stage==='retired-drained'||s.stage==='retired-device-loss');
 const contiguous=(rows,count)=>Number.isSafeInteger(count)&&count===rows.length&&rows.every((row,i)=>row.ordinal===i+1);
 const tracedLifetime=!!terminal&&Number.isFinite(from)&&trace.history.opportunities.length>0&&trace.history.frames.length>0&&
  contiguous(trace.history.opportunities,terminal.opportunityCount)&&contiguous(trace.history.frames,terminal.submittedDrawCount)&&
  ['opportunities','frames'].every(key=>trace.history[key].every(row=>row.at>=from&&row.at<=terminal.at));
 return {scope:'Host callbacks, starts of draws that submitted, and mutation wall phases; no physical-presentation or universal fluidity acceptance.',
  wholeHistoryPresent:opportunities.length>0&&stages.length>0,targetMs,
  coverage:{tracedLifetime,from:from??null,to:terminal?.at??null,terminal:terminal?.stage??null,terminalOpportunities:terminal?.opportunityCount??null,terminalSubmittedDraws:terminal?.submittedDrawCount??null,note:'Complete lifetime requires observation-start, contiguous callback/submitted-draw ordinals and matching terminal counters, plus verified observer provenance and CDP dataLossOccurred:false. Snapshot arrays alone are not terminal evidence.'},
  counts:{frames:frames.length,opportunities:opportunities.length,outcomes:opportunities.reduce((result,o)=>(result[o.outcome]=(result[o.outcome]??0)+1,result),{})},
  maxima:{submittedDrawStartIntervalMs:maximum(frames,'intervalMs'),callbackIntervalMs:maximum(opportunities,'intervalMs'),drawMs:maximum(frames,'drawMs')},
  targetExceedances:targetMs===null?null:{submittedDrawStarts:frames.filter(f=>f.intervalMs>targetMs),callbacks:opportunities.filter(o=>o.intervalMs>targetMs),draws:frames.filter(f=>f.drawMs>targetMs)},
  holds,history,...(trace?{tracePhases:trace.phases}:{})};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [input,output,target,traceFile]=process.argv.slice(2);
 if(!input||!output)throw Error('Usage: node tools/guardian/native-audit-mutation-report.mjs receipt.json report.json [targetMs|-] [trace.json[.gz]]');
 const report=mutationReport(JSON.parse(fs.readFileSync(input,'utf8')),{targetMs:target===undefined||target==='-'?null:Number(target),trace:traceFile?await mutationTrace(traceFile):null});
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({wholeHistoryPresent:report.wholeHistoryPresent,counts:report.counts,maxima:report.maxima,holds:report.holds.length,incomplete:report.holds.filter(h=>!h.complete).length}));
 if(!report.wholeHistoryPresent)process.exitCode=1;
}
