// Optional, read-only QA observer. It never requests or completes a repair.
import assert from 'node:assert/strict';

const repairPayments=s=>Object.keys(s.ledger.entries).filter(id=>id.startsWith('repair:'));
export function createRepairSettlementEvidence(initial){
 const identity=JSON.stringify([initial.slotId,initial.seed,initial.biome,initial.culture]);
 const baseline=new Set(repairPayments(initial)),receipts=[],events=new Map(),payments=new Set();
 let lastEvent=initial.events.at(-1)?.id,lastElapsed=initial.elapsed,coverageLost=false;
 const stateCheck=s=>{
  assert.equal(JSON.stringify([s.slotId,s.seed,s.biome,s.culture]),identity,'Repair evidence cannot span different games');
  assert.ok(Number.isFinite(s.elapsed)&&s.elapsed>=lastElapsed,'Repair evidence cannot rewind simulated time');
 };
 function reconcile(s,row){
  const debit=s.ledger.entries[row.paymentId];
  assert.ok(debit,'Completed repair must have its settled ledger entry');
  assert.equal(debit.d,'1','Repair payment must use whole coins');
  assert.equal(BigInt(debit.n),-BigInt(row.paidCoins),'Receipt must match the actual settled debit');
 }
 function observe(s){
  stateCheck(s);
  const index=lastEvent?s.events.findIndex(e=>e.id===lastEvent):-1;
  if(lastEvent&&index<0)coverageLost=true;
  for(const e of s.events.slice(index+1))if(e.type==='RepairApplied'){
   const r=e.repair;
   assert.ok(r&&typeof r.taskId==='string'&&r.taskId.length,'Repair receipt metadata is required');
   assert.equal(r.paymentId,`repair:${r.taskId}`);
   assert.ok(Number.isSafeInteger(r.paidCoins)&&r.paidCoins>=0,'Invalid settled repair price');
   assert.ok([r.previousHp,r.restoredHp,r.maxHp].every(Number.isFinite));
   assert.ok(r.previousHp>=0&&r.previousHp<=r.restoredHp&&r.restoredHp===r.maxHp&&r.maxHp>0);
   assert.ok(typeof r.previousStatus==='string'&&typeof e.workerId==='string'&&typeof e.targetId==='string');
   assert.ok(e.presentation&&[e.presentation.elapsed,e.presentation.x,e.presentation.z].every(Number.isFinite));
   const row={eventId:e.id,workerId:e.workerId,targetId:e.targetId,...structuredClone(r),arrival:structuredClone(e.presentation)};
   // After a lost window, an already observed event can still be retained.
   const prior=events.get(e.id);
   if(prior){assert.deepEqual(row,prior,'Previously observed repair facts changed');continue;}
   assert.ok(!baseline.has(r.paymentId)&&!payments.has(r.paymentId),'One payment cannot substantiate two completed repairs');
   reconcile(s,row);payments.add(r.paymentId);events.set(e.id,row);receipts.push(row);
  }
  lastEvent=s.events.at(-1)?.id??lastEvent;lastElapsed=s.elapsed;
 }
 function report(s){
  stateCheck(s);for(const row of receipts)reconcile(s,row);
  const unobservedPayments=repairPayments(s).filter(id=>!baseline.has(id)&&!payments.has(id));
  return structuredClone({status:coverageLost||unobservedPayments.length?'incomplete':'verified',coverageLost,
   baselinePayments:[...baseline],unobservedPayments,completedRepairs:receipts.length,
   paidRepairs:receipts.filter(r=>r.paidCoins>0).length,
   paidCoins:receipts.reduce((total,r)=>total+BigInt(r.paidCoins),0n).toString(),
   restoredHp:receipts.reduce((total,r)=>total+r.restoredHp-r.previousHp,0),receipts,
   scope:'Observed repair completions and settled payments after observer creation. Arrival endpoints are recorded, not independent proof of route traversal. Pre-existing payments are excluded. No requests, policies, RNG or world state are changed.'});
 }
 return {observe,report};
}
