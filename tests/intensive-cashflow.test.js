import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {summarizeIntensiveFarm} from '../tools/summarize_intensive_farm.mjs';

function recorded(){
 const root=new URL('../docs/qa/intensive-profile-comparison-20/',import.meta.url);
 const report=JSON.parse(readFileSync(new URL('olderMale-report.json',root),'utf8'));
 report.state=deserialize(gunzipSync(readFileSync(new URL('olderMale-state.json.gz',root))).toString('utf8'));
 return report;
}
test('recorded farm cash reconciles operating and capital flows separately',()=>{
 const report=recorded(),summary=summarizeIntensiveFarm(report),cash=summary.cashflow;
 assert.equal(summary.activity.acceptance.measuredFraction,summary.activity.unoccupiedFraction);
 assert.equal(summary.activity.acceptance.status,summary.activity.unoccupiedFraction<.25?'accepted':'not-accepted');
 assert.equal(summary.campaign100,'unverified');
 assert.equal(cash.wallCosts,'0');
 assert.equal(BigInt(cash.operatingCashFlow)-BigInt(cash.centreCosts)-BigInt(cash.wallCosts),BigInt(cash.netCashFlowAfterConstruction));
 assert.equal(1500n+BigInt(cash.netCashFlowAfterConstruction),BigInt(cash.endingBalance));
});
test('accounting fixture isolates multiple paid perimeter debits without hiding them in other net',()=>{
 // Synthetic ledger rows test classification only, not built/paid gameplay.
 const report=recorded(),before=summarizeIntensiveFarm(report).cashflow;
 for(const [id,n] of [['intensive-wall-900','-200'],['intensive-wall-901','-35'],['other-adjustment','-7']])report.state.ledger.entries[id]={n,d:'1'};
 report.state.ledger.balance.n=String(BigInt(report.state.ledger.balance.n)-242n);
 report.money-=242;
 const cash=summarizeIntensiveFarm(report).cashflow;
 assert.equal(cash.wallCosts,'235');
 assert.equal(BigInt(cash.otherNet),BigInt(before.otherNet)-7n);
 assert.equal(BigInt(cash.operatingCashFlow),BigInt(before.operatingCashFlow)-7n);
 assert.equal(BigInt(cash.netCashFlowAfterConstruction),BigInt(before.netCashFlowAfterConstruction)-242n);
 assert.equal(1500n+BigInt(cash.netCashFlowAfterConstruction),BigInt(cash.endingBalance));
});
