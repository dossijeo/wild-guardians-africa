import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeNativeCase,summarizeNativeRaid,writeNativeComparison} from '../tools/summarize-native-campaigns.mjs';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
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
const raid=()=>({id:'raid-1',day:50,daytime:false,ended:true,exposureStatus:'exact-native-spawn',exposedLivingAtSpawn:100,exposedWoundedAtSpawn:7,actors:[{id:'animal-1'}],species:{warthog:{initialHitBudget:5,observedBudgetConsumed:4,maximumStructureDamage:100}},cropsDestroyed:2,cropHits:4,structureHpLost:0});
test('raid rates use exact attack-start exposure and distinguish potential from effective damage',()=>{
 const r=summarizeNativeRaid(raid());assert.equal(r.destroyedFraction,.02);assert.equal(r.hitBudget,5);assert.equal(r.freshCropKillUpperBound,2);assert.equal(r.woundedCropKillUpperBound,5);
 assert.equal(r.remainingOrUnobservedStrikes,1);assert.equal(r.potentialStructureDamage,100);assert.equal(r.structureHpLost,0);assert.equal(r.exposedWounded,7);
 assert.ok(Math.abs(r.targetUnprotected-.24)<1e-10);
});
test('unended or legacy raids cannot manufacture an exact final destruction rate',()=>{
 const a=raid();a.ended=false;assert.equal(summarizeNativeRaid(a).destroyedFraction,null);
 const b=raid();delete b.exposureStatus;assert.equal(summarizeNativeRaid(b).destroyedFraction,null);assert.equal(summarizeNativeRaid(b).exposedLiving,null);
 const c=raid();c.daytime=true;assert.equal(summarizeNativeRaid(c).targetProtected,null);
 const d=raid();d.species.warthog.observedBudgetConsumed=6;assert.throws(()=>summarizeNativeRaid(d),/budget/);
});
test('comparison exports individual waves and never overwrites retained evidence',()=>{
 const dir=mkdtempSync(join(tmpdir(),'wg-native-summary-'));
 try{const f=fixture();f.report.raidEvidence.raids=[raid()];const s=summarizeNativeCase(f);writeNativeComparison(dir,[s]);
  assert.match(readFileSync(join(dir,'raids.csv'),'utf8'),/good,712,raid-1,50,false,true,1,100,7/);
  assert.throws(()=>writeNativeComparison(dir,[s]),/overwrite/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
