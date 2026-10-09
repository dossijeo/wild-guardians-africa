// Read-only attribution of already audited, frozen native campaigns.
// This never changes a policy, balance, seed, snapshot or simulation outcome.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {join,basename} from 'node:path';

const [output,...directories]=process.argv.slice(2);
assert.ok(output&&directories.length,'Usage: OUTPUT.json ARCHIVED_CASE_DIRECTORY...');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const results=directories.map(directory=>{
 const verification=JSON.parse(readFileSync(join(directory,'root-verification.json'),'utf8'));
 assert.equal(verification.status,'verified');
 const key=basename(directory).replace(/^responsible-100-/,'').replace(/-\d+$/,'');
 const reportBytes=gunzipSync(readFileSync(join(directory,key+'-report.json.gz')));
 const summaryBytes=gunzipSync(readFileSync(join(directory,key+'-summary.json.gz')));
 const report=JSON.parse(reportBytes),summary=JSON.parse(summaryBytes);
 assert.equal(report.provenance.gitHead,verification.recordedHead);
 assert.equal(report.daily.length,100);
 report.daily.forEach((row,i)=>assert.equal(row.day,i+1));
 const idle=rows=>Object.fromEntries(['budget','space','shift-end'].map(reason=>[reason,rows.reduce((total,row)=>total+row.idle[reason],0)]));
 const reasons=idle(report.daily),total=Object.values(reasons).reduce((a,b)=>a+b,0);
 assert.equal(total,summary.activity.unoccupiedSeconds);
 assert.equal(total/30000,summary.activity.unoccupiedFraction);
 const cash=summary.cashflow,income=BigInt(cash.harvestIncome);
 const runningCosts=BigInt(cash.seedCosts)+BigInt(cash.wageCosts)+BigInt(cash.repairCosts);
 assert.equal(income-runningCosts,BigInt(cash.operatingCashFlow));
 const bands=Array.from({length:5},(_,i)=>{
  const rows=report.daily.slice(i*20,i*20+20),reasons=idle(rows);
  return {firstDay:rows[0].day,lastDay:rows.at(-1).day,idleSecondsByReason:reasons,
   unoccupiedFraction:Object.values(reasons).reduce((a,b)=>a+b,0)/(rows.length*300),
   delivered:rows.reduce((a,r)=>a+r.delivered,0),planted:rows.reduce((a,r)=>a+r.planted,0),
   firstStaff:rows[0].staff,lastStaff:rows.at(-1).staff,
   openingCashAfterHiring:rows[0].before,closingCash:rows.at(-1).money,
   longestRecordedIdle:Math.max(...rows.map(r=>r.longestIdle))};
 });
 return {case:key,recordedHead:verification.recordedHead,reportSha256:sha(reportBytes),summarySha256:sha(summaryBytes),
  frozenActivityAcceptance:summary.activity.acceptance,idleSecondsByReason:reasons,bands,cashflow:cash,
  ratios:{wagesToHarvestIncome:Number(cash.wageCosts)/Number(income),
   operatingCashMargin:Number(income-runningCosts)/Number(income),
   harvestMultiplierForBreakEvenAtRecordedSpending:Number(runningCosts)/Number(income)},
  limitation:'The static break-even ratio holds recorded spending fixed. It cannot predict liquidity, reinvestment, inventory, delivery timing, damage, expansion or a changed-policy campaign. No balance adjustment is approved by this calculation.'};
});
writeFileSync(output,JSON.stringify({scope:'Attribution of frozen, fully audited 100-night native reports; not current-main replays or an optimization claim.',results},null,2)+'\n');
console.log(JSON.stringify(results.map(r=>({case:r.case,idle:r.frozenActivityAcceptance.measuredFraction,bands:r.bands.map(b=>b.unoccupiedFraction),ratios:r.ratios})),null,2));
