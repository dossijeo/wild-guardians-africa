import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {join,resolve,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {gunzipSync} from 'node:zlib';
import * as Game from '../src/simulation/game.js';
import {serialize} from '../src/persistence/snapshots.js';
import {activeFarmDiagnosticOptions,runActiveFarmDiagnostic} from '../tools/run-active-farm-diagnostic.mjs';
function temporary(run){
 const root=mkdtempSync(join(tmpdir(),'wg-active-diagnostic-'));
 try{return run(join(root,'run'));}finally{
  assert(resolve(root).startsWith(resolve(tmpdir())+sep));rmSync(root,{recursive:true,force:true});
 }
}
test('diagnostic preserves the legacy CI choices rather than promoting them to a responsible policy',()=>{
 const a=activeFarmDiagnosticOptions('sunflower'),b=activeFarmDiagnosticOptions('mixed');
 assert.deepEqual(a,{days:100,startDay:5,profile:'olderFemale',repairBelowHp:540,plotCount:16,species:'girasol',diversifyDay:null,seed:712,biome:'sabana',culture:'mapungubwe'});
 assert.deepEqual({...b,diversifyDay:null},a);assert.equal(b.diversifyDay,20);
 assert.throws(()=>activeFarmDiagnosticOptions('improved'),/sunflower or mixed/);
});
test('journal fixture retains exact report and snapshot without inventing victory or rerunning',()=>temporary(out=>{
 const state=Game.newGame({seed:712,slotId:'journal-fixture'});let calls=0;
 const receipt=runActiveFarmDiagnostic('sunflower',out,{simulate:options=>{
  calls++;assert.deepEqual(Object.fromEntries(Object.entries(options).filter(([key])=>!['onDay','onProgress'].includes(key))),activeFarmDiagnosticOptions('sunflower'));
  options.onDay({day:1,money:1500,result:null});options.onProgress({day:1,time:30});
  return {state,nav:{},result:null,completedNights:0,money:1500,daily:[{day:1,money:1500}]};
 }});
 assert.equal(calls,1);assert.equal(receipt.status,'observed-horizon');assert.equal(receipt.nativeResult,null);
 assert.equal(gunzipSync(readFileSync(join(out,'state.json.gz'))).toString(),serialize(state));
 assert.equal(JSON.parse(readFileSync(join(out,'report.json'))).money,1500);
 assert.equal(JSON.parse(readFileSync(join(out,'progress.json'))).time,30);
 assert.match(JSON.parse(readFileSync(join(out,'source.json'))).scope,/not frozen/);
 assert.throws(()=>runActiveFarmDiagnostic('sunflower',out),/Fresh/);
}));
test('technical failure retains partial journal and is never labelled defeat',()=>temporary(out=>{
 assert.throws(()=>runActiveFarmDiagnostic('mixed',out,{simulate:options=>{
  options.onDay({day:7,money:42});throw Error('Diagnostic fixture route failure');
 }}),/fixture route failure/);
 const receipt=JSON.parse(readFileSync(join(out,'receipt.json')));
 assert.equal(receipt.status,'incomplete-diagnostic-error');assert.equal(receipt.daysObserved,1);
 assert.equal(receipt.nativeResult,undefined);
 assert.equal(JSON.parse(readFileSync(join(out,'days.jsonl'))).money,42);
}));
