// Read-only comparison of observed damage/settlement with an advisory cost curve.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const [directory,output]=process.argv.slice(2);
if(!directory||!output||existsSync(output))throw Error('Terminal directory and fresh output required');
const read=name=>JSON.parse(readFileSync(directory+'/'+name,'utf8'));
const report=read('report.json'),receipt=read('receipt.json');
assert(['observed-horizon','observed-native-defeat'].includes(receipt.status));
assert.equal(report.raidEvidence.status,'verified');
assert.equal(report.raidEvidence.coverageLost,false);
assert.deepEqual(report.raidEvidence.issues,[]);
const seen=new Set();
const daily=report.daily.map(day=>{
 assert.equal(day.finance.reconciliationDifference,0);
 const repairs=day.finance.entries.filter(e=>e.category==='repairs');
 let repairCoins=0n;
 for(const e of repairs){assert(!seen.has(e.id),'Duplicate repair payment');seen.add(e.id);const coins=BigInt(e.coins);assert(coins<0n);repairCoins-=coins;}
 assert.equal(repairCoins,BigInt(day.finance.repairs),'Repair total must match actual ordered ledger debits');
 const raids=report.raidEvidence.raids.filter(r=>r.day===day.day);
 const night=raids.find(r=>!r.daytime);
 // Choose one census, not the sum of repeated exposure to the same cohort.
 const referenceN=night?.exposedLivingAtSpawn??day.before;
 assert(Number.isSafeInteger(referenceN)&&referenceN>=0);
 const contacts=raids.map(raid=>{
  assert.equal(raid.ended,true);
  const potential=raid.potentialAgriculturalHp,effective=raid.effectiveAgriculturalHp;
  assert(Number.isFinite(potential)&&potential>=0&&Number.isFinite(effective)&&effective>=0);
  const hits=Object.values(raid.species).reduce((a,v)=>({assigned:a.assigned+v.initialHitBudget,used:a.used+v.observedBudgetConsumed,unused:a.unused+v.unconsumedOrUnobservedBudget}),{assigned:0,used:0,unused:0});
  assert.equal(hits.assigned,hits.used+hits.unused);
  return {id:raid.id,daytime:raid.daytime,pressure:raid.pressureFacts.pressure,
   militaryCandidate:raid.pressureFacts.candidateVersion,exposed:raid.exposedLivingAtSpawn,
   destroyed:raid.cropsDestroyed,destructionFraction:raid.exposedLivingAtSpawn?raid.cropsDestroyed/raid.exposedLivingAtSpawn:null,
   potentialAgriculturalHp:potential,effectiveAgriculturalHp:effective,agriculturalEfficiency:potential?effective/potential:null,
   assignedHits:hits.assigned,consumedHits:hits.used,unusedHits:hits.unused,
   cropContacts:raid.cropHits,wallContacts:raid.wallHits,centerContacts:raid.centerHits,shieldContacts:raid.shieldContacts,
   wallHpLost:raid.wallHpLost,totalStructureHpLost:raid.structureHpLost};
 });
 return {day:day.day,referenceN,referenceCensus:night?'night-native-spawn':'day-opening',
  advisoryRepairCoins:12+.42*referenceN+.003*referenceN*referenceN,
  actualPaidRepairCoins:Number(repairCoins),paidRepairEntries:repairs.length,contacts};
});
const firstClosure=report.defense?.history.find(h=>h.complete);
const totals=daily.reduce((a,d)=>{
 a.actualPaidRepairCoins+=d.actualPaidRepairCoins;a.advisoryRepairCoins+=d.advisoryRepairCoins;
 for(const r of d.contacts){for(const key of ['wallContacts','centerContacts','shieldContacts','wallHpLost','totalStructureHpLost','potentialAgriculturalHp','effectiveAgriculturalHp','destroyed'])a[key]+=r[key];}
 return a;
},{actualPaidRepairCoins:0,advisoryRepairCoins:0,wallContacts:0,centerContacts:0,shieldContacts:0,wallHpLost:0,totalStructureHpLost:0,potentialAgriculturalHp:0,effectiveAgriculturalHp:0,destroyed:0});
const result={directory,status:'verified',strategy:report.strategy,material:report.defense?.material??null,
 firstRecordedCompleteContour:firstClosure?{day:firstClosure.day,time:firstClosure.time,reason:firstClosure.reason}:null,
 totals,daily,scope:'Observed native damage and paid repairs, not synthetic charges. Advisory curve uses the night-spawn living census, including introductory nights for disclosure only. Payments can settle earlier damage. Recorded contour completion is geometry evidence, not universal physical interception. Alternative agricultural and structural potential cannot be added as performed damage. This does not approve balance or human activity.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({directory,firstRecordedCompleteContour:result.firstRecordedCompleteContour,totals}));
