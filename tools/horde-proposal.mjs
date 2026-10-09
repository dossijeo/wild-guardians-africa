// Experimental arithmetic model only. Not imported by production simulation.
import {BALANCE as B} from '../src/simulation/balance.js';
export const HORDE_STAGES=Object.freeze([
 {first:6,last:10,maxAnimals:5,minAnimals:1,budgetScale:1,speciesCaps:[3,2,2,2,1]},
 {first:11,last:20,maxAnimals:7,minAnimals:3,budgetScale:1.5,speciesCaps:[5,3,2,2,1]},
 {first:21,last:40,maxAnimals:9,minAnimals:4,budgetScale:2,speciesCaps:[6,4,3,2,2]},
 {first:41,last:100,maxAnimals:12,minAnimals:6,budgetScale:3,speciesCaps:[8,5,4,3,2]},
]);
export function economicProposal(){
 const proposal=structuredClone(B);proposal.work_center.cost=800;
 proposal.workers.older_wage=30;proposal.workers.young_wage=40;proposal.workers.daily_run_distance_long_trips=4;
 for(const crop of proposal.crops){crop.base_attraction_value=crop.base_harvest_value;crop.base_harvest_value*=3;}
 return proposal;
}
export function proposalAttraction(plants,balance){
 return plants.reduce((sum,p)=>sum+(p.alive?balance.crops.find(c=>c.id===p.species).base_attraction_value:0),0);
}
export function stageFor(night){
 if(!Number.isInteger(night)||night<1||night>100)throw Error('Proposal scope is nights1..100');
 return night<=5?null:HORDE_STAGES.find(s=>night>=s.first&&night<=s.last);
}
export function enumerateProposal(budget,unlocked,{maxAnimals=5,minAnimals=1,speciesCaps=null,spendFraction=.75}={}){
 if(!Number.isInteger(budget)||budget<1||!Number.isInteger(maxAnimals)||maxAnimals<1)throw Error('Invalid proposal budget/cap');
 const species=B.animals.map((a,i)=>({...a,max_per_raid:speciesCaps?.[i]??a.max_per_raid})).filter(a=>unlocked.includes(a.id));
 const groups=[];let visited=0;
 const minimum=Math.min(minAnimals,budget),lower=Math.ceil(spendFraction*budget);
 function visit(i,cost,count,group){
  visited++;
  if(i===species.length){if(count>=minimum&&count<=maxAnimals&&cost>=lower&&cost<=budget)groups.push([...group]);return;}
  const animal=species[i];
  for(let n=0;n<=animal.max_per_raid&&count+n<=maxAnimals&&cost+n*animal.threat_cost<=budget;n++)visit(i+1,cost+n*animal.threat_cost,count+n,[...group,...Array(n).fill(animal.id)]);
 }
 visit(0,0,0,[]);return {groups,visited};
}
export function proposalGroups(night,budget,unlocked){
 const stage=stageFor(night);if(!stage)throw Error('First five nights retain the native single-species planner');
 return enumerateProposal(budget,unlocked,{maxAnimals:stage.maxAnimals,minAnimals:stage.minAnimals,speciesCaps:stage.speciesCaps});
}
