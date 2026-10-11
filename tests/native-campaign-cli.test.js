import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseNativeCampaignArgs,runNativeCampaignCase} from '../tools/run_native_campaign.mjs';
const fakeProvenance=()=>({trackedChanges:[],startedAt:'fixture',sourceHashes:{fixture:'synthetic'}});
test('CLI fixes baseline defaults, accepts100 combat +80peace days and refuses invalid cases',()=>{
 const o=parseNativeCampaignArgs(['--out','fixture']);assert.equal(o.days,7);assert.equal(o.seed,712);
 assert.equal(o.plotFluidClearance,0);assert.equal(parseNativeCampaignArgs(['--out','fixture','--plot-fluid-clearance','1.5']).plotFluidClearance,1.5);
 for(const margin of ['-1','NaN','4'])assert.throws(()=>parseNativeCampaignArgs(['--out','fixture','--plot-fluid-clearance',margin]),/clearance/);
 assert.equal(parseNativeCampaignArgs(['--out','fixture','--days','180']).days,180);
 for(const n of ['0','181','1.5'])assert.throws(()=>parseNativeCampaignArgs(['--out','fixture','--days',n]));
 assert.throws(()=>parseNativeCampaignArgs(['--out','fixture','--strategy','reroll']));
 assert.throws(()=>parseNativeCampaignArgs(['--out','fixture','--stop-cash','10000']));
 assert.equal(parseNativeCampaignArgs(['--out','fixture','--stop-cash','10000','--stop-min-day','7'])['stop-cash'],10000);
});

test('defense material is an explicit native player choice with unchanged default',()=>{
 assert.equal(parseNativeCampaignArgs(['--out','fixture']).defenseMaterial,'zarzas');
 const chosen=parseNativeCampaignArgs(['--out','fixture','--defense-policy','shore','--defense-material','empalizada']);
 assert.equal(chosen.defenseMaterial,'empalizada');
 assert.throws(()=>parseNativeCampaignArgs(['--out','fixture','--defense-material','empalizada']),/requires funded/);
 assert.throws(()=>parseNativeCampaignArgs(['--out','fixture','--defense-policy','shore','--defense-material','free-invincible-wall']),/Material desconocido/);
});

test('rolling defense spending is opt-in and recorded in campaign provenance',()=>{
 assert.equal(parseNativeCampaignArgs(['--out','fixture']).defenseFunding,'contour');
 const o=parseNativeCampaignArgs(['--out','fixture','--defense-policy','shore','--defense-funding','rolling']);
 assert.equal(o.defenseFunding,'rolling');
 assert.throws(()=>parseNativeCampaignArgs(['--out','fixture','--defense-funding','rolling']),/funding/);
 assert.throws(()=>parseNativeCampaignArgs(['--out','fixture','--defense-policy','shore','--defense-funding','unlimited']),/funding/);
});
test('cooperative calibration stop preserves partial receipt without inventing native defeat',async()=>{
 const out=mkdtempSync(join(tmpdir(),'native-stop-contract-'));
 try{
  const run=async o=>{try{o.onDay({day:7,money:10000});}catch(e){e.nativeCampaignPartial={result:null,receipts:{daily:[{day:7,money:10000}]}};throw e;}};
  const r=await runNativeCampaignCase({out,days:100,strategy:'no-walls',seed:712,'stop-cash':10000,'stop-min-day':7},{run,provenance:fakeProvenance});
  assert.equal(r.exitCode,3);assert.equal(r.receipt.status,'stopped-early-calibration');assert.equal(r.receipt.nativeResult,null);
  assert.equal(JSON.parse(readFileSync(join(out,'days.jsonl'),'utf8')).day,7);
  assert.equal(JSON.parse(readFileSync(join(out,'partial.json'),'utf8')).receipts.daily[0].money,10000);
 }finally{rmSync(out,{recursive:true,force:true});}
});
test('stop-file is observed on a tick even before a daily checkpoint',async()=>{
 const out=mkdtempSync(join(tmpdir(),'native-stop-file-')),flag=join(tmpdir(),`native-stop-${process.pid}-${Date.now()}.flag`);
 try{
  writeFileSync(flag,'stop');
  const run=async o=>{try{o.onTick();}catch(e){e.nativeCampaignPartial={result:null,day:1,time:45,receipts:{daily:[]}};throw e;}};
  const r=await runNativeCampaignCase({out,'stop-file':flag},{run,provenance:fakeProvenance});
  assert.equal(r.exitCode,3);assert.equal(r.receipt.completedDailyRows,0);assert.equal(JSON.parse(readFileSync(join(out,'partial.json'),'utf8')).time,45);
 }finally{rmSync(out,{recursive:true,force:true});rmSync(flag,{force:true});}
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
