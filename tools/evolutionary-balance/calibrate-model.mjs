// Lightweight accounting screen, calibrated from one homogeneous native run.
// It deliberately does not claim that a perimeter's paid cost proves protection.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {raidPressureCandidateForVersion,updateRaidPressureMemory,raidPressureSummary} from '../../src/simulation/raid-pressure-budget.js';

const div=(a,b)=>b>0?a/b:0;
const mean=a=>div(a.reduce((n,x)=>n+x,0),a.length);
const sum=(rows,key)=>rows.reduce((n,r)=>n+(r[key]??0),0);
function facts(report){
 const raid=new Map((report.raidEvidence?.raids??[]).filter(x=>!x.daytime).map(x=>[x.day,x]));
 return (report.rows??[]).map((r,i)=>{
  const q=raid.get(r.day),prior=report.rows[i-1]?.living??r.living;
  const finance=r.finance??r;
  return {day:r.day,priorLiving:prior,living:r.living,planted:r.planted,destroyed:r.destroyed,
   nonRaidPlantExit:Math.max(0,prior+r.planted-r.destroyed-r.living),
   income:finance.income,wages:finance.wages,seeds:finance.seeds,
   walls:finance.walls,repairs:finance.repairs,money:r.money,
   attraction:q?.pressureFacts?.observedValue??null,animals:q?Object.values(q.species).reduce((n,s)=>n+s.generated,0):0,
   raidPressureVersion:q?.pressureFacts?.candidateVersion??1,
   potential:q?.potentialAgriculturalHp??0,wallHpLost:q?.wallHpLost??0,
   livingAtSpawn:q?.exposedLivingAtSpawn??null,perimeterStatus:q?.wallHits>0?'wall-contact-observed':'not-certified'};
 });
}
export function calibrate(report){
 // A terminal row may contain only part of a normal working day.
 const rows=facts(report).filter(r=>!(report.result==='defeat'&&r.day>(report.completedNights??Infinity)));
 const split=Math.min(rows.length-2,Math.max(7,Math.floor(rows.length*0.6)));
 if(split<2)throw Error('Not enough completed days to calibrate and validate');
 const train=rows.slice(0,split),holdout=rows.slice(split);
 const raidTrain=train.filter(r=>r.attraction!==null&&r.day>5);
 const pressureVersions=[...new Set(rows.filter(r=>r.attraction!==null&&r.day>5).map(r=>r.raidPressureVersion))];
 if(pressureVersions.length>1)throw Error('Mixed raid pressure versions cannot share one projection');
 const raidPressureVersion=pressureVersions[0]??1;
 raidPressureCandidateForVersion(raidPressureVersion);
 const c={incomePerPriorPlant:div(sum(train,'income'),sum(train,'priorLiving')),
  wagesPerPriorPlant:div(sum(train,'wages'),sum(train,'priorLiving')),
  wagesToRaidAttraction:div(sum(raidTrain,'wages'),sum(raidTrain,'attraction')),
  seedCostPerPlant:div(sum(train,'seeds'),sum(train,'planted')),
  nonRaidPlantExitPerPriorPlant:div(sum(train,'nonRaidPlantExit'),sum(train,'priorLiving')),
  attractionPerLivingPlantAtSpawn:div(sum(raidTrain,'attraction'),sum(raidTrain,'livingAtSpawn')),
  agriculturalDamageEfficiency:div(sum(raidTrain,'destroyed'),sum(raidTrain,'potential')),
  potentialPerAnimal:div(sum(raidTrain,'potential'),sum(raidTrain,'animals')),
  wallHpLostPerAnimal:div(sum(raidTrain,'wallHpLost'),sum(raidTrain,'animals')),
  wallRepairCoinsPerHp:div(sum(train,'repairs'),sum(train,'wallHpLost')),
  meanPlantedPerDay:mean(train.map(r=>r.planted)),
  meanWallSpend:mean(train.map(r=>r.walls))};
 const predictions=holdout.map(r=>({day:r.day,actual:{income:r.income,wages:r.wages,seeds:r.seeds,destroyed:r.destroyed,repairs:r.repairs},
  predicted:{income:r.priorLiving*c.incomePerPriorPlant,wages:r.priorLiving*c.wagesPerPriorPlant,
   seeds:r.planted*c.seedCostPerPlant,destroyed:r.potential*c.agriculturalDamageEfficiency,
   repairs:r.wallHpLost*c.wallRepairCoinsPerHp}}));
 const error={};
 for(const key of ['income','wages','seeds','destroyed','repairs']){
  const den=predictions.reduce((n,p)=>n+p.actual[key],0),abs=predictions.reduce((n,p)=>n+Math.abs(p.actual[key]-p.predicted[key]),0);
  error[key]={absolute:abs,weightedAbsoluteFraction:den?abs/den:null};
 }
 return {source:{biome:report.biome,seed:report.seed,strategy:report.strategy,status:report.status,
  result:report.result,completedNights:report.completedNights,rows:rows.length,raidPressureVersion},
  trainingDays:train.map(r=>r.day),validationDays:holdout.map(r=>r.day),coefficients:c,
  observability:{raidNightsInTraining:raidTrain.length,
   enclosureCoverageMeasured:false,breachTimingMeasured:false,
   defenseEffectIdentifiable:false,reason:'Native report has wall contact/HP, but no certified crop membership or breach timing.'},
  holdoutError:error,holdoutPredictions:predictions,
  limitations:['Single-run conditional ratios; no causal identification of policy or defense efficacy.',
   'One-step prediction uses actual prior plants, purchases, raid potential and wall HP damage; it is not a stand-alone forecast.',
   'Crop destruction is not inferred from structural HP; separate physical outcomes are fitted.',
   'Wall-contact evidence is not proof of a closed enclosure; catastrophic breaches require spatial Wild Engine evaluation.',
   'Income timing, crop mix and magic effects are pooled, so extrapolation to another policy or 100 nights is unsafe.']};
}
export function screenProjection(model,{days=100,damageMultiplier=1,plantingMultiplier=1}={}){
 const c=model.coefficients,rows=[],pressureConfig=raidPressureCandidateForVersion(model.source?.raidPressureVersion??1);
 let cash=700,living=68,pressureMemory=null;
 for(let day=1;day<=days;day++){
  const income=living*c.incomePerPriorPlant,wages=living*c.wagesPerPriorPlant;
  const planted=Math.max(0,Math.min(c.meanPlantedPerDay*plantingMultiplier,
   Math.floor(Math.max(0,cash+income-wages)/(c.seedCostPerPlant||Infinity))));
  const seeds=planted*c.seedCostPerPlant;
  const attraction=living*c.attractionPerLivingPlantAtSpawn;
  pressureMemory=updateRaidPressureMemory(pressureMemory,day,attraction,pressureConfig);
  const {pressure,targetAnimals:animals,effectiveValue:effectiveAttraction}=
   raidPressureSummary(day,attraction,pressureMemory,pressureConfig);
  const potential=animals*c.potentialPerAnimal;
  const destroyed=Math.min(living+planted,potential*c.agriculturalDamageEfficiency*damageMultiplier);
  const walls=c.meanWallSpend,repairs=animals*c.wallHpLostPerAnimal*c.wallRepairCoinsPerHp;
  cash+=income-wages-seeds-walls-repairs;
  const nonRaidPlantExit=Math.min(living+planted-destroyed,living*c.nonRaidPlantExitPerPriorPlant);
  living=Math.max(0,living+planted-destroyed-nonRaidPlantExit);
  rows.push({day,cash,living,attraction,effectiveAttraction,pressure,animals,potential,planted,destroyed,nonRaidPlantExit,
   income,wages,seeds,walls,repairs,perimeter:'unresolved-assumption',
   status:cash<0?'accounting-infeasible':'screen-only'});
  if(cash<0)break;
 }
 return {kind:'hypothetical-screen-not-native-campaign',requestedDays:days,
  projectedDays:rows.length,accountingInfeasible:rows.at(-1)?.cash<0,rows};
}
export function exploratorySensitivity(model){
 const cases=[];
 for(const factor of [0.75,1,1.25])for(const dimension of ['damageMultiplier','plantingMultiplier']){
  const run=screenProjection(model,{[dimension]:factor});
  cases.push({dimension,factor,projectedDays:run.projectedDays,
   accountingInfeasible:run.accountingInfeasible,
   lastCash:run.rows.at(-1)?.cash??null,lastLiving:run.rows.at(-1)?.living??null});
 }
 return {kind:'exploratory-surrogate-sensitivity-not-a-game-balance-recommendation',cases};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const source=resolve(process.argv[2]??'docs/qa/hierarchical-navigation/spatial-sabana-seed712-enclosure-final-30nights.json.gz');
 const out=resolve(process.argv[3]??'docs/qa/evolutionary-balance/model-sabana-712');
 const raw=readFileSync(source),report=JSON.parse(source.endsWith('.gz')?gunzipSync(raw):raw);
 const model=calibrate(report);model.source.path=relative(process.cwd(),source);model.source.sha256=createHash('sha256').update(raw).digest('hex');
 mkdirSync(out,{recursive:true});
 writeFileSync(join(out,'model.json'),JSON.stringify(model,null,2)+'\n');
 writeFileSync(join(out,'screen-100.json'),JSON.stringify(screenProjection(model),null,2)+'\n');
 writeFileSync(join(out,'sensitivity.json'),JSON.stringify(exploratorySensitivity(model),null,2)+'\n');
 console.log(JSON.stringify({source:model.source,coefficients:model.coefficients,error:model.holdoutError}));
}
