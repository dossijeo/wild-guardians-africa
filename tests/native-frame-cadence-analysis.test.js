import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeNativeFrameCadence} from '../tools/guardian/analyze_native_frame_cadence.mjs';

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
