// Affordable aggregate accounting model; no native game simulation.
import {nightlyExpectation} from './project-campaign-accounting.mjs';
export function countWithCarry(expected,carry,available){
 if(!Number.isFinite(expected)||expected<0||!Number.isFinite(carry)||carry<0||carry>=1||!Number.isSafeInteger(available)||available<0)throw Error('Invalid aggregate count');
 const total=expected+carry,count=Math.min(available,Math.floor(total));
 return {count,carry:available>count?(total-count)%1:0};
}
export function projectAffordable(B,calibration,{arm='responsible',cropExposure=.1,days=100,referenceMixBase=216.375,pressurePrices=null}={}){
 const rows=[],wall=B.walls.find(w=>w.id==='zarzas');
 const firstCrop=B.crops.find(c=>c.id==='mijo');
 let cash=1500-800,plants=1,meanBase=firstCrop.base_harvest_value,meanPayout=firstCrop.base_harvest_value,peak=1,halfSpan=0,walls=0;
 let meanPressure=pressurePrices?.mijo??meanBase;
 let harvestCarry=0,deathCarry=0;
 const mixSeed=B.crops.reduce((n,c)=>n+c.plant_cost,0)/8,mixBase=B.crops.reduce((n,c)=>n+c.base_harvest_value,0)/8;
 for(let day=1;day<=days;day++){
  const before=cash;
  if(cash<30){rows.push({day,arm,status:'sin dinero para un trabajador; no prueba de derrota nativa',cash,plants,walls,animals:null,force:null});break;}
  const desiredStaff=day===1?7:Math.max(1,Math.ceil(plants/6));
  const staff=Math.min(desiredStaff,Math.floor(cash/30)),wages=staff*30;
  const mixed=day>=10&&cash>1000,seed=mixed?mixSeed:firstCrop.plant_cost,base=mixed?mixBase:firstCrop.base_harvest_value;
  const q=mixed?calibration.late.harvestFraction:calibration.early.harvestFraction;
  const capacity=staff*(mixed?calibration.late.deliveriesPerWorker:calibration.early.deliveriesPerWorker);
  let chosen=null;
  // Close each daily ledger and preserve next-day wages; no negative credit.
  for(let planted=day===1?116:280;planted>=0;planted--){
   const stock=plants+planted,newMean=stock?(plants*meanBase+planted*base)/stock:base;
   const plantedPressure=pressurePrices?(mixed?B.crops.reduce((n,c)=>n+pressurePrices[c.id],0)/8:pressurePrices.mijo):base;
   const newPressure=stock?(plants*meanPressure+planted*plantedPressure)/stock:plantedPressure;
   const expectedNewPayout=mixed?calibration.late.realizedPayout*mixBase/referenceMixBase:firstCrop.base_harvest_value;
   const payout=stock?(plants*meanPayout+planted*expectedNewPayout)/stock:expectedNewPayout;
   const expectedHarvest=day===1?25*stock/117:Math.min(capacity,q*(plants+.5*planted));
   const counted=countWithCarry(expectedHarvest,harvestCarry,stock),harvested=counted.count;
   const preRaid=stock-harvested,desiredSpan=Math.ceil((Math.sqrt(Math.max(peak,preRaid)*2.25)/2+3)/6)*6;
   const newWalls=arm==='responsible'&&day>=2&&desiredSpan>halfSpan?Math.ceil(8*desiredSpan/2.18):0;
   const income=Math.floor(harvested*payout),seedCost=Math.ceil(planted*seed)+(day===1?firstCrop.plant_cost:0),wallCost=newWalls*wall.cost;
   const after=cash-wages+income-seedCost-wallCost,reserve=Math.ceil(preRaid/6)*30+100;
   if(after>=reserve){chosen={planted,harvested,expectedHarvest,remainingHarvestCarry:counted.carry,preRaid,newMean,newPressure,payout,desiredSpan,newWalls,income,seedCost,wallCost,after};break;}
  }
  if(!chosen){const expectedHarvest=Math.min(capacity,q*plants),counted=countWithCarry(expectedHarvest,harvestCarry,plants);chosen={planted:0,harvested:counted.count,expectedHarvest,remainingHarvestCarry:counted.carry,preRaid:plants,newMean:meanBase,newPressure:meanPressure,payout:meanPayout,desiredSpan:halfSpan,newWalls:0,income:0,seedCost:0,wallCost:0,after:cash-wages};}
  // A zero-investment fallback still delivers its calculated mature fraction.
  if(chosen.harvested&&chosen.income===0){chosen.preRaid-=chosen.harvested;chosen.income=Math.floor(chosen.harvested*meanPayout);chosen.after+=chosen.income;}
  harvestCarry=chosen.remainingHarvestCarry;
  peak=Math.max(peak,chosen.preRaid);walls+=chosen.newWalls;if(chosen.newWalls)halfSpan=chosen.desiredSpan;
  const value=chosen.preRaid*chosen.newPressure,raid=nightlyExpectation(B,day,value);
  const targets=day<=5?1:Math.floor(1+7*value/(value+10000)),force=day<=5||value<60000?1:2;
  const enclosed=arm==='responsible'&&halfSpan>=chosen.desiredSpan&&walls>0;
  const exposure=enclosed?cropExposure:.9;
  const expectedKilled=raid.hits*.9*exposure*.85*targets*force/2;
  const killed=Math.min(chosen.preRaid,Math.floor(expectedKilled+deathCarry),day<=5?Math.max(0,Math.min(chosen.preRaid-1,Math.ceil(chosen.preRaid*.2))):Infinity);
  deathCarry=chosen.preRaid>killed?Math.max(0,expectedKilled+deathCarry-killed)%1:0;
  // Amortized repair estimate, not per-worker native receipt timing.
  const repairWanted=enclosed?Math.ceil(raid.damage*.9*(1-exposure)*.85/wall.hp*wall.cost):0;
  const repair=Math.min(Math.max(0,chosen.after-30),repairWanted);
  cash=chosen.after-repair;plants=chosen.preRaid-killed;meanBase=chosen.newMean;meanPressure=chosen.newPressure;meanPayout=chosen.payout;
  rows.push({day,arm,status:'proyección',cash,plants,walls,newWalls:chosen.newWalls,animals:raid.animals,animalMin:raid.min,animalMax:raid.max,force,targets,value,planted:chosen.planted,harvested:chosen.harvested,killed,staff,wages,income:chosen.income,seeds:chosen.seedCost,wallCost:chosen.wallCost,repairs:repair,unfundedRepair:repairWanted-repair,cropExposure:exposure,ledgerDelta:cash-before});
 }
 return rows;
}
