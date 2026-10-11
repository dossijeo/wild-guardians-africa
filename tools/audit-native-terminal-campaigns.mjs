// Read-only audit of archived native campaigns; never changes a campaign.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {BALANCE} from '../src/simulation/balance.js';
import {operational} from '../src/simulation/rules.js';
import {auditNativeDailyLedger} from './audit-native-daily-ledger.mjs';

const dirs=process.argv.slice(2);
assert.ok(dirs.length,'Pass terminal campaign directories');
let referenceHashes;
const cases=dirs.map(dir=>{
 const root=resolve(dir),read=name=>JSON.parse(readFileSync(join(root,name),'utf8'));
 const receipt=read('receipt.json'),report=read('report.json'),source=read('source.json');
 assert.ok(['observed-horizon','observed-native-defeat'].includes(receipt.status),'Only terminal native observations are accepted');
 const defeated=receipt.status==='observed-native-defeat',won=receipt.status==='observed-horizon'&&receipt.result==='victory';
 assert.equal(receipt.result,defeated?'defeat':won?'victory':null);assert.equal(report.result,receipt.result);
 const rows=readFileSync(join(root,'days.jsonl'),'utf8').trim().split(/\r?\n/).map(JSON.parse);
 assert.deepEqual(report.daily,rows,'Report and preserved daily ledger rows differ');
 let defeatPhase=defeated?'during-terminal-night':null;
 let victoryPhase=null;
 let postgameDays=0;
 if(won){
  assert.equal(receipt.completedNights,100,'Victory requires exactly one hundred completed nights');
  assert.equal(rows.length,100,'Victory requires one hundred complete daily ledger rows');
  const state=JSON.parse(gunzipSync(readFileSync(join(root,'state.json.gz'))));
  assert.equal(state.result,'victory');assert.equal(state.postgame,false);
  assert.equal(state.completedNights,100);assert.equal(state.day,101);assert.equal(state.time,0);assert.equal(state.raid,null);
  assert.equal(state.ledger.balance.d,'1');assert.equal(BigInt(state.ledger.balance.n),BigInt(report.money));
  const wonAt=state.events.findLastIndex(e=>e.type==='CampaignWon'),ended=state.events.findLastIndex(e=>e.type==='RaidEnded');
  assert.ok(ended>=0&&wonAt>ended,'Victory must follow the completed hundredth native raid');
  assert(!state.events.some(e=>e.type==='GameOver'),'Victory snapshot contains a defeat event');
  victoryPhase='dawn-after-hundredth-night';
 }
 if(!defeated&&!won&&receipt.completedNights>100){
  const state=JSON.parse(gunzipSync(readFileSync(join(root,'state.json.gz'))));
  assert.equal(state.postgame,true,'Long horizon requires actual postgame');assert.equal(state.result,null);
  assert.equal(state.completedNights,receipt.completedNights);assert.equal(state.day,receipt.completedNights+1);
  assert.equal(state.time,0);assert.equal(state.raid,null);
  assert.equal(state.ledger.balance.d,'1');assert.equal(BigInt(state.ledger.balance.n),BigInt(report.money));
  assert.equal(rows[99]?.result,'victory','Postgame requires the recorded hundredth-night victory');
  assert(rows.slice(100).every(row=>row.result===null),'Postgame contains another terminal result');
  assert.equal(report.counts.CampaignWon,1);assert.equal(report.counts.PostgameStarted,1);
  assert.equal(report.counts.GameOver??0,0);assert.equal(report.peaceAfter100,true);
  postgameDays=receipt.completedNights-100;
 }

 if(defeated&&rows.length===receipt.completedNights){
  // Economic irreversibility is also checked at dawn, after the last raid
  // has completed. It does not invent another played or completed night.
  const state=JSON.parse(gunzipSync(readFileSync(join(root,'state.json.gz'))));
  assert.equal(state.result,'defeat');assert.equal(state.completedNights,receipt.completedNights);
  assert.equal(state.day,rows.at(-1).day+1);assert.equal(state.time,0);assert.equal(state.raid,null);
  assert.equal(state.ledger.balance.d,'1');assert.equal(BigInt(state.ledger.balance.n),BigInt(report.money));
  const over=state.events.findLastIndex(e=>e.type==='GameOver'),ended=state.events.findLastIndex(e=>e.type==='RaidEnded');
  assert.ok(ended>=0&&over>ended,'Dawn defeat requires a completed native raid followed by GameOver');
  defeatPhase='dawn-after-completed-night';
 }else {
  assert.equal(rows.length,receipt.completedNights+(defeated?1:0));
  if(defeated){
   const state=JSON.parse(gunzipSync(readFileSync(join(root,'state.json.gz'))));
   assert.equal(state.result,'defeat');assert.equal(state.completedNights,receipt.completedNights);
   assert.equal(state.day,rows.at(-1).day);assert.equal(state.raid,null);
   assert(Number.isFinite(state.time)&&state.time>=0&&state.time<=600);
   assert.equal(state.ledger.balance.d,'1');assert.equal(BigInt(state.ledger.balance.n),BigInt(report.money));
   const over=state.events.findLastIndex(e=>e.type==='GameOver'),ended=state.events.findLastIndex(e=>e.type==='RaidEnded');
   assert(ended>=0&&over>ended,'Pre-dawn defeat requires completed native incursion and GameOver');
   assert(state.structures.some(c=>c.kind==='center'),'Defeat snapshot lacks original center state');
   assert(!state.structures.some(operational),'Pre-dawn defeat must have no operational center');
   assert(BigInt(state.ledger.balance.n)<BigInt(BALANCE.work_center.cost),'Pre-dawn defeat still affords a replacement center');
   defeatPhase='after-incursion-before-dawn';
  }
 }
 assert.equal(report.completedNights,receipt.completedNights);
 assert.equal(rows.at(-1).result,receipt.result);
 assert.equal(report.nativeEvidence.status,'verified');assert.equal(report.nativeEvidence.coverageLost,false);
 assert.equal(report.raidEvidence.status,'verified');assert.equal(report.raidEvidence.coverageLost,false);
 assert.deepEqual(report.raidEvidence.issues,[]);
 assert.equal(report.entryTransport.preparer.failed,0);assert.equal(report.entryTransport.workerFailure,null);
 referenceHashes??=source.sourceHashes;assert.deepEqual(source.sourceHashes,referenceHashes,'Compared source hashes must match');
 const {incomeIds,totals}=auditNativeDailyLedger(rows);
 const delivered=new Set();
 for(const e of report.nativeEvidence.deliveries){
  assert.ok(!delivered.has(e.paymentId),'Duplicate observed crate delivery');delivered.add(e.paymentId);
  assert.equal(incomeIds.get(e.paymentId),BigInt(e.coins),'Income must match observed physical delivery');
 }
 assert.equal(delivered.size,incomeIds.size);
 assert.equal(report.money,rows.at(-1).money);
 const raids=report.raidEvidence.raids;
 const raidIds=new Set(),nightRaids=new Map();
 const combatDays=Math.min(receipt.completedNights,100);
 for(const raid of raids){
  assert(Number.isSafeInteger(raid.day)&&raid.day>=1&&raid.day<=rows.length,'Raid outside recorded days');
  if(postgameDays)assert(raid.day<=100,'Postgame raid violates permanent peace');
  if(raid.id!==undefined){assert(!raidIds.has(raid.id),'Duplicate observed raid');raidIds.add(raid.id);}
  if(!raid.daytime){assert(!nightRaids.has(raid.day),'Duplicate nighttime raid');nightRaids.set(raid.day,raid);}
 }
 for(let day=1;day<=combatDays;day++)assert(nightRaids.has(day),'Missing completed-night incursion');
 if(report.counts.RaidSpawned!==undefined)assert.equal(report.counts.RaidSpawned,raids.length,'Spawn counter/observer mismatch');
 let assigned=0,consumed=0,unused=0;
 for(const r of raids){assert.equal(r.ended,true);for(const v of Object.values(r.species)){
  assert.equal(v.initialHitBudget,v.observedBudgetConsumed+v.unconsumedOrUnobservedBudget);
  assigned+=v.initialHitBudget;consumed+=v.observedBudgetConsumed;unused+=v.unconsumedOrUnobservedBudget;
 }}
 const postIntroduction=raids.filter(r=>r.day>=6&&!r.daytime);
 const exposure=postIntroduction.reduce((n,r)=>n+r.exposedLivingAtSpawn,0);
 const losses=postIntroduction.reduce((n,r)=>n+r.cropsDestroyed,0);
 for(const r of postIntroduction){
  assert.ok(Number.isSafeInteger(r.exposedLivingAtSpawn)&&r.exposedLivingAtSpawn>=0);
  assert.ok(r.cropsDestroyed<=r.exposedLivingAtSpawn);
 }
 const reference=(base,slope)=>exposure?postIntroduction.reduce((n,r)=>n+r.exposedLivingAtSpawn*(base+slope*(r.day-1)),0)/exposure:null;
 return {directory:dir,seed:report.seed,strategy:report.strategy,status:receipt.status,result:report.result,defeatPhase,victoryPhase,postgameDays,daytimeRaids:raids.filter(r=>r.daytime).length,terminalDay:rows.at(-1).day,completedNights:receipt.completedNights,money:report.money,living:rows.at(-1).living,centerHp:rows.at(-1).centerHp,destroyed:report.counts.CropDestroyed??0,totals,strikes:{assigned,consumed,unused},postIntroduction:{exposure,losses,weightedDestroyedFraction:exposure?losses/exposure:null,unprotectedReferenceFraction:reference(.2057,.0007),protectedReferenceFraction:reference(.0351,.0001),scope:'Nighttime references are hypotheses only, never applied damage; exposure is the native census at each raid spawn'},ledgerAndDeliveryMatch:true,sourceHashesMatch:true,scope:'Native terminal result and ledger only; a single hundred-night victory does not establish the strategy/seed matrix, human activity or general release acceptance'};
});
console.log(JSON.stringify({cases},null,2));
