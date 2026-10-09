import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const report=JSON.parse(readFileSync(new URL('../docs/qa/sfx-catalog-post-jam/inventory.json',import.meta.url),'utf8'));
const bank=JSON.parse(readFileSync(new URL('../public/content/sfx.json',import.meta.url),'utf8'));
test('complete catalogue audit reproduces from current source and exact original bytes',()=>{
 const result=JSON.parse(execFileSync(process.execPath,['tools/audit_sfx_catalog.mjs','--check'],{cwd:new URL('..',import.meta.url),encoding:'utf8'}));
 assert.equal(result.total,126);assert.equal(result.exactOriginalFiles,126);assert.equal(result.stale,false);
 assert.deepEqual(report.rows.map(row=>row.id),bank.items.map(item=>item.id));
});
test('assignments, context exceptions, reserves and alternatives stay distinct from audible acceptance',()=>{
 assert.deepEqual(report.classificationCounts,{'assigned-compatible-source':100,'context-exception':4,'scope-reserve':12,'unbound-alternative':10});
 for(const row of report.rows){
  assert.equal(row.audiblePlaybackVerified,false);assert.equal(row.runtimeUnused,row.runtimeStatus==='unassigned');
  if(row.runtimeStatus==='assigned'){
   assert(row.runtimeChains.length>0,row.id);
   for(const chain of row.runtimeChains){assert(chain.callers.length>=2,row.id);for(const point of [chain.assignment,...chain.callers]){
    const line=readFileSync(new URL('../'+point.file,import.meta.url),'utf8').split(/\r?\n/)[point.line-1];assert(line.includes(point.selector),row.id+' '+point.file+':'+point.line);
   }}
  }else{assert.equal(row.runtimeChains.length,0);assert(row.pendingContext,row.id);}
 }
});
test('latent wood variant and semantic alternatives do not become real bindings or duplicate files',()=>{
 const wood=report.rows.find(row=>row.id==='step_wood');assert(wood.sourceMentions.some(point=>point.file==='src/audio/movement-audio.js'));assert.equal(wood.classification,'context-exception');assert.equal(wood.runtimeChains.length,0);
 const sale=report.rows.find(row=>row.id==='ui_sell');assert.deepEqual(sale.semanticAlternatives,['eco_crop_sold']);assert.equal(sale.runtimeUnused,true);assert.deepEqual(sale.byteDuplicates,[]);
 assert.deepEqual(report.byteDuplicateGroups,[]);assert.equal(new Set(report.rows.map(row=>row.sha256)).size,126);
});
