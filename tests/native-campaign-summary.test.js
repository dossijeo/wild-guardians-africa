import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeNativeCase} from '../tools/summarize-native-campaigns.mjs';
const fixture=()=>({receipt:{status:'observed-horizon'},source:{arguments:{strategy:'good',seed:712},gitHead:'frozen'},report:{completedNights:1,daily:[{day:1,finance:{opening:700,closing:675,income:50,refunds:0,otherCredits:0,wages:30,seeds:35,walls:10,centers:0,villages:0,repairs:0,otherDebits:0},living:7,delivered:5,destroyed:0,daylightSeconds:300,unoccupiedSeconds:60,planted:6,additionalWages:10}],nativeEvidence:{status:'verified',daily:[{day:1,income:50,cropPurchases:7,wallPieces:1}]},raidEvidence:{status:'verified',raids:[]}}});
test('summary preserves native opening seed and never double counts additional wages',()=>{
 const s=summarizeNativeCase(fixture());assert.equal(s.expenses,75);assert.equal(s.net,-25);assert.equal(s.daily[0].purchased,7);assert.equal(s.idleFraction,.2);assert.equal(s.completedNights,1);
});
test('partial remains incomplete and reports only completed days',()=>{
 const f=fixture();f.receipt={status:'incomplete-harness-error',message:'entry failed',nativeResult:null};f.partial={day:2,time:600,receipts:f.report};delete f.report;
 const s=summarizeNativeCase(f);assert.equal(s.observedDays,1);assert.equal(s.result,null);assert.equal(s.completedNights,null);assert.equal(s.incompleteAt.day,2);assert.equal(s.status,'incomplete-harness-error');
});
test('summary rejects live cases, ledger discrepancies and fictitious income',()=>{
 const a=fixture();a.receipt.status='running';assert.throws(()=>summarizeNativeCase(a),/terminal/);
 const b=fixture();b.report.daily[0].finance.closing++;assert.throws(()=>summarizeNativeCase(b),/reconcile/);
 const c=fixture();c.report.nativeEvidence.daily[0].income++;assert.throws(()=>summarizeNativeCase(c),/physically/);
});
