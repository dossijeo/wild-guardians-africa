import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rewritePreparationCosts,summarizePreparationCosts} from '../tools/guardian/native-audit-preparation-costs.mjs';

test('preparation annotations match the actual Host and reject changed seams',()=>{
 const source=readFileSync(new URL('../src/rendering/remote-webgpu-host.js',import.meta.url),'utf8');
 const annotated=rewritePreparationCosts(source);
 assert.match(annotated,/qaStage\('initialize-uploads'\)/);
 assert.match(annotated,/qaStage\('first-use-wait'\)/);
 assert.throws(()=>rewritePreparationCosts(source.replace('initializePreparedWorldFrame(packet);','changed(packet);')),/seam changed/);
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
