import test from 'node:test';
import assert from 'node:assert/strict';
import {denseWorldMaizeReportPrefix} from './lib/frontside-dense-world-maize-report.mjs';
const fixture=()=>({status:'WORLD_DENSE_MAIZE_GPU_NOT_APPROVED',denseWorldMaizeQa:true,visualAcceptancePolicyVersion:3,viewProfile:'DECLARED_DENSE_NATIVE_WORLD_MAIZE_V1',candidateBinarySha256:'3eba51ae256663c20bdfcfc4f9e0133a304e8a6dfa25b072a07154b82f0ee65c',candidateBinaryBytes:253326,sourceSha256:'be4bb7e7eab2149516c1ecc0c364d77c4a62f116c4847cf0ef6f3308dc6180ef',quality:'media',campaign:'review',qaDepth:'off',vfx:'on',sourceStateSha256:'a'.repeat(64),workloadStateSha256:'b'.repeat(64),resolution:[1280,720],scenario:{profile:'ARCHIVED_POSITIONS_DENSE_NATIVE_MAIZE_QA_V1',artificialWorkload:true,matureMaizeCount:1257},visualReview:{status:'HUMAN_REVIEW_PENDING',reviewer:null,decision:null},conditions:{gpuTiming:false,bufferReadback:false},cleanup:{closed:true,contextLost:true,errors:[]},errors:[],arms:[]});
test('transport preserves negative/incomplete timing and diagnostic visual metrics without approval',()=>{
 const report=fixture();report.comparison={changedRgbPixels:9000};assert.equal(denseWorldMaizeReportPrefix(report),'maize-world-dense-review-depth-off-vfx-on');
 report.campaign='timing';report.conditions.gpuTiming=true;report.timing={blocks:[],invalidCollection:'pending query failure retained',analysisError:'Incomplete'};assert.equal(denseWorldMaizeReportPrefix(report),'maize-world-dense-timing-depth-off-vfx-on');
});
test('preflight placeholders cannot be submitted as a native timing artifact',()=>{
 const report=fixture();report.preflightOnly=true;assert.throws(()=>denseWorldMaizeReportPrefix(report),/preflightOnly/);assert.equal(denseWorldMaizeReportPrefix(report,{preflight:true}),'maize-world-dense-review-depth-off-vfx-on');
});
test('changed provenance, unlabelled artificial workload and fake human approval are rejected',()=>{
 for(const mutate of [r=>r.candidateBinaryBytes++,r=>r.scenario.artificialWorkload=false,r=>r.visualReview.status='APPROVED',r=>r.conditions.bufferReadback=true]){const report=fixture();mutate(report);assert.throws(()=>denseWorldMaizeReportPrefix(report),/Unexpected dense/);}
});
