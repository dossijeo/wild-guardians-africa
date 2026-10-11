// Read-only reasons for actual native policy decisions; no geometric inference.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const [directory,output]=process.argv.slice(2);assert(directory&&output&&!existsSync(output));
const bytes=readFileSync(directory+'/report.json'),r=JSON.parse(bytes),receipt=JSON.parse(readFileSync(directory+'/receipt.json'));
assert(['observed-horizon','observed-native-defeat'].includes(receipt.status));
assert.equal(r.completedNights,receipt.completedNights);
const history=r.defense?.history??[],reasons={},proofReasons={},routingReasons={},examples={},daily=new Map();
const count=(map,key)=>{map[key]=(map[key]??0)+1;};
for(const [index,h] of history.entries()){
 count(reasons,h.reason??'unrecorded');
 let d=daily.get(h.day);if(!d){d={day:h.day,decisions:0,geometricSearches:0,candidates:0,paidCost:0,paidPieces:0,reasons:{},firstPaidAt:null};daily.set(h.day,d);}
 d.decisions++;count(d.reasons,h.reason??'unrecorded');d.geometricSearches+=h.attempts.length>0?1:0;d.candidates+=h.attempts.length;
 d.paidCost+=h.paidCost;d.paidPieces+=h.paidPieces;if(h.paidCost&&d.firstPaidAt===null)d.firstPaidAt=h.time;
 for(const a of h.attempts){
  if(a.routing)count(routingReasons,a.routing);
  const reason=a.nativeBarrierProof?.reason??a.reason??'no-proof-recorded';count(proofReasons,reason);
  if(!examples[reason])examples[reason]={historyIndex:index,day:h.day,time:h.time,bounds:a.bounds,shore:!!a.shore,routed:!!a.routed,legal:a.legal,cost:a.cost,protectedCash:h.protectedCash,pendingRepairCoins:h.pendingRepairCoins,proof:a.nativeBarrierProof??null};
 }
}
const paid=history.reduce((n,h)=>n+h.paidCost,0),ledgerPaid=r.daily.reduce((n,d)=>n+d.finance.walls,0);
assert.equal(paid,ledgerPaid,'Planning receipts do not reconcile to actual wall debits');
if(r.defense)assert.equal(r.defense.paidCost,paid);
const hash=b=>createHash('sha256').update(b).digest('hex');
const result={status:'verified-native-defense-planning-history',directory,reportSha256:hash(bytes),receiptSha256:hash(readFileSync(directory+'/receipt.json')),sourceSha256:hash(readFileSync(directory+'/source.json')),defenseActive:r.policy.defend,paidCost:paid,paidPieces:history.reduce((n,h)=>n+h.paidPieces,0),historyReasonCounts:reasons,proofReasonCounts:proofReasons,routingReasonCounts:routingReasons,daily:[...daily.values()],firstExamples:examples,scope:'Recorded policy decision history and actual paid wall ledger only. A failed certificate is not proof of physical impossibility; no missing reasons are inferred. Does not time calculations, approve player strategy, classify a live run or calibrate animal damage.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,paidCost:paid,paidPieces:result.paidPieces,historyReasonCounts:reasons,proofReasonCounts:proofReasons,daily:result.daily}));
