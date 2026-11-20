import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rewritePreparationCosts,summarizePreparationCosts,rewriteTraceOnlyHistory,observePreparationCosts} from '../tools/guardian/native-audit-preparation-costs.mjs';
import {rewriteMutationCosts} from '../tools/guardian/native-audit-mutation-costs.mjs';
import {rewriteNativePipelineHost} from '../tools/guardian/native-audit-pipeline-timings.mjs';

test('ordinary admission observations stay opt-in and compose with preparation, resource and mutation observations',()=>{
 const source=readFileSync(new URL('../src/rendering/remote-webgpu-host.js',import.meta.url),'utf8');
 assert.doesNotMatch(rewritePreparationCosts(source),/qaOrdinaryFrameStages/);
 const annotated=rewriteMutationCosts(rewritePreparationCosts(source,{ordinary:true,resources:true}),'host');
 for(const stage of ['packet-bytes','retained-preparations','draw-world-checks','combined-bytes','clock-contract','control-rendezvous','clock-admission','admitted'])assert(annotated.includes("qaStage('"+stage+"')"));
 assert.match(annotated,/metrics\.qaOrdinaryFrameStages\.push\(row\)/);
 assert.match(annotated,/metrics\.qaPreparationStages\.push\(row\)/);
 assert.match(annotated,/native-ordinary-frame:/);
 assert.match(annotated,/native-submitted-draw/);
 assert.throws(()=>rewritePreparationCosts(source.replace('const nativeBindings=Array.from(clockBindings.values())','const nativeBindings=changed()'),{ordinary:true}),/seam changed/);
});

test('preparation annotations match the actual Host and reject changed seams',()=>{
 const source=readFileSync(new URL('../src/rendering/remote-webgpu-host.js',import.meta.url),'utf8');
 const annotated=rewritePreparationCosts(source);
 assert.match(annotated,/qaStage\('initialize-uploads'\)/);
 assert.match(annotated,/qaStage\('first-use-wait'\)/);
 assert.throws(()=>rewritePreparationCosts(source.replace('initializePreparedWorldFrame(packet,checkpoint);','changed(packet);')),/seam changed/);
 assert.throws(()=>rewritePreparationCosts(source+source),/seam changed/);
});
test('failed and incomplete runs keep their status and async waits',()=>{
 const marks=[{sequence:1,stage:'start',at:100},{sequence:1,stage:'first-use-wait',at:110},{sequence:1,stage:'ready',at:140},{sequence:2,stage:'start',at:200}];
 const report=summarizePreparationCosts({error:'Idle rejected',failure:{qaPreparationStages:marks,duplicate:{qaPreparationStages:marks}}});
 assert.equal(report.runOutcome,'failed');assert.equal(report.sequences.length,2);
 assert.equal(report.sequences[0].spans[1].includesAsyncWait,true);
 assert.equal(report.sequences[0].spans[1].milliseconds,30);
 assert.equal(report.sequences[0].complete,false);
 assert.equal(report.sequences[0].spans[0].adjacent,false);
 assert.equal(report.sequences[1].complete,false);
});
test('missing or contradictory marks cannot produce preparation claims',()=>{
 assert.throws(()=>summarizePreparationCosts({result:{}}),/No preparation marks/);
 assert.throws(()=>summarizePreparationCosts({result:{qaPreparationStages:[{sequence:1,stage:'start',at:1},{sequence:1,stage:'start',at:2}]}}),/Conflicting/);
});

test('trace-only annotations retain every mark and original await/fence while eliminating growing ordinary/opportunity copies',()=>{
 const source=readFileSync(new URL('../src/rendering/remote-webgpu-host.js',import.meta.url),'utf8'),observed=rewriteMutationCosts(rewritePreparationCosts(source,{ordinary:true}),'host'),bounded=rewriteTraceOnlyHistory(observed,{host:true});
 for(const seam of ['metrics.qaOrdinaryFrameStages.push(row);','metrics.qaPresentationOpportunities.push(qaOpportunity);']){
  assert(observed.includes(seam),'negative control: original observer retains the history');assert(!bounded.includes(seam));
  assert.throws(()=>rewriteTraceOnlyHistory(observed.replace(seam,''),{host:true}),/seam changed/);
 }
 assert.equal((bounded.match(/\bawait\b/g)??[]).length,(observed.match(/\bawait\b/g)??[]).length);
 assert.equal((bounded.match(/\.onSubmittedWorkDone\(/g)??[]).length,(observed.match(/\.onSubmittedWorkDone\(/g)??[]).length);
 assert.equal((observed.match(/performance\.mark\('native-/g)??[]).length,(bounded.match(/qaTraceMark\('native-/g)??[]).length);
 assert.match(bounded,/qaMutation\('retired-drained'|deviceIsLost\?'retired-device-loss':'retired-drained'/);
 assert.match(bounded,/metrics\.qaPreparationStages\.push\(row\)/);assert.match(bounded,/metrics\.qaMutationStages\.push\(row\)/);
 assert.throws(()=>rewriteTraceOnlyHistory(bounded,{host:true}),/already installed/);
 assert.throws(()=>rewriteTraceOnlyHistory(observed.replace("performance.mark('native-submitted-draw'","performance.mark('changed'"),{host:true}),/mark seams changed/);
 // Test the generated wrapper itself. Trace delivery here is a double; real
 // Chromium trace delivery after clearMarks still requires the GPU auditor.
 const retained=new Map(),emitted=[],perf={mark(name,options){retained.set(name,options);emitted.push({name,...structuredClone(options)});},clearMarks(name){retained.delete(name);}};
 const mark=new Function('performance',bounded.split('\n')[0]+'; return qaTraceMark;')(perf);
 for(let ordinal=1;ordinal<=5008;ordinal++)mark('native-presentation-opportunity',{detail:{ordinal,at:ordinal,outcome:ordinal===4961?'mutation-hold':'submitted'}});
 assert.equal(retained.size,0);assert.equal(emitted.length,5008);assert.equal(emitted[4960].detail.outcome,'mutation-hold');assert.equal(emitted.at(-1).detail.ordinal,5008);
});

test('trace-only history cannot run without all full-history trace observers',async()=>{
 const names=['QA_NATIVE_TRACE_ONLY_HISTORY','QA_NATIVE_TRACE','QA_NATIVE_MUTATION_TRACE','QA_NATIVE_ORDINARY_FRAME_TRACE'],old=Object.fromEntries(names.map(k=>[k,process.env[k]]));
 try{
  for(const missing of names.slice(1)){
   for(const k of names)process.env[k]='true';process.env[missing]='false';
   await assert.rejects(observePreparationCosts({context(){throw Error('must reject before registering routes');}},[]),/requires full trace/);
  }
 }finally{for(const k of names)if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}
});

test('existing pipeline timing annotations compose without a second route or copying descriptors in phase-only mode',()=>{
 const source=readFileSync(new URL('../src/rendering/remote-webgpu-host.js',import.meta.url),'utf8'),phases=rewritePreparationCosts(source,{ordinary:true}),pipelines=rewriteNativePipelineHost(phases,{descriptors:false}),observed=rewriteMutationCosts(pipelines,'host'),bounded=rewriteTraceOnlyHistory(observed,{host:true});
 assert.match(bounded,/descriptor:null,startedAt:null/);assert.doesNotMatch(bounded,/descriptor:structuredClone\(message.descriptor\)/);
 assert.match(rewriteNativePipelineHost(source),/descriptor:structuredClone\(message.descriptor\)/,'original optional descriptor audit remains available');
 for(const name of ['build','resolved','rejected'])assert(bounded.includes("qaTraceMark('native-pipeline-"+name+":'"));
 assert.equal((bounded.match(/\bawait\b/g)??[]).length,(source.match(/\bawait\b/g)??[]).length);
 assert.equal((bounded.match(/\.onSubmittedWorkDone\(/g)??[]).length,(source.match(/\.onSubmittedWorkDone\(/g)??[]).length);
 assert.throws(()=>rewriteNativePipelineHost(source.replace("resourceJob(entry.kind,'build',build)",'changed()')),/seam changed/);
});
