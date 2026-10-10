import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialStaffingPlan,INITIAL_STAFFING_POLICY} from '../tools/horde-initial-staffing-policy.mjs';
import {DECLARED_SELF_CONSISTENT_PILOT,selfConsistentOptions,selfConsistentProvenance} from '../tools/horde-defense-self-consistent-comparison.mjs';
import {cropSpec} from '../src/simulation/rules.js';
const input=()=>({money:695,living:1,wage:30,seedCost:cropSpec('mijo').plant_cost,maintenanceReserve:100,plantsPerWorker:6});
test('Opening minimum crew7 funds real today/tomorrow and35 purchasable seeds; input untouched',()=>{
 const before=input(),copy=structuredClone(before),p=initialStaffingPlan(before);assert.deepEqual(before,copy);assert.equal(p.policy,INITIAL_STAFFING_POLICY);assert.equal(p.status,'self-consistent');assert.equal(p.count,7);assert.equal(p.paidToday,210);assert.equal(p.balanceAfterHire,485);assert.equal(p.nextDayWages,210);assert.equal(p.seedBudget,175);assert.equal(p.newSeeds,35);assert.equal(p.forecastLiving,36);assert.equal(p.capacityProxy,42);
});
test('Exact wages plus maintenance plus one seed boundary does not invent money',()=>{
 const p=initialStaffingPlan({...input(),money:165});assert.equal(p.count,1);assert.equal(p.status,'self-consistent');assert.equal(p.seedBudget,5);assert.equal(p.newSeeds,1);
 const q=initialStaffingPlan({...input(),money:164});assert.equal(q.count,1);assert.equal(q.status,'fallback-no-investment');assert.equal(q.seedBudget,4);assert.equal(q.newSeeds,0);assert.equal(q.balanceAfterHire,134);
});
test('Actual selected seed cost and damaged-centre reserve change the forecast',()=>{
 const dear=initialStaffingPlan({...input(),seedCost:10});assert.equal(dear.count,5);assert.equal(dear.newSeeds,29);assert.equal(dear.forecastLiving,30);assert.equal(dear.capacityProxy,30);
 const damaged=initialStaffingPlan({...input(),maintenanceReserve:174});assert.equal(damaged.count,6);assert.equal(damaged.seedBudget,161);assert.equal(damaged.newSeeds,32);assert.equal(damaged.inputs.maintenanceReserve,174);
 const defense=initialStaffingPlan({...input(),defenseReserve:500});assert.equal(defense.count,1);assert.equal(defense.seedBudget,35);assert.equal(defense.newSeeds,7); // Capacity8>6: no consistent candidate.
 assert.equal(defense.status,'fallback-no-investment');
});
test('Fallback hires only living-crop minimum affordable cohort and discloses deficit',()=>{
 const p=initialStaffingPlan({...input(),money:164,living:7});assert.equal(p.count,2);assert.equal(p.minimumLivingCrew,2);assert.equal(p.paidToday,60);assert.equal(p.balanceAfterHire,104);assert.equal(p.seedBudget,-56);assert.equal(p.reserveShortfall,56);assert.equal(p.newSeeds,0);assert.equal(p.status,'fallback-no-investment');
 const limited=initialStaffingPlan({...input(),money:60,living:100});assert.equal(limited.count,2);assert.equal(limited.capacityShortfall,88);assert.equal(limited.balanceAfterHire,0);
 const none=initialStaffingPlan({...input(),money:29});assert.equal(none.count,0);assert.equal(none.status,'infeasible-no-affordable-worker');assert.equal(none.paidToday,0);assert.equal(none.balanceAfterHire,29);
});
test('No fractional/negative costs or invalid ratios accepted',()=>{
 for(const bad of [{wage:0},{seedCost:0},{plantsPerWorker:0},{money:1.5},{maintenanceReserve:-1}])assert.throws(()=>initialStaffingPlan({...input(),...bad}));
});
test('Separate both-arm policy is identical productively; all390 historical sources untouched',()=>{
 const callback=()=>{},a=selfConsistentOptions('responsible',callback),b=selfConsistentOptions('neglect',callback);assert.deepEqual({...a,arm:'same'},{...b,arm:'same'});assert.equal(a.onDay,callback);assert.equal(a.initialStaffingPolicy,INITIAL_STAFFING_POLICY);assert.equal(a.plantsPerWorker,6);assert.equal(a.middayHiring,false);assert.equal(a.days,20);
 const p=selfConsistentProvenance([]);assert.equal(p.unchangedOriginalSources,390);assert.equal(Object.keys(p.sourceHashes).length,394);assert.deepEqual(p.scenario,DECLARED_SELF_CONSISTENT_PILOT);
});
test('New native strategy copy changes only initial hiring and explicit reporting, not original files',()=>{
 let actual=readFileSync(new URL('../tools/horde-defense-self-consistent-farm.mjs',import.meta.url),'utf8'),original=readFileSync(new URL('../tools/horde-defense-farm.mjs',import.meta.url),'utf8');
 actual=actual.replace("import {INITIAL_STAFFING_POLICY,initialStaffingPlan} from './horde-initial-staffing-policy.mjs';\n",'').replace('simulateHordeSelfConsistentFarm','simulateHordeDefenseFarm').replace('initialStaffingPolicy=INITIAL_STAFFING_POLICY,','').replace(" if(initialStaffingPolicy!==INITIAL_STAFFING_POLICY)throw Error('Unknown initial staffing policy');\n",'').replace('const driver=new HordeEntryDriver(nav);let initialHiringPlan=null;','const driver=new HordeEntryDriver(nav);').replaceAll("initialStaffingPolicy:INITIAL_STAFFING_POLICY,initialHiringPlan,",'');
 const start=actual.indexOf('if(s.day===1){\n   initialHiringPlan='),end=actual.indexOf('  Game.hire(s,command(\'hire\'),',start);assert.ok(start>=0&&end>start);actual=actual.slice(0,start)+'staff=Math.max(1,Math.min(desired,affordable));\r\n'+actual.slice(end);
 assert.equal(actual.replaceAll('\r\n','\n'),original.replaceAll('\r\n','\n'));
});
