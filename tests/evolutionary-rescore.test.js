import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DEFAULT_GENES} from '../tools/evolutionary-balance/policy-genes.mjs';
import {genomeId} from '../tools/evolutionary-balance/ga.mjs';
import {scorePostIntro} from '../tools/evolutionary-balance/post-intro-fitness.mjs';
import {rescoreFrozenSearch} from '../tools/evolutionary-balance/rescore-post-intro-search.mjs';

test('frozen search rescore detects changed native reports and historical scores',()=>{
 const folder=mkdtempSync(join(tmpdir(),'wild-guardians-rescore-'));
 try{
  const genes=DEFAULT_GENES,id=genomeId(genes),scenario={biome:'sabana',seed:712};
  const config={fitnessVersion:'post-intro-v1',days:14,population:1,
   train:[scenario],minimumTerminalDeliveryPerDay:1};
  const report={status:'completed',...scenario,days:14,strategy:'evolved',
   completedNights:14,result:null,
   rows:Array.from({length:14},(_,i)=>({day:i+1,delivered:100,living:20,
    income:300,seeds:50,wages:100,repairs:0,walls:0,destroyed:0,
    money:150,reconciled:true})),raid:[]};
  const reportPath=join(folder,`test-${id}-sabana-712-14.json`);
  const score=scorePostIntro(report,14,{minimumTerminalDeliveryPerDay:1});
  const searchPath=join(folder,'search-test.json');
  const search={stamp:{implementationId:'test',runId:'test',runKind:'native-Wild-Engine-campaign',config},
   generations:[{generation:0,ranked:[{id,genes,
    cases:[{...scenario,score:score.score,valid:score.valid}]}]}]};
  writeFileSync(reportPath,JSON.stringify(report));
  writeFileSync(searchPath,JSON.stringify(search));
  const clean=rescoreFrozenSearch(searchPath);
  assert.equal(clean.generations[0].rankUnchanged,true);
  assert.equal(clean.reports.length,1);
  search.generations[0].ranked[0].cases[0].score++;
  writeFileSync(searchPath,JSON.stringify(search));
  assert.throws(()=>rescoreFrozenSearch(searchPath),/Historical score mismatch/);
  search.generations[0].ranked[0].cases[0].score--;
  writeFileSync(searchPath,JSON.stringify(search));
  const altered=JSON.parse(readFileSync(reportPath));
  altered.rows[0].reconciled=false;
  writeFileSync(reportPath,JSON.stringify(altered));
  assert.throws(()=>rescoreFrozenSearch(searchPath),/Unreconciled native ledger/);
 }finally{rmSync(folder,{recursive:true,force:true});}
});
