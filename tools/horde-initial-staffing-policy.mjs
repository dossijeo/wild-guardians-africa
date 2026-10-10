import assert from 'node:assert/strict';
export const INITIAL_STAFFING_POLICY='minimum-self-consistent-opening-v1';
// Pure forecast. Capacity is a strategy proxy, not measured physical throughput.
export function initialStaffingPlan({money,living,wage,seedCost,maintenanceReserve,defenseReserve=0,plantsPerWorker=6}){
 for(const [key,value]of Object.entries({money,living,wage,seedCost,maintenanceReserve,defenseReserve,plantsPerWorker}))assert.ok(Number.isSafeInteger(value)&&value>=0,`Invalid integer ${key}`);
 assert.ok(wage>0&&seedCost>0&&plantsPerWorker>0);
 const affordable=Math.floor(money/wage),minimumLivingCrew=Math.max(1,Math.ceil(living/plantsPerWorker));
 const forecast=count=>{const paidToday=count*wage,nextDayWages=paidToday,balanceAfterHire=money-paidToday,seedBudget=balanceAfterHire-nextDayWages-maintenanceReserve-defenseReserve,newSeeds=Math.max(0,Math.floor(seedBudget/seedCost));return {count,paidToday,nextDayWages,balanceAfterHire,seedBudget,newSeeds,forecastLiving:living+newSeeds,capacityProxy:count*plantsPerWorker};};
 // The seed requirement bounds enumeration before money becomes negative.
 const maxInvestmentCrew=Math.min(affordable,Math.floor((money-maintenanceReserve-defenseReserve-seedCost)/(2*wage)));
 for(let count=1;count<=maxInvestmentCrew;count++){
  const row=forecast(count);if(row.forecastLiving<=row.capacityProxy)return {policy:INITIAL_STAFFING_POLICY,status:'self-consistent',cause:null,...row,inputs:{money,living,wage,seedCost,maintenanceReserve,defenseReserve,plantsPerWorker},minimumLivingCrew,affordable};
 }
 const count=Math.min(minimumLivingCrew,affordable),row=forecast(count);
 return {policy:INITIAL_STAFFING_POLICY,status:count?'fallback-no-investment':'infeasible-no-affordable-worker',cause:count?'No affordable crew funds one seed and covers forecast plants after full reserves':'No affordable mandatory worker',...row,inputs:{money,living,wage,seedCost,maintenanceReserve,defenseReserve,plantsPerWorker},minimumLivingCrew,affordable,capacityShortfall:Math.max(0,living-row.capacityProxy),reserveShortfall:Math.max(0,-row.seedBudget),scope:'Fallback pays only minimum affordable living-crop cohort; no assertion that reinvestment or full reserves are funded'};
}
