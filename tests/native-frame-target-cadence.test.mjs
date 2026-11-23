import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeNativeFrameCadence,summarizeNativeCadenceTarget} from '../tools/guardian/analyze_native_frame_cadence.mjs';
const row=(at,intervalMs)=>({at,intervalMs,drawMs:4,sequence:1,trigger:'raf'});
test('60 fps target reports 33 and 46 ms even when the observed 30Hz outlier filter omits them',()=>{
 const receipt={traceClockAnchor:{name:'origin',absoluteMs:1000},result:{cadence:{count:3},samples:[row(1000,null),row(1033,33),row(1079,46)]}};
 const trace={traceEvents:[{name:'origin',ts:0},...[0,33,66,99].map(at=>({name:'FunctionCall',pid:1,tid:2,ts:at*1000,ph:'X',dur:100,args:{data:{functionName:'present',url:'http://local/src/rendering/remote-webgpu-host.js'}}}))]};
 const report=analyzeNativeFrameCadence(receipt,trace);
 assert.equal(report.gaps.length,0);assert.equal(report.targetCadence.intervalsAboveTarget,2);assert.equal(report.targetCadence.completeHistory,true);
 assert.equal(report.targetCadence.topIntervals[0].afterPreviousDrawUntilCurrentStartMs,42);
 assert.match(report.targetCadence.attribution,/Unattributed/);
});
test('maxima and partial curve history cannot masquerade as all declared frames',()=>{
 const r=summarizeNativeCadenceTarget({result:{cadence:{count:683,peaks:[row(1000,46),row(2000,41)]}}});
 assert.equal(r.recordedSamples,2);assert.equal(r.intervalsAboveTarget,2);assert.equal(r.completeHistory,false);assert.equal(r.missingPredecessors,2);
 assert.equal(r.topIntervals[0].previousDrawMs,null);assert.match(r.coverage,/Incomplete/);
});
test('duplicate snapshots do not multiply target violations and empty history cannot pass',()=>{
 const samples=[row(1000,null),row(1010,10),row(1030,20)];
 const r=summarizeNativeCadenceTarget({result:{samples,later:{samples}}});
 assert.equal(r.recordedSamples,3);assert.equal(r.intervalsAboveTarget,1);assert.equal(r.completeHistory,true);
 assert.equal(summarizeNativeCadenceTarget({result:{}}).completeHistory,false);
});
test('target validation rejects artificial invalid limits or fabricated contiguous history',()=>{
 assert.throws(()=>summarizeNativeCadenceTarget({}, {targetFrameMs:0}),/Invalid/);
 const r=summarizeNativeCadenceTarget({result:{cadence:{count:2},samples:[row(1000,null),row(1030,50)]}});
 assert.equal(r.completeHistory,false);assert.equal(r.topIntervals[0].afterPreviousDrawUntilCurrentStartMs,null);
 const conflicting=summarizeNativeCadenceTarget({result:{samples:[row(1000,null),row(1010,10),row(1030,30)]}});
 assert.equal(conflicting.completeHistory,false);
 assert.equal(conflicting.topIntervals[0].previousDrawMs,null);
});
