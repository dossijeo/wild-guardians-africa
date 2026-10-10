import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function analyseOpening(path){
 const input=readFileSync(path),r=JSON.parse(gunzipSync(input));assert.equal(r.policy.profile,'olderFemale');assert.equal(r.policy.plantsPerWorker,12);assert.equal(r.policy.middayHiring,false);assert.equal(r.policy.mixed,true);
 assert.ok(r.daily.slice(0,5).every(d=>d.centerHp.length===1&&d.centerHp[0]===600));assert.ok(r.commands.filter(c=>c.kind==='repair').every(c=>c.day>5));
 const rows=[];for(let day=1;day<=5;day++){
  const samples=r.decisions.filter(d=>d.day===day&&d.reason==='budget'&&!d.actions&&d.daylightSeconds>0),actorSeconds={},queueRanges={},balances=samples.map(d=>d.balance);let maintenanceOnly=0,belowLabourAndSeed=0;const reserves=[];
  for(const d of samples){const dt=d.daylightSeconds;for(const [k,n] of Object.entries(d.workerStates))actorSeconds[k]=(actorSeconds[k]??0)+n*dt;for(const [k,n] of Object.entries(d.queueKinds)){const range=queueRanges[k]??={min:n,max:n};range.min=Math.min(range.min,n);range.max=Math.max(range.max,n);}
   // These components were NOT recorded by onDecision. Derive only this
   // restricted opening: same staff all day, intact600 centre, mijo5, no
   // defence reservation until day10. Source formula is explicit and fixed.
   const nextWages=d.staff*30,labour=Math.max(nextWages,Math.ceil((d.living+1)/12)*30),maintenance=100,seed=5;
   assert.ok(d.balance<labour+maintenance+seed,'Budget sample did not satisfy original failed purchase condition');
   if(d.balance>=labour+seed)maintenanceOnly+=dt;else belowLabourAndSeed+=dt;reserves.push({nextWages,labour});
  }
  const daily=r.daily.find(d=>d.day===day),min=(a)=>a.length?Math.min(...a):null,max=(a)=>a.length?Math.max(...a):null;
  rows.push({day,budgetSeconds:samples.reduce((n,d)=>n+d.daylightSeconds,0),shiftEndSeconds:daily.idle['shift-end'],balanceRange:[min(balances),max(balances)],staff:daily.staff,pendingTaskRange:[min(samples.map(d=>d.pendingTasks)),max(samples.map(d=>d.pendingTasks))],queueRanges,workerActorSeconds:actorSeconds,derivedReserveAttribution:{maintenanceOnlySeconds:maintenanceOnly,belowLabourPlusSeedSeconds:belowLabourAndSeed,nextWagesRange:[min(reserves.map(d=>d.nextWages)),max(reserves.map(d=>d.nextWages))],labourReserveRange:[min(reserves.map(d=>d.labour)),max(reserves.map(d=>d.labour))],scope:'Counterfactual removal of reserve component, not spend permission or a proposed policy change. No attribution between present-team and future-growth reserve without additional retained state.'},physicalDeliveriesInDay:daily.delivered,firstDeliveryTime:null,scope:'Left-endpoint sampled actor-seconds; not travel metres or player elapsed seconds'});
 }
 return {inputSHA256:hash(input),source:'88ebf647b6bbe0d589125e4136d65e73fdf303a6',rows,missingMeasurements:['First delivered crate timestamp for each historical day','Worker positions, routes and taskIDs in retained decision samples','Direct onDecision reserve fields; restricted derivation assumptions are explicit'],noNewSimulation:true};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const r=analyseOpening(process.argv[2]);writeFileSync(process.argv[3],JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r.rows.map(d=>({day:d.day,budget:d.budgetSeconds,maintenance:d.derivedReserveAttribution.maintenanceOnlySeconds,team:d.derivedReserveAttribution.belowLabourPlusSeedSeconds}))));}
