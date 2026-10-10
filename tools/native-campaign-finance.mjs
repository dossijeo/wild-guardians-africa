// Exact journal accounting, independent of estimated worker/productive output.
import {numberOf} from '../src/simulation/money.js';
export const campaignFinanceCheckpoint=s=>({balance:numberOf(s.ledger.balance),entries:new Set(Object.keys(s.ledger.entries))});
export function campaignFinanceDelta(before,s){
 const out={opening:before.balance,closing:numberOf(s.ledger.balance),income:0,refunds:0,wages:0,seeds:0,walls:0,centers:0,villages:0,repairs:0,otherCredits:0,otherDebits:0,entries:[]};
 for(const [id,q] of Object.entries(s.ledger.entries)){
  if(before.entries.has(id))continue;
  if(q.d!=='1')throw Error('Noninteger campaign accounting operation');
  const coins=numberOf(q);let category;
  if(id.startsWith('deliver:')){if(coins<=0)throw Error('Invalid delivery payment');category='income';}
  else if(coins>0)category=id.includes('refund')?'refunds':'otherCredits';
  else if(id.startsWith('intensive-hire-'))category='wages';
  else if(id.startsWith('intensive-plant-'))category='seeds';
  else if(id.startsWith('intensive-wall-'))category='walls';
  else if(id.startsWith('intensive-center-'))category='centers';
  else if(id.startsWith('intensive-village-'))category='villages';
  else if(id.startsWith('repair:'))category='repairs';
  else category='otherDebits';
  out[category]+=Math.abs(coins);out.entries.push({id,coins,category});
 }
 out.net=out.income+out.refunds+out.otherCredits-out.wages-out.seeds-out.walls-out.centers-out.villages-out.repairs-out.otherDebits;
 out.reconciliationDifference=out.closing-out.opening-out.net;
 if(out.reconciliationDifference!==0)throw Error('Campaign daily ledger does not reconcile');
 return out;
}
