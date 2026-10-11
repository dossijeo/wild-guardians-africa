// QA player budgeting only; native commands, FIFO, prices and money are intact.
import {repairCost} from '../src/simulation/game.js';
import {HIRING_RESERVE} from '../src/simulation/budget.js';
import {dawnMinimum} from "../src/simulation/rules.js";
export function settledRepairQuote(target){
 const q=repairCost(target),n=BigInt(q.n),d=BigInt(q.d);
 if(n<0n||d<=0n)throw Error('Invalid native repair quote');
 const amount=(n+d-1n)/d;
 if(amount>BigInt(Number.MAX_SAFE_INTEGER))throw Error('Unsafe native repair quote');
 return Number(amount);
}
export function breachRepairFunding(s,owned,reserve){
 if(!Number.isSafeInteger(reserve)||reserve<0)throw Error('Invalid repair reserve');
 const walls=s.structures.filter(w=>w.kind==='wall'&&owned.has(w.id));
 const breached=walls.some(w=>w.status==='ruined'||w.status==='collapsing');
 const ordered=walls.toSorted((a,b)=>Number(b.status==='ruined')-Number(a.status==='ruined')||
  a.hp/a.maxHp-b.hp/b.maxHp||a.id.localeCompare(b.id));
 // A breached, empty farm still needs seed cash as well as its minimum wage.
 // Use native recovery requirements, never predicted crop income.
 const recovery=Math.max(HIRING_RESERVE,dawnMinimum(s));
 return {breached,ordered,protectedCash:breached?recovery:Math.max(recovery,reserve)};
}
