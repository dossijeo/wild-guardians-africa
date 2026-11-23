import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';

// Analyze every interval in each recorded Host history, not only previously
// selected maxima. Phase concentration is evidence, not a causal attribution.
export function summarizeNativeGapPhases(cases,{periodMs=60000,phaseWindowMs=1000,longGapMs=100}={}){
  if(!Array.isArray(cases)||!cases.length||![periodMs,phaseWindowMs,longGapMs].every(n=>Number.isFinite(n)&&n>0)||phaseWindowMs>=periodMs)throw Error('Invalid cadence cohort or phase window');
  const covered=t=>Math.floor(t/periodMs)*phaseWindowMs+Math.min(t%periodMs,phaseWindowMs);
  const rows=cases.map(({label,receipt})=>{
    const samples=collectNativeHostHistory(receipt?.result).frames;
    if(!label||!Array.isArray(samples)||samples.length<2)throw Error('Complete named Host history required');
    const gaps=[];for(let i=1;i<samples.length;i++){
      const previous=samples[i-1],current=samples[i],duration=current.at-previous.at;
      if(!Number.isFinite(previous.at)||previous.at<0||!Number.isFinite(current.at)||duration<=0||!Number.isFinite(current.intervalMs)||Math.abs(duration-current.intervalMs)>.1)throw Error('Inconsistent Host interval history: '+label);
      if(duration<=longGapMs)continue;
      const phaseMs=previous.at%periodMs;
      gaps.push({from:previous.at,through:current.at,milliseconds:duration,utc:new Date(previous.at).toISOString(),phaseMs,inPhase:phaseMs<phaseWindowMs,trigger:current.trigger??null,drawMs:current.drawMs??null,captures:(receipt.capture?.checkpoints??[]).filter(c=>c.startedAt<current.at&&c.finishedAt>previous.at).map(c=>c.label)});
    }
    const first=samples[0].at,last=samples.at(-1).at;
    return {label,samples:samples.length,first,last,coverageMs:last-first,phaseExposureMs:covered(last)-covered(first),longGaps:gaps.length,inPhase:gaps.filter(g=>g.inPhase).length,gaps};
  });
  return {version:1,periodMs,phaseWindowMs,longGapMs,cases:rows,totals:{cases:rows.length,coverageMs:rows.reduce((n,r)=>n+r.coverageMs,0),phaseExposureMs:rows.reduce((n,r)=>n+r.phaseExposureMs,0),longGaps:rows.reduce((n,r)=>n+r.longGaps,0),inPhase:rows.reduce((n,r)=>n+r.inPhase,0)},limit:'Exploratory absolute-clock phase association. No randomization, independence assumption, causal claim, CPU/GPU-time equivalence or cadence acceptance. Coverage is the recorded Host history, not the whole process lifetime.'};
}

const median=values=>{const a=[...values].sort((a,b)=>a-b);return a.length?a[Math.floor(a.length/2)]:null;};
const intervals=values=>values.slice(1).map((at,i)=>at-values[i]).filter(n=>n>0);
export function collectNativeHostHistory(result){
  const samples=new Map(),opportunities=new Map();
  function visit(o){
    if(!o||typeof o!=='object')return;
    if(Array.isArray(o)){for(const v of o)visit(v);return;}
    if(Number.isFinite(o.at)&&Number.isFinite(o.drawMs)&&'intervalMs' in o&&'sequence' in o)samples.set(o.at,{at:o.at,intervalMs:o.intervalMs,drawMs:o.drawMs,sequence:o.sequence,trigger:o.trigger??'unrecorded'});
    if(Number.isFinite(o.at)&&typeof o.outcome==='string'&&'holdId' in o)opportunities.set(o.at,o);
    for(const v of Object.values(o))if(v&&typeof v==='object')visit(v);
  }
  visit(result);
  const frames=[...samples.values()].sort((a,b)=>a.at-b.at);
  return {frames,opportunities};
}
// Target cadence is independent of the observed browser callback schedule.
// Missing samples are a coverage defect, never evidence of smoothness.
export function summarizeNativeCadenceTarget(receipt,{targetFrameMs=1000/60,limit=20}={}){
  if(!Number.isFinite(targetFrameMs)||targetFrameMs<=0||!Number.isSafeInteger(limit)||limit<1||limit>1000)throw Error('Invalid target cadence');
  const {frames,opportunities}=collectNativeHostHistory(receipt?.result);
  const declaredCount=receipt?.result?.cadence?.count??null;
  if(declaredCount!==null&&(!Number.isSafeInteger(declaredCount)||declaredCount<0))throw Error('Invalid declared sample count');
  const history=frames.map((frame,index)=>{
    const preceding=frames[index-1];
    const predecessor=preceding&&Number.isFinite(frame.intervalMs)&&Math.abs(frame.at-preceding.at-frame.intervalMs)<.1?preceding:null;
    return {frame,predecessor};
  });
  const intervals=history.filter(({frame})=>Number.isFinite(frame.intervalMs)&&frame.intervalMs>0);
  const missingPredecessors=intervals.filter(({predecessor})=>!predecessor);
  const ordered=history.slice(1).every(({predecessor})=>predecessor);
  const completeHistory=frames.length>=2&&ordered&&(declaredCount===null||frames.length===declaredCount);
  const exceeded=intervals.filter(({frame})=>frame.intervalMs>targetFrameMs);
  return {targetFrameMs,declaredSamples:declaredCount,recordedSamples:frames.length,recordedIntervals:intervals.length,
    completeHistory,missingPredecessors:missingPredecessors.length,recordedOpportunities:opportunities.size,
    intervalsAboveTarget:exceeded.length,maxRecordedIntervalMs:intervals.length?Math.max(...intervals.map(({frame})=>frame.intervalMs)):null,
    topIntervals:exceeded.sort((a,b)=>b.frame.intervalMs-a.frame.intervalMs).slice(0,limit).map(({frame,predecessor})=>({
      ...frame,from:frame.at-frame.intervalMs,excessOverTargetMs:frame.intervalMs-targetFrameMs,
      previousDrawMs:predecessor?.drawMs??null,afterPreviousDrawUntilCurrentStartMs:predecessor?frame.at-(predecessor.at+predecessor.drawMs):null
    })),
    attribution:'Unattributed: intervals are Host draw-start spacing, drawMs is instrumented host wall time; neither is GPU execution or scanout.',
    coverage:completeHistory?'Contiguous recorded history only; this does not establish full-session or physical-presentation coverage.':'Incomplete recorded history; no full-history cadence acceptance or percentile claim.'};
}

export function analyzeNativeFrameCadence(receipt,trace){
  const anchor=receipt.traceClockAnchor,events=trace.traceEvents;
  if(!anchor||!Number.isFinite(anchor.absoluteMs)||!Array.isArray(events))throw Error('A receipt with its trace clock anchor and a Chrome trace are required');
  const marks=events.filter(e=>e.name===anchor.name);
  if(marks.length!==1)throw Error('Trace must contain exactly one matching clock anchor');
  const offset=anchor.absoluteMs-marks[0].ts/1000,at=e=>offset+e.ts/1000;
  const {frames,opportunities}=collectNativeHostHistory(receipt.result);
  if(frames.length<2)throw Error('No Host frame samples in receipt');
  const hostCalls=events.filter(e=>e.name==='FunctionCall'&&e.args?.data?.functionName==='present'&&/\/remote-webgpu-host\.js(?:\?|$)/.test(e.args.data.url??''));
  const owners=new Map(hostCalls.map(e=>[`${e.pid}/${e.tid}`,{pid:e.pid,tid:e.tid}]));
  if(owners.size!==1)throw Error('Trace must identify one Host RAF owner; do not mix sessions');
  const owner=[...owners.values()][0],sameOwner=e=>e.pid===owner.pid&&e.tid===owner.tid;
  const callbacks=hostCalls.map(at).sort((a,b)=>a-b),callbackIntervals=intervals(callbacks),baseline=median(callbackIntervals);
  if(!baseline)throw Error('At least two distinct Host callbacks are required');
  const threadNames=new Map(events.filter(e=>e.ph==='M'&&e.name==='thread_name').map(e=>[`${e.pid}/${e.tid}`,e.args?.name]));
  const vsync=events.filter(e=>e.ph==='X'&&e.name==='ThreadControllerImpl::RunTask'&&threadNames.get(`${e.pid}/${e.tid}`)==='GpuVSyncThread').map(at).sort((a,b)=>a-b);
  const hostTasks=events.filter(e=>sameOwner(e)&&e.ph==='X'&&e.dur&&e.name==='ThreadControllerImpl::RunTask');
  const gpuTasks=events.filter(e=>e.ph==='X'&&e.dur&&e.name==='Scheduler::RunTask'&&threadNames.get(`${e.pid}/${e.tid}`)==='CrGpuMain');
  const relevant=events.filter(e=>e.ph==='X'&&e.dur&&(sameOwner(e)&&['FunctionCall','RunMicrotasks','HandlePostMessage','FireAnimationFrame'].includes(e.name)||/Screenshot|CopyOutput|Capture|SkiaOutputSurfaceImplOnGpu::(?:SwapBuffers|EndAccessImages)/i.test(e.name)));
  const gaps=frames.filter(f=>Number.isFinite(f.intervalMs)&&f.intervalMs>baseline*1.5).sort((a,b)=>b.intervalMs-a.intervalMs).slice(0,20).map(f=>{
    const start=f.at-f.intervalMs,end=f.at;
    const overlap=e=>Math.max(0,Math.min(end,at(e)+e.dur/1000)-Math.max(start,at(e)));
    const detail=e=>({name:e.name,thread:threadNames.get(`${e.pid}/${e.tid}`),at:at(e),durationMs:e.dur/1000,threadCpuMs:Number.isFinite(e.tdur)?e.tdur/1000:null,overlapMs:overlap(e),function:e.args?.data?.functionName,url:e.args?.data?.url});
    return {...f,start,nominalRefreshPeriods:f.intervalMs/baseline,
      hostCallbacksInsideGap:callbacks.filter(t=>t>start+1&&t<end-1).length,
      hostGuardOutcomes:[...opportunities.values()].filter(o=>o.at>start+1&&o.at<end-1).sort((a,b)=>a.at-b.at),
      captureCheckpoints:(receipt.capture?.checkpoints??[]).filter(c=>c.startedAt<end&&c.finishedAt>start).map(c=>({...c,overlapMs:Math.min(end,c.finishedAt)-Math.max(start,c.startedAt)})),
      gpuProcessTasks:gpuTasks.filter(e=>overlap(e)>0).sort((a,b)=>overlap(b)-overlap(a)).slice(0,4).map(detail),
      hostTasks:hostTasks.filter(e=>overlap(e)>0).sort((a,b)=>overlap(b)-overlap(a)).slice(0,4).map(detail),
      correlatedEvents:relevant.filter(e=>overlap(e)>0).sort((a,b)=>overlap(b)-overlap(a)).slice(0,6).map(detail)};
  });
  return {version:1,scope:'Host draw attempts and browser callbacks, not GPU execution time or physical scanout',owner,clockOffsetMs:offset,capture:receipt.capture??null,
    targetCadence:summarizeNativeCadenceTarget(receipt),frameSamples:frames.length,hostCallbacks:callbacks.length,medianHostCallbackIntervalMs:baseline,estimatedCallbackHz:baseline?1000/baseline:null,
    medianGpuVSyncTaskIntervalMs:median(intervals(vsync)),maxHostDrawCpuMs:Math.max(...frames.map(f=>f.drawMs)),maxHostSubmissionIntervalMs:Math.max(...frames.map(f=>f.intervalMs??0)),
    releaseTriggeredFrames:frames.filter(f=>f.trigger==='mutation-release').length,recordedOpportunities:opportunities.size,
    opportunityCoverage:opportunities.size?{firstAt:Math.min(...opportunities.keys()),lastAt:Math.max(...opportunities.keys())}:null,gaps,
    limitations:['An absent Host submission is not proof of a slow GPU.','Callbacks inside gaps need the Host guard outcome for causal attribution.','Trace/screenshot events are correlations, not proof that capture caused a gap.','A 30 Hz display has a nominal 33.33 ms refresh period; no timer or counter change can remove it.']};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  if(process.argv[2]==='--cohort'){
    const [manifestPath,output]=process.argv.slice(3);if(!manifestPath||!output)throw Error('Usage: --cohort manifest.json output.json');
    const manifest=JSON.parse(readFileSync(manifestPath)),inputs=[];
    const cases=manifest.map(({label,path})=>{const bytes=readFileSync(path);inputs.push({label,path,sha256:createHash('sha256').update(bytes).digest('hex')});const receipt=JSON.parse(path.endsWith('.gz')?gunzipSync(bytes):bytes);return {label,receipt:{result:{host:{samples:collectNativeHostHistory(receipt.result).frames}},capture:receipt.capture}};});
    const report=summarizeNativeGapPhases(cases);report.inputs=inputs;writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output,...report.totals}));
  }else{
  const [receiptPath,tracePath,output]=process.argv.slice(2);
  if(!receiptPath||!tracePath||!output)throw Error('Usage: node tools/guardian/analyze_native_frame_cadence.mjs receipt.json trace.json output.json');
  const raw=readFileSync(receiptPath),rawTrace=readFileSync(tracePath),hash=b=>createHash('sha256').update(b).digest('hex');
  const report=analyzeNativeFrameCadence(JSON.parse(raw),JSON.parse(rawTrace));
  report.inputs={receipt:{path:receiptPath,sha256:hash(raw)},trace:{path:tracePath,sha256:hash(rawTrace)}};
  writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({output,frameSamples:report.frameSamples,callbackHz:report.estimatedCallbackHz,maxHostDrawCpuMs:report.maxHostDrawCpuMs,maxHostSubmissionIntervalMs:report.maxHostSubmissionIntervalMs,gaps:report.gaps.length}));
  }
}
