// Read-only financial reconciliation of a cooperative campaign stop.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const [directory,output]=process.argv.slice(2);
if(!directory||!output||existsSync(output))throw Error('Stopped campaign and fresh output required');
const read=n=>JSON.parse(readFileSync(directory+'/'+n,'utf8'));
const receipt=read('receipt.json'),partial=read('partial.json'),state=JSON.parse(gunzipSync(readFileSync(directory+'/partial-state.json.gz')));
assert.equal(receipt.status,'stopped-early-calibration');
assert.equal(partial.result,state.result);assert.equal(receipt.nativeResult,state.result);
assert.equal(partial.day,state.day);assert.equal(partial.time,state.time);
const complete=partial.receipts.daily,finances=[...complete.map(d=>d.finance),partial.receipts.currentFinance],ids=new Set();
assert.equal(receipt.completedDailyRows,complete.length);let prior;
for(const f of finances){
 if(prior!==undefined)assert.equal(f.opening,prior);let delta=0n;
 for(const e of f.entries){assert(!ids.has(e.id));ids.add(e.id);assert(Number.isSafeInteger(e.coins));const q=state.ledger.entries[e.id];assert(q&&q.d==='1');assert.equal(BigInt(q.n),BigInt(e.coins));delta+=BigInt(e.coins);}
 assert.equal(BigInt(f.closing)-BigInt(f.opening),delta);assert.equal(f.reconciliationDifference,0);prior=f.closing;
}
assert.equal(state.ledger.balance.d,'1');assert.equal(BigInt(prior),BigInt(state.ledger.balance.n));
const result={status:'verified-retained-partial-finances',completedRows:complete.length,day:state.day,time:state.time,nativeResult:state.result,activeRaid:!!state.raid,currentMoney:prior,uniquePaidEntries:ids.size,
 scope:'Exact recorded partial finances and preserved snapshot only. A cooperative stop is not defeat, completed horizon, raid audit, balance or performance approval.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
