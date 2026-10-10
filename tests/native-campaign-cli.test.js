import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseNativeCampaignArgs,runNativeCampaignCase} from '../tools/run_native_campaign.mjs';
const fakeProvenance=()=>({trackedChanges:[],startedAt:'fixture',sourceHashes:{fixture:'synthetic'}});
test('CLI fixes baseline defaults, accepts100 combat +80peace days and refuses invalid cases',()=>{
 const o=parseNativeCampaignArgs(['--out','fixture']);assert.equal(o.days,7);assert.equal(o.seed,712);
 assert.equal(parseNativeCampaignArgs(['--out','fixture','--days','180']).days,180);
 for(const n of ['0','181','1.5'])assert.throws(()=>parseNativeCampaignArgs(['--out','fixture','--days',n]));
 assert.throws(()=>parseNativeCampaignArgs(['--out','fixture','--strategy','reroll']));
});
test('partial tool error keeps original daily journal, source receipt and native result without inventing defeat',async()=>{
 const out=mkdtempSync(join(tmpdir(),'native-cli-contract-'));
 try{
  const run=async o=>{o.onDay({day:1,finance:{wages:30},unoccupiedSeconds:150});const e=Error('observation deadline');e.nativeCampaignPartial={result:null,day:2,time:600,receipts:{daily:[{day:1}]}};throw e;};
  const r=await runNativeCampaignCase({out,days:7,strategy:'good',seed:712},{run,provenance:fakeProvenance});
  assert.equal(r.exitCode,1);assert.equal(r.receipt.status,'incomplete-harness-error');assert.equal(r.receipt.nativeResult,null);
  assert.equal(JSON.parse(readFileSync(join(out,'days.jsonl'),'utf8')).finance.wages,30);
  assert.equal(JSON.parse(readFileSync(join(out,'partial.json'),'utf8')).time,600);
  assert.equal(JSON.parse(readFileSync(join(out,'source.json'),'utf8')).sourceHashes.fixture,'synthetic');
  await assert.rejects(()=>runNativeCampaignCase({out},{run,provenance:fakeProvenance}),/overwrite/);
 }finally{rmSync(out,{recursive:true,force:true});}
});
