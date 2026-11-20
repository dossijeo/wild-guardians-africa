import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rewritePreparationCosts,summarizePreparationCosts} from '../tools/guardian/native-audit-preparation-costs.mjs';
import {rewriteMutationCosts} from '../tools/guardian/native-audit-mutation-costs.mjs';

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
