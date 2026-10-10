import {BALANCE as B} from './balance.js';

// Rank the same depth-first order as rules.compositions without materializing
// every group. One rank draw therefore preserves existing saves and RNG order.
export function createRaidCompositionIndex(budget,unlocked){
 if(!Number.isSafeInteger(budget)||budget<1)throw Error('Positive integer raid budget required');
 const species=B.animals.filter(a=>unlocked.includes(a.id)),minimum=Math.ceil(.75*budget);
 const limit=B.raids.max_animals,memo=new Map();
 const maxCopies=(i,cost,count)=>Math.min(species[i].max_per_raid??budget,
  Math.floor((budget-cost)/species[i].threat_cost),(limit??budget)-count);
 const countWays=(i,cost,count)=>{
  if(i===species.length)return Number(cost>=minimum&&cost<=budget);
  const key=limit===null?`${i}:${cost}`:`${i}:${cost}:${count}`;
  if(memo.has(key))return memo.get(key);
  let total=0;
  for(let n=0;n<=maxCopies(i,cost,count);n++){
   total+=countWays(i+1,cost+n*species[i].threat_cost,count+n);
   if(!Number.isSafeInteger(total))throw Error('Raid composition count exceeds exact numeric range');
  }
  memo.set(key,total);return total;
 };
 const count=countWays(0,0,0);
 return {count,at(rank){
  if(!Number.isSafeInteger(rank)||rank<0||rank>=count)throw Error('Invalid raid composition rank');
  const group=[];let cost=0,animals=0;
  for(let i=0;i<species.length;i++){
   const a=species[i],maximum=maxCopies(i,cost,animals);let found=false;
   for(let n=0;n<=maximum;n++){
    const ways=countWays(i+1,cost+n*a.threat_cost,animals+n);
    if(rank>=ways){rank-=ways;continue;}
    for(let j=0;j<n;j++)group.push(a.id);
    cost+=n*a.threat_cost;animals+=n;found=true;break;
   }
   if(!found)throw Error('Raid composition rank traversal failed');
  }
  return group;
 }};
}
