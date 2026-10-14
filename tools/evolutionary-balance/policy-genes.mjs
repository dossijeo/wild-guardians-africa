// Experimental virtual-player decisions only. These values never change Game rules.
export const GENE_SCHEMA=Object.freeze({
 plantsPerWorker:[4,16,1],wageReserveDays:[1,4,1],seedReserve:[0,250,5],
 defenseCashFraction:[0,0.7,0.05],defenseStartDay:[1,15,1],
 repairHealthFraction:[0.45,0.95,0.05],magicIntervalSeconds:[1,30,1],
 growthShare:[0,1,0.25],
 plantingIntervalSeconds:[1,15,1],
});
export const MATERIALS=Object.freeze(['zarzas','empalizada','adobe','reforzado','piedra']);
export const DEFAULT_GENES=Object.freeze({plantsPerWorker:6,wageReserveDays:1,seedReserve:0,
 defenseCashFraction:0.2,defenseStartDay:2,repairHealthFraction:0.8,
 magicIntervalSeconds:5,growthShare:0,plantingIntervalSeconds:1,wallMaterial:'zarzas',
 magicPriority:'multiply'});
export function validateGenes(input){
 const genes={...DEFAULT_GENES,...input};
 for(const [key,[min,max,step]] of Object.entries(GENE_SCHEMA)){
  const value=genes[key];
  if(!Number.isFinite(value)||value<min||value>max||Math.abs(Math.round((value-min)/step)*step+min-value)>1e-8)
   throw Error(`Invalid player gene ${key}`);
 }
 if(!MATERIALS.includes(genes.wallMaterial))throw Error('Invalid wall material gene');
 if(!['growth','multiply'].includes(genes.magicPriority))throw Error('Invalid magic priority gene');
 return Object.freeze(genes);
}
export function playerReserve(genes,{dailyWages,pendingRepairs,seedCost,balance}){
 const fixed=Math.ceil(dailyWages*genes.wageReserveDays)+pendingRepairs+genes.seedReserve+seedCost;
 return Math.min(balance,Math.max(0,fixed));
}
// A four-use schedule is a policy choice, not a power budget or an action cap.
// If the preferred spell has no legal target, the virtual player tries the other.
export function preferredAgriculturalPower(genes,successfulUsesToday){
 const slots=Math.round(validateGenes(genes).growthShare*4),phase=successfulUsesToday%4;
 const growth=genes.magicPriority==='growth'?phase<slots:phase>=4-slots;
 return growth?'growth':'multiply';
}
