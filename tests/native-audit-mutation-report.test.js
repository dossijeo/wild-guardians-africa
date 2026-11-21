import test from 'node:test';
import assert from 'node:assert/strict';
import {mutationReport} from '../tools/guardian/native-audit-mutation-report.mjs';
const names=['request-received','hold-start','drained','ack-send','release-received','world-installed','released'];
const fixture=()=>({host:{rafIndependent:true,qaMutationStages:names.map((stage,i)=>({stage,at:100+i,holdId:1,session:'s',authorityEpoch:'a'})),qaPresentationOpportunities:[{at:102,intervalMs:16,outcome:'mutation-hold',holdId:1}],samples:[{at:106,intervalMs:49,drawMs:2}]}});
test('an interval below 50ms is still reported against the caller target, independently of a short draw',()=>{
 const r=mutationReport(fixture(),{targetMs:16.67});assert.equal(r.targetExceedances.submittedDrawStarts.length,1);assert.equal(r.targetExceedances.draws.length,0);assert.equal(r.holds[0].missedOpportunities.length,1);assert.equal(r.holds[0].holdMs,5);assert.equal(r.holds[0].drainMs,1);assert.equal(r.holds[0].complete,true);
});
test('no supplied target means no invented acceptance threshold',()=>{const r=mutationReport(fixture());assert.equal(r.targetMs,null);assert.equal(r.targetExceedances,null);assert.equal(r.maxima.submittedDrawStartIntervalMs,49);});
test('duplicate snapshots are not extra evidence and incomplete or misordered holds are not completed',()=>{
 const f=fixture(),r=mutationReport({a:f,b:structuredClone(f)});assert.equal(r.counts.frames,1);assert.equal(r.holds.length,1);
 f.host.qaMutationStages.pop();assert.equal(mutationReport(f).holds[0].complete,false);assert.deepEqual(mutationReport(f).holds[0].missing,['released']);
 f.host.qaMutationStages[2].at=99;assert.equal(mutationReport(f).holds[0].ordered,false);
});
test('a truncated ring without whole-history instrumentation cannot substitute for the complete record',()=>{
 const f=fixture();f.host.presentationOpportunities=f.host.qaPresentationOpportunities;delete f.host.qaPresentationOpportunities;assert.equal(mutationReport(f).wholeHistoryPresent,false);assert.throws(()=>mutationReport(f,{targetMs:0}),/positive/);
});
test('trace reconciles a post-inspect tail and only terminal observation can certify its recorded lifetime',()=>{
 const f=fixture(),tail=names.map((stage,i)=>({stage,at:200+i,holdId:2,session:'s',authorityEpoch:'a'}));
 const trace={history:{stages:[{stage:'observation-start',at:90,session:'s'},...f.host.qaMutationStages,...tail,{stage:'retired-drained',at:210,session:'s',opportunityCount:2,submittedDrawCount:1}],opportunities:[...f.host.qaPresentationOpportunities.map(o=>({...o,ordinal:1})),{ordinal:2,at:202,outcome:'mutation-hold',holdId:2}],frames:f.host.samples.map(f=>({...f,ordinal:1}))},phases:[]};
 const r=mutationReport(f,{trace});assert.equal(r.holds.length,2);assert.equal(r.coverage.tracedLifetime,true);assert.equal(r.holds[1].missedOpportunities.length,1);assert.equal(r.counts.frames,1);assert.equal(r.counts.opportunities,2);
 trace.history.opportunities[1].ordinal=3;assert.equal(mutationReport(f,{trace}).coverage.tracedLifetime,false);trace.history.opportunities[1].ordinal=2;
 trace.history.stages.pop();assert.equal(mutationReport(f,{trace}).coverage.tracedLifetime,false);assert.equal(mutationReport(f).coverage.tracedLifetime,false);
});
