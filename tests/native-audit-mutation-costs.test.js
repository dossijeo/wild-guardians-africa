import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {rewriteMutationCosts} from '../tools/guardian/native-audit-mutation-costs.mjs';
import {rewritePreparationCosts} from '../tools/guardian/native-audit-preparation-costs.mjs';
const paths={host:'rendering/remote-webgpu-host.js',publication:'simulation/native-intent-control-publication.js',admission:'world/native-resource-admission.js'};
for(const [owner,path]of Object.entries(paths))test('mutation observation requires every original '+owner+' seam',()=>{
 const source=readFileSync(new URL('../src/'+path,import.meta.url),'utf8'),observed=rewriteMutationCosts(source,owner);
 assert.match(observed,/performance\.mark\('native-mutation:/);assert.notEqual(source,observed);
 assert.equal((observed.match(/\bawait\b/g)??[]).length,(source.match(/\bawait\b/g)??[]).length,'observation must not add an asynchronous boundary');
 assert.equal((observed.match(/\.onSubmittedWorkDone\(/g)??[]).length,(source.match(/\.onSubmittedWorkDone\(/g)??[]).length,'do not create a second fence');
 assert.throws(()=>rewriteMutationCosts(source+source,owner),/seam changed/);
 const seam=owner==='host'?'metrics.nativeMutationQuiescedAt=absoluteNow();':owner==='publication'?"type:'IntentMutationQuiesce'":'commitAttempted=true;';
 assert.throws(()=>rewriteMutationCosts(source.replace(seam,'changed();'),owner),/seam changed/);
});
test('mutation and preparation annotations compose in the same Host response',()=>{
 const source=readFileSync(new URL('../src/'+paths.host,import.meta.url),'utf8'),observed=rewriteMutationCosts(rewritePreparationCosts(source),'host');
 assert.match(observed,/qaStage\('initialize-uploads'\)/);assert.match(observed,/qaMutation\('hold-start'/);
 assert.match(observed,/metrics\.qaPresentationOpportunities\.push/,'retain early opportunities beyond the existing ring');
 assert.throws(()=>rewriteMutationCosts(source,'other'),/Unknown/);
});
