// Read-only audit of retained evidence. No campaign or production mutation.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const [baseline,candidate,output]=process.argv.slice(2);assert(baseline&&candidate&&output&&!existsSync(output),'Two retained cases and a new output file required');
const read=(root,name)=>JSON.parse(readFileSync(resolve(root,name),'utf8'));
const b=read(baseline,'report.json'),c=read(candidate,'partial.json'),receipt=read(candidate,'receipt.json');
assert.equal(receipt.status,'stopped-early-calibration');assert.equal(c.result,null);
const rows=c.receipts.daily;assert(rows.length>0);
for(const row of rows)assert.equal(row.finance.reconciliationDifference,0);
assert.equal(c.receipts.currentFinance.reconciliationDifference,0);
const sum=(ds,key)=>ds.reduce((total,d)=>total+d[key],0),first=b.daily.slice(0,rows.length);
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const bs=read(baseline,'source.json').sourceHashes,cs=read(candidate,'source.json').sourceHashes;
const nativeKeys=Object.keys(bs).filter(k=>k.startsWith('src/')||k.startsWith('content/balance/'));
const changedNative=nativeKeys.filter(k=>bs[k]!==cs[k]);assert.equal(changedNative.length,0,'No native parameter/source change allowed in crop-choice comparison');
const result={scope:'Six complete days only; partial day seven separately disclosed. Early stop is not economic defeat, full horizon or proof that a crop is unprofitable.',hashes:{baseline:sha(resolve(baseline,'report.json')),partial:sha(resolve(candidate,'partial.json'))},nativeSourceKeysCompared:nativeKeys.length,changedNative,
 completeDays:rows.map((d,i)=>({day:d.day,baselineCash:first[i].money,candidateCash:d.money,baselineLiving:first[i].living,candidateLiving:d.living,baselineIncome:first[i].finance.income,candidateIncome:d.finance.income,baselineIdle:first[i].unoccupiedSeconds/first[i].daylightSeconds,candidateIdle:d.unoccupiedSeconds/d.daylightSeconds})),
 completeIdle:{baseline:sum(first,'unoccupiedSeconds')/sum(first,'daylightSeconds'),candidate:sum(rows,'unoccupiedSeconds')/sum(rows,'daylightSeconds')},
 partialDay:{day:c.day,time:c.time,finance:c.receipts.currentFinance,activityIncludingPartial:c.receipts.nativeEvidence.meaningfulActivity},
 interpretation:'Completed-day prefix did not improve capital or activity. The partial seventh day already shows stronger income; do not compare its unfinished closing balance to a completed day or claim universal deterioration. No100-night acceptance or promotion.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({completeIdle:result.completeIdle,partialTime:c.time,partialIncome:c.receipts.currentFinance.income,nativeKeys:nativeKeys.length}));
