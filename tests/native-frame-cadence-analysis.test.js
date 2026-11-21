import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeNativeFrameCadence,summarizeNativeGapPhases} from '../tools/guardian/analyze_native_frame_cadence.mjs';

const cohortCase=(label,times)=>({label,receipt:{result:{host:{samples:times.map((at,i)=>({at,intervalMs:i?at-times[i-1]:null,drawMs:1,trigger:'raf',sequence:1}))}}}});
test('phase audit counts full histories, exposure and non-phase controls without declaring cause',()=>{
 const r=summarizeNativeGapPhases([cohortCase('minute',[60000,60200,60300,60600,61000]),cohortCase('elsewhere',[70000,70200,70300,70600,71000])]);
 assert.equal(r.totals.longGaps,6);assert.equal(r.totals.inPhase,3);assert.equal(r.totals.phaseExposureMs,1000);assert.equal(r.totals.coverageMs,2000);assert.match(r.limit,/No randomization/);
});
test('phase audit merges later snapshots and deduplicates overlapping history',()=>{
 const c=cohortCase('snapshots',[60000,60033,60200]);
 c.receipt.result.nextTask={host:cohortCase('later',[60033,60200,60400]).receipt.result.host};
 c.receipt.result.nextTask.host.samples[0].intervalMs=33;
 const r=summarizeNativeGapPhases([c]);
 assert.equal(r.cases[0].samples,4);assert.equal(r.totals.longGaps,2);assert.equal(r.totals.coverageMs,400);
});
test('phase audit retains capture overlap and intervals crossing the minute boundary',()=>{
 const c=cohortCase('crossing',[59900,60150,60500]);c.receipt.capture={checkpoints:[{label:'image',startedAt:60000,finishedAt:60200}]};
 const r=summarizeNativeGapPhases([c]);assert.equal(r.totals.inPhase,1);assert.equal(r.totals.phaseExposureMs,500);assert.deepEqual(r.cases[0].gaps[0].captures,['image']);assert.equal(r.cases[0].gaps[0].phaseMs,59900);
});
test('phase audit rejects missing and contradictory interval histories',()=>{
 assert.throws(()=>summarizeNativeGapPhases([]),/Invalid/);assert.throws(()=>summarizeNativeGapPhases([cohortCase('one',[1])]),/history/);
 const c=cohortCase('bad',[60000,60300]);c.receipt.result.host.samples[1].intervalMs=400;assert.throws(()=>summarizeNativeGapPhases([c]),/Inconsistent/);
 assert.throws(()=>summarizeNativeGapPhases([cohortCase('reverse',[2,1])]),/Inconsistent/);
});

function fixture(){
  const samples=[0,33,99,132].map(at=>({at:1000+at,intervalMs:at===0?null:at===99?66:33,drawMs:1,sequence:1}));
  const receipt={traceClockAnchor:{name:'origin',absoluteMs:1000},result:{samples,duplicate:{samples}}};
  const trace={traceEvents:[{name:'origin',ts:0},...[0,33,66,99,132].map(at=>({name:'FunctionCall',pid:1,tid:2,ts:at*1000,ph:'X',dur:100,args:{data:{functionName:'present',url:'http://local/src/rendering/remote-webgpu-host.js'}}}))]};
  return {receipt,trace};
}
test('cadence separates a 30Hz callback schedule from skipped draw and CPU cost',()=>{
  const {receipt,trace}=fixture(),r=analyzeNativeFrameCadence(receipt,trace);
  assert.equal(r.frameSamples,4);assert.equal(r.medianHostCallbackIntervalMs,33);assert.equal(r.maxHostDrawCpuMs,1);
  assert.equal(r.gaps.length,1);assert.equal(r.gaps[0].hostCallbacksInsideGap,1);assert.equal(r.gaps[0].nominalRefreshPeriods,2);
});
test('release draw is not used to estimate the browser refresh rate',()=>{
  const {receipt,trace}=fixture();receipt.result.samples.push({at:1070,intervalMs:37,drawMs:1,sequence:2,trigger:'mutation-release'});
  const r=analyzeNativeFrameCadence(receipt,trace);assert.equal(r.releaseTriggeredFrames,1);assert.equal(r.medianHostCallbackIntervalMs,33);
});
test('capture overlap and recorded guard outcomes remain separate evidence',()=>{
  const {receipt,trace}=fixture();
  receipt.result.presentationOpportunities=[{at:1066,intervalMs:33,outcome:'mutation-hold',holdId:3}];
  receipt.capture={mode:'visual',checkpoints:[{label:'blocked',startedAt:1050,finishedAt:1110}]};
  const gap=analyzeNativeFrameCadence(receipt,trace).gaps[0];
  assert.equal(gap.hostGuardOutcomes[0].outcome,'mutation-hold');
  assert.equal(gap.captureCheckpoints[0].overlapMs,49);
});
test('unmatched clocks and mixed Host owners cannot produce timing claims',()=>{
  const {receipt,trace}=fixture();assert.throws(()=>analyzeNativeFrameCadence({...receipt,traceClockAnchor:null},trace),/anchor/);
  trace.traceEvents.push({...trace.traceEvents[1],tid:3});assert.throws(()=>analyzeNativeFrameCadence(receipt,trace),/one Host/);
});
test('compositor wall time and thread CPU time are reported separately',()=>{
  const {receipt,trace}=fixture();
  trace.traceEvents.push({ph:'M',name:'thread_name',pid:2,tid:3,args:{name:'CrGpuMain'}},
    {ph:'X',name:'SkiaOutputSurfaceImplOnGpu::EndAccessImages',pid:2,tid:3,ts:33000,dur:66000,tdur:50});
  const event=analyzeNativeFrameCadence(receipt,trace).gaps[0].correlatedEvents[0];
  assert.equal(event.durationMs,66);assert.equal(event.threadCpuMs,.05);assert.equal(event.thread,'CrGpuMain');
});
