import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeNativeCase,summarizeNativeRaid,writeNativeComparison} from '../tools/summarize-native-campaigns.mjs';

test('Area raids report native HP efficiency and never reuse single-plant legacy casualty bounds',()=>{
 const r=summarizeNativeRaid({...raid(),pressureFacts:{pressure:.7},potentialAgriculturalHp:100,effectiveAgriculturalHp:28,agriculturalEfficiency:.28,plantsReached:19,woundedAfterAttack:5,targetUnavailableAttempts:3,routeUnavailableAttempts:1});
 assert.equal(r.freshCropKillUpperBound,null);assert.equal(r.woundedCropKillUpperBound,null);
 assert.equal(r.referencePotentialAgriculturalHp,100);assert.equal(r.effectiveAgriculturalHp,28);
 assert.equal(r.agriculturalEfficiency,.28);assert.equal(r.plantsReached,19);assert.equal(r.woundedAfterAttack,5);
 assert.equal(r.targetUnavailableAttempts,3);assert.equal(r.routeUnavailableAttempts,1);
});
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
test('comparisons declare source and labour without inventing identical controls or missing shield permissions',()=>{
 const a=fixture();a.source.arguments={strategy:'no-walls',seed:712,days:6,labourPolicy:'q4',biome:'sabana',culture:'mapungubwe'};
 const s=summarizeNativeCase(a);assert.equal(s.labourPolicy,'q4');assert.equal(s.requestedDays,6);assert.equal(s.shieldEnabled,null);
 const b=fixture();b.report.shieldEnabled=false;b.report.labourPolicy='legacy';const e=summarizeNativeCase(b);assert.equal(e.shieldEnabled,false);assert.equal(e.labourPolicy,'legacy');
 const dir=mkdtempSync(join(tmpdir(),'wg-native-provenance-'));
 try{writeNativeComparison(dir,[s,e]);const text=readFileSync(join(dir,'comparison.md'),'utf8');assert.match(text,/q4.*frozen.*1 \/ 6/);assert.match(text,/no acredita que campañas de versiones distintas/);assert.match(readFileSync(join(dir,'daily.csv'),'utf8'),/gitHead,labourPolicy,shieldEnabled,biome,culture,requestedDays,protocolId/);}
 finally{rmSync(dir,{recursive:true,force:true});}
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
test('daily activity credits only settled useful repairs once, and preserves raw idle',()=>{
 const f=fixture(),native=f.report.nativeEvidence;
 native.decisions=[{day:1,daylightSeconds:60,otherActions:1},{day:1,daylightSeconds:120,otherActions:0},{day:1,daylightSeconds:120,otherActions:0}];
 native.requests=[{taskId:'useful',decisionIndex:1},{taskId:'unpaid',decisionIndex:2}];
 native.repairSettlements={receipts:[{taskId:'useful',paidCoins:3,previousHp:90,restoredHp:100},{taskId:'useful',paidCoins:3,previousHp:90,restoredHp:100},{taskId:'unpaid',paidCoins:0,previousHp:90,restoredHp:100}]};
 f.report.daily[0].unoccupiedSeconds=240;
 const s=summarizeNativeCase(f);assert.equal(s.idleFraction,.4);assert.equal(s.daily[0].rawDecisionIdleFraction,.8);
 assert.match(s.daily[0].activityBasis,/once-credited/);
 native.decisions[0].daylightSeconds=61;assert.throws(()=>summarizeNativeCase(f),/daylight/);
});
test('defense curve is a labeled reference, never included in actual expenses or cash',()=>{
 const f=fixture(),d=summarizeNativeCase(f).daily[0];
 assert.equal(d.expenses,75);assert.equal(d.money,675);assert.equal(d.cumulativeOperatingNet,-25);
 assert.equal(d.referenceRepairCostAtEndLiving,12+.42*7+.003*49);assert.equal(d.repairs,0);
 assert.equal(d.centers,0);assert.equal(d.villages,0);assert.match(d.activityBasis,/legacy/);
});
