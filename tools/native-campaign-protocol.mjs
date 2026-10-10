// Preselected comparison, not an adaptive search for winning seeds.
export const NATIVE_CAMPAIGN_SEEDS=Object.freeze([712,123,2026]);
export const NATIVE_CAMPAIGN_STRATEGIES=Object.freeze({
 expansive:Object.freeze({defend:true,repair:true,foundVillages:true,middayHiring:true}),
 good:Object.freeze({defend:true,repair:true,foundVillages:false,middayHiring:true}),
 bad:Object.freeze({defend:true,repair:false,foundVillages:false,middayHiring:false}),
 'no-walls':Object.freeze({defend:false,repair:false,foundVillages:false,middayHiring:true}),
});
export const NATIVE_CAMPAIGN_PROTOCOL=Object.freeze({id:'native-constant-economy-v1',seeds:NATIVE_CAMPAIGN_SEEDS,strategies:Object.keys(NATIVE_CAMPAIGN_STRATEGIES),daySeconds:300,combatNights:100,postgamePeaceNights:80,minDailyCropPurchases:60,strictMaximumIdleFraction:.25,profile:'olderFemale',plantsPerWorker:6,plotSpacing:1.5,plantDecisionSeconds:1,seedPricing:'constant production prices',income:'native CrateDelivered only',damage:'native contacts/occlusion only; no assumed exposure'});
export function nativeCampaignStrategy(name){const strategy=NATIVE_CAMPAIGN_STRATEGIES[name];if(!strategy)throw Error('Unknown preselected strategy');return strategy;}
// Forecast is a budget rule, never a claim of worker physical throughput.
export function affordableOpening({cash,living,wage=30,seedCost=5,plantsPerWorker=6,repairReserve=0}){
 for(const n of [cash,living,wage,seedCost,plantsPerWorker,repairReserve])if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid opening integer');
 if(!wage||!seedCost||!plantsPerWorker)throw Error('Invalid zero budget unit');
 const affordable=Math.floor(cash/wage);
 for(let staff=1;staff<=affordable;staff++){
  const seedBudget=cash-2*staff*wage-repairReserve,extra=Math.max(0,Math.floor(seedBudget/seedCost));
  if(seedBudget>=seedCost&&living+extra<=staff*plantsPerWorker)return {staff,wages:staff*wage,reserve:staff*wage+repairReserve,forecastAdditional:extra,mode:'forecast'};
 }
 // Empty-field recovery may plant one seed before paying the one-day wage.
 const staff=affordable?Math.min(Math.max(1,Math.ceil(living/plantsPerWorker)),affordable):0;
 return {staff,wages:staff*wage,reserve:staff*wage+repairReserve,forecastAdditional:0,mode:'minimum affordable fallback'};
}
