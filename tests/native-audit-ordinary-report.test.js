import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {ordinarySequenceComplete,reportOrdinary} from '../tools/guardian/native-audit-ordinary-report.mjs';
const stages=['start','packet-bytes','retained-preparations','draw-world-checks','combined-bytes','validate-operations','clock-contract','references','dependencies-wait','dependencies-ready','snapshot','control-rendezvous','clock-admission','classify-ownership','replay-analysis','pipeline-identities','pin-and-publish-pending','admitted'];
const marks=()=>stages.map((stage,at)=>({stage,at}));
test('all ordered admission stages are required, including internal work between start and admitted',()=>{
 assert.equal(ordinarySequenceComplete(marks()),true);
 for(let i=0;i<stages.length;i++)assert.equal(ordinarySequenceComplete(marks().filter((_,j)=>i!==j)),false,stages[i]);
 assert.equal(ordinarySequenceComplete([]),false);
});
test('duplicated or reordered stages cannot masquerade as a complete admission',()=>{
 const duplicate=marks();duplicate.splice(5,0,duplicate[5]);assert.equal(ordinarySequenceComplete(duplicate),false);
 const swapped=marks();[swapped[6],swapped[7]]=[swapped[7],swapped[6]];assert.equal(ordinarySequenceComplete(swapped),false);
});
test('unknown stages and invalid or reversed timestamps are incomplete evidence',()=>{
 for(const replacement of [{stage:'unknown'},{at:NaN},{at:-1}]){const rows=marks();Object.assign(rows[8],replacement);assert.equal(ordinarySequenceComplete(rows),false);}
});

test('raw and compressed reports retain the same full history; an interrupted export is never loss-free evidence',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'wg-ordinary-report-'));
 t.after(()=>{assert(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep+'wg-ordinary-report-'));fs.rmSync(dir,{recursive:true});});
 const mark=(name,detail)=>({name,ph:'I',ts:detail.at*1000,pid:1,tid:2,args:{data:{detail}}});
 const events=[mark('native-mutation:host:observation-start',{owner:'host',stage:'observation-start',session:'s',at:0}),
  ...marks().map(m=>mark('native-ordinary-frame:'+m.stage,{...m,sequence:1,activeSequence:null})),
  mark('native-submitted-draw',{ordinal:1,at:20,sequence:1,trigger:'raf',intervalMs:null,drawMs:1}),
  mark('native-presentation-opportunity',{ordinal:1,at:20,sequence:1,outcome:'submitted'}),
  mark('native-mutation:host:retired-drained',{owner:'host',stage:'retired-drained',session:'s',at:30,opportunityCount:1,submittedDrawCount:1})];
 const raw=Buffer.from('{"traceEvents":[\n'+events.map(e=>JSON.stringify(e)).join(',\n')+'\n]}');
 const results=[];
 for(const compressed of [false,true]){
  const prefix=path.join(dir,compressed?'gzip':'raw');fs.writeFileSync(prefix+'.json','{}');
  fs.writeFileSync(prefix+'.trace-complete.json',JSON.stringify({dataLossOccurred:false,collectionComplete:true}));
  fs.writeFileSync(prefix+(compressed?'.trace.json.gz':'.trace.json'),compressed?gzipSync(raw):raw);
  results.push(await reportOrdinary(prefix));
 }
 for(const r of results){assert.equal(r.coverage.tracedLifetime,true);assert.equal(r.traceLossFree,true);assert.equal(r.ordinarySequences,1);assert.deepEqual(r.incompleteSequences,[]);assert.equal(r.counts.frames,1);}
 assert.deepEqual(results[0].counts,results[1].counts);assert.deepEqual(results[0].stages,results[1].stages);
 const prefix=path.join(dir,'gzip');fs.writeFileSync(prefix+'.trace-complete.json',JSON.stringify({dataLossOccurred:false,collectionComplete:false}));
 assert.equal((await reportOrdinary(prefix)).traceLossFree,false);
 fs.writeFileSync(prefix+'.trace.json',raw);await assert.rejects(reportOrdinary(prefix),/Ambiguous trace/);
});
