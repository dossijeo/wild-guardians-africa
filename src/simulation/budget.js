import {compare,rational,add,negate} from './money.js';
import {PROFILES} from './workforce.js';
export const HIRING_RESERVE=Math.min(...PROFILES.map(p=>p.wage));
export const BUDGET_WARNING_THRESHOLD=HIRING_RESERVE+Math.max(...PROFILES.map(p=>p.wage));
export const RESERVE_MESSAGE='Conserva las últimas 30 monedas: las necesitarás para contratar mañana.';
// Daily salaries can use the reserve it was saved for. Optional purchases and
// repairs cannot consume it. Validate before changing the ledger or the world.
export function ensurePurchaseBudget(state,cost){
  const amount=typeof cost==='number'?rational(cost):cost;
  if(compare(add(state.ledger.balance,negate(amount)),rational(HIRING_RESERVE))<0){
    const error=new Error(RESERVE_MESSAGE);error.code='hiring-reserve';throw error;
  }
}
