import {BALANCE} from '../../src/simulation/balance.js';
import {registerExperimentalPressure} from '../../src/simulation/raid-pressure-budget.js';

const MATERIALS=['zarzas','empalizada','adobe','reforzado','piedra'];

export function applyBalanceCandidate(candidate){
 if(!candidate||typeof candidate!=='object'||Array.isArray(candidate)||
  typeof candidate.id!=='string'||!(/^[a-z0-9-]{1,48}$/).test(candidate.id)||
  Object.keys(candidate).some(key=>!['id','walls','pressure'].includes(key)))
  throw Error('Invalid balance candidate');
 if(candidate.walls){
  if(!Array.isArray(candidate.walls)||candidate.walls.length!==MATERIALS.length)
   throw Error('Candidate needs five wall materials');
  let previousCost=0,previousHp=0,previousCostPerHp=Infinity;
  for(let i=0;i<MATERIALS.length;i++){
   const row=candidate.walls[i];
   if(!row||row.id!==MATERIALS[i]||Object.keys(row).sort().join('|')!=='cost|gate_hp|hp|id'||
    !Number.isSafeInteger(row.cost)||!Number.isSafeInteger(row.hp)||
    !Number.isSafeInteger(row.gate_hp)||row.cost<=previousCost||
    row.hp<=previousHp||row.gate_hp<1||row.gate_hp>=row.hp||
    row.cost/row.hp>=previousCostPerHp)
    throw Error('Invalid progressive wall table: '+MATERIALS[i]);
   previousCost=row.cost;previousHp=row.hp;previousCostPerHp=row.cost/row.hp;
  }
  for(let i=0;i<MATERIALS.length;i++){
   const target=BALANCE.walls[i],row=candidate.walls[i];
   target.cost=row.cost;target.hp=row.hp;target.gate_hp=row.gate_hp;
  }
 }
 if(candidate.pressure){
  if(Object.keys(candidate.pressure).sort().join('|')!==
   'count|halfSaturation|hits|structure')throw Error('Invalid pressure fields');
  registerExperimentalPressure({id:candidate.id,...candidate.pressure});
 }
 return candidate;
}
