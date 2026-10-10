// QA observer only. No exposure multiplier, money grant or game command.
import assert from 'node:assert/strict';
import {createRepairSettlementEvidence} from './repair-settlement-evidence.mjs';
export function createNativeCampaignEvidence(initial){
 const repairs=createRepairSettlementEvidence(initial),decisions=[],requests=[],deliveries=[],daily=new Map();
 let lastEvent=initial.events.at(-1)?.id,lastElapsed=initial.elapsed,coverageLost=false;
 const knownTasks=new Set(initial.tasks.map(t=>t.id)),paid=new Set();
 const row=day=>{if(!daily.has(day))daily.set(day,{day,cropPurchases:0,wallPieces:0,wallOrders:0,income:0,deliveries:0,structureContacts:0});return daily.get(day);};
 function observe(s){
  assert.ok(s.elapsed>=lastElapsed);repairs.observe(s);
  const index=lastEvent?s.events.findIndex(e=>e.id===lastEvent):-1;
  if(lastEvent&&index<0)coverageLost=true;
  for(const e of s.events.slice(index+1)){
   const eventDay=decisions.at(-1)?.day??s.day,r=row(eventDay);
   if(e.type==='CropPlaced')r.cropPurchases++;
   if(e.type==='WallChainBuilt'){r.wallOrders++;r.wallPieces+=e.count;}
   if(e.type==='StructureHit')r.structureContacts++;
   if(e.type==='CrateDelivered'){
    const paymentId='deliver:'+e.targetId,amount=s.ledger.entries[paymentId];
    assert.ok(amount&&!paid.has(paymentId),'One physical delivery needs one unique payment');assert.equal(amount.d,'1');assert.ok(BigInt(amount.n)>0n);
    paid.add(paymentId);r.income+=Number(amount.n);r.deliveries++;deliveries.push({eventId:e.id,paymentId,day:eventDay,coins:amount.n,crateId:e.targetId,workerId:e.workerId});
   }
  }
  lastEvent=s.events.at(-1)?.id??lastEvent;lastElapsed=s.elapsed;
 }
 // Call after the player's decision and before ticking; one decision can have
 // many native purchases but contributes at most its actual duration to time.
 function decision(s,{seconds,reason='active',otherActions=0}){
  assert.ok(Number.isFinite(seconds)&&seconds>0&&seconds<=5);assert.ok(Number.isSafeInteger(otherActions)&&otherActions>=0);
  const decisionIndex=decisions.length;
  for(const task of s.tasks)if(task.kind==='repair'&&!knownTasks.has(task.id))requests.push({taskId:task.id,targetId:task.targetId,decisionIndex,day:s.day,time:s.time});
  for(const task of s.tasks)knownTasks.add(task.id);
  decisions.push({day:s.day,time:s.time,daylightSeconds:s.time<300?Math.min(seconds,300-s.time):0,reason,otherActions});
  observe(s);
 }
 function report(s){
  observe(s);const settlement=repairs.report(s),credited=new Set();
  for(const receipt of settlement.receipts)if(receipt.paidCoins>0&&receipt.restoredHp>receipt.previousHp){const request=requests.find(r=>r.taskId===receipt.taskId);if(request)credited.add(request.decisionIndex);}
  const daylight=decisions.reduce((n,r)=>n+r.daylightSeconds,0),idle=decisions.reduce((n,r,i)=>n+(r.otherActions||credited.has(i)?0:r.daylightSeconds),0);
  return structuredClone({coverageLost,status:coverageLost||settlement.status!=='verified'?'incomplete':'verified',deliveries,daily:[...daily.values()].map(r=>({...r,atLeast60CropPurchases:r.cropPurchases>=60})),repairSettlements:settlement,requests,decisions,meaningfulActivity:{daylightSeconds:daylight,unoccupiedSeconds:idle,unoccupiedFraction:daylight?idle/daylight:null,strictBelow25:daylight>0&&idle/daylight<.25,creditedPaidRepairDecisionCount:credited.size},scope:'Income only native CrateDelivered ledger entries; action time only decisions, paid HP-restoring requests attributed once. Wall purchases do not prove useful interception. Observe at every native tick; record outgoing day before dawn transition.'});
 }
 return {observe,decision,report};
}
