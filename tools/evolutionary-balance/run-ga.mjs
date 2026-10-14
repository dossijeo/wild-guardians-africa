// Reproducible search over virtual-player decisions. Game/Wild Engine are unchanged.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {simulateNativeCampaign} from '../native-campaign-runner.mjs';
import {createSpatialCampaignOpening} from '../experiments/spatial-campaign-opening.mjs';
import {DEFAULT_GENES,validateGenes} from './policy-genes.mjs';
import {breed,genomeId,randomGenome,scoreCampaign,seededRandom} from './ga.mjs';

const DEFAULT_CONFIG={rngSeed:712,generations:2,population:4,days:7,
 train:[{biome:'sabana',seed:712},{biome:'gran-rio',seed:2026}],
 holdout:[{biome:'sabana',seed:123},{biome:'gran-canon',seed:2026}],
 baselines:['good','good-current-magic','expansive','bad','no-walls'],output:'docs/qa/evolutionary-balance/pilot'};
export function validateConfig(raw){
 const c={...DEFAULT_CONFIG,...raw};
 for(const key of ['rngSeed','generations','population','days'])if(!Number.isSafeInteger(c[key])||c[key]<1)throw Error(`Invalid ${key}`);
 if(c.days>100||c.population<2||c.population>100||c.generations>100)throw Error('Unsafe GA budget');
 for(const key of ['train','holdout']){
  if(!Array.isArray(c[key])||!c[key].length)throw Error(`Empty ${key} cohort`);
  for(const row of c[key])if(!row||typeof row.biome!=='string'||!Number.isSafeInteger(row.seed)||row.seed<0)throw Error(`Invalid ${key} scenario`);
 }
 const seen=new Set(c.train.map(x=>`${x.biome}:${x.seed}`));
 if(seen.size!==c.train.length||new Set(c.holdout.map(x=>`${x.biome}:${x.seed}`)).size!==c.holdout.length)
  throw Error('Duplicate cohort scenario');
 if(c.holdout.some(x=>seen.has(`${x.biome}:${x.seed}`)))throw Error('Train/holdout overlap');
 if(c.requireBiomeHoldout&&c.holdout.some(x=>c.train.some(y=>x.biome===y.biome)))
  throw Error('Holdout biome overlaps training');
 if(c.initialPopulation!==undefined){
  if(!Array.isArray(c.initialPopulation)||!c.initialPopulation.length||c.initialPopulation.length>c.population)
   throw Error('Invalid initial population');
  c.initialPopulation=c.initialPopulation.map(validateGenes);
  if(new Set(c.initialPopulation.map(genomeId)).size!==c.initialPopulation.length)
   throw Error('Duplicate initial genomes');
 }
 return c;
}
export async function evaluateOne({biome,seed},days,strategy,genes,onDay,detailedEvidence=false,onTickObserver){
 const entryDriverFactory=nav=>({
  async advancePresentation(){if(nav.raidEntryFailure)throw Error('Native raid entry failed');},
  async waitForEntry(){if(nav.raidEntryFailure)throw Error('Native raid entry failed');},
  report(){return {mode:'same-session-native-entry'};},async dispose(){}
 });
 try{
  const currentMagicRules=strategy.endsWith('-current-magic');
  const effectiveStrategy=currentMagicRules?strategy.slice(0,-'-current-magic'.length):strategy;
  const r=await simulateNativeCampaign({days,biome,seed,culture:'mapungubwe',strategy:effectiveStrategy,
   evolutionaryGenes:genes,currentMagicRules,nativeEvidence:false,reloadRaids:false,
   openingFactory:createSpatialCampaignOpening,entryDriverFactory,
   onDay,
   onTick:(state,nav,timing)=>{nav.serviceRaidConnectivityDemand?.();onTickObserver?.(state,nav,timing);}});
  return {status:'completed',biome,seed,days,strategy,genes:genes??null,
   completedNights:r.completedNights,result:r.result,rows:r.daily.map(row=>({
    day:row.day,money:row.money,living:row.living,planted:row.planted,
    delivered:row.delivered,destroyed:row.destroyed,staff:row.staff,magic:row.magic,
    income:row.finance.income,seeds:row.finance.seeds,wages:row.finance.wages,
    walls:row.finance.walls,repairs:row.finance.repairs,
    reconciled:row.finance.reconciliationDifference===0,wallTime:row.wallTime})),
   policy:r.policy,plotSearch:r.plotSearch,
   defense:{paidCost:r.defense?.paidCost??0,paidPieces:r.defense?.paidPieces??0},
   ...(detailedEvidence?{raidEvidence:r.raidEvidence,defenseEvidence:r.defense}:{}),
   raid:r.raidEvidence.raids.map(x=>({day:x.day,animals:Object.values(x.species).reduce((n,s)=>n+s.generated,0),
    attraction:x.pressureFacts?.observedValue??null,pressure:x.pressureFacts?.pressure??null,
    livingAtSpawn:x.exposedLivingAtSpawn??null,cropsDestroyed:x.cropsDestroyed,
    potentialAgriculturalHp:x.potentialAgriculturalHp,effectiveAgriculturalHp:x.effectiveAgriculturalHp,
    wallHits:x.wallHits,wallHpLost:x.wallHpLost,structuresRuined:x.structuresRuined?.length??0,
    shieldContacts:x.shieldContacts,routeUnavailableAttempts:x.routeUnavailableAttempts,
    targetUnavailableAttempts:x.targetUnavailableAttempts}))};
 }catch(error){return {status:'error',biome,seed,days,strategy,genes:genes??null,
  name:error.name,message:error.message,stack:error.stack??null,
  navigation:error.name==='SpatialChunkUnavailable'?{
   start:error.start,end:error.end,missing:error.missing,details:error.details}:null,
  day:error.nativeCampaignPartial?.day??null,
  partialState:error.nativeCampaignPartial?.state??null,
  partialReceipts:error.nativeCampaignPartial?.receipts??null};}
}
export async function runSearch(config){
 const c=validateConfig(config),out=resolve(c.output),random=seededRandom(c.rngSeed);
 mkdirSync(out,{recursive:true});
 const sourceHash=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const moduleHashes={};
 for(const path of ['tools/native-campaign-runner.mjs','tools/native-expanding-defense-policy.mjs',
  'tools/evolutionary-balance/run-ga.mjs','tools/evolutionary-balance/ga.mjs',
  'tools/evolutionary-balance/policy-genes.mjs'])
  moduleHashes[path]=createHash('sha256').update(readFileSync(path)).digest('hex');
 const worktreeDiffHash=createHash('sha256').update(execFileSync('git',['diff','--binary'])).digest('hex');
 const implementationId=createHash('sha256').update(JSON.stringify({sourceHash,moduleHashes,worktreeDiffHash})).digest('hex').slice(0,12);
 const runId=createHash('sha256').update(JSON.stringify({implementationId,config:c})).digest('hex').slice(0,12);
 const stamp={sourceHash,moduleHashes,worktreeDiffHash,implementationId,runId,config:c,
  gameBalance:'unchanged',runKind:'native-Wild-Engine-campaign'};
 writeFileSync(join(out,`config-${runId}.json`),JSON.stringify(stamp,null,2)+'\n');
 const cache=new Map();
 async function one(scenario,strategy,genes){
  const id=genes?genomeId(genes):strategy,key=`${implementationId}-${id}-${scenario.biome}-${scenario.seed}-${c.days}`;
  if(cache.has(key))return cache.get(key);
  const path=join(out,`${key}.json`);
  const report=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):await evaluateOne(scenario,c.days,strategy,genes);
  if(!existsSync(path))writeFileSync(path,JSON.stringify(report,null,2)+'\n');
  if(report.status==='error')throw Error(`Technical campaign error in ${path}: ${report.message}`);
  cache.set(key,report);return report;
 }
 let population=c.initialPopulation??[validateGenes(DEFAULT_GENES)];
 while(population.length<c.population)population.push(randomGenome(random));
 const generations=[];
 for(let generation=0;generation<c.generations;generation++){
  const ranked=[];
  for(const genes of population){
   const reports=[];
   for(const scenario of c.train)reports.push(await one(scenario,'evolved',genes));
   const scores=reports.map(r=>scoreCampaign(r,c.days));
   ranked.push({id:genomeId(genes),genes,score:Math.min(...scores.map(x=>x.score)),meanScore:scores.reduce((n,x)=>n+x.score,0)/scores.length,
    cases:reports.map((r,i)=>({biome:r.biome,seed:r.seed,...scores[i]}))});
  }
  ranked.sort((a,b)=>b.score-a.score||b.meanScore-a.meanScore||a.id.localeCompare(b.id));
  generations.push({generation,ranked});
  writeFileSync(join(out,`search-${runId}.json`),JSON.stringify({stamp,generations},null,2)+'\n');
  const elite=ranked.slice(0,Math.max(2,Math.ceil(c.population/2)));
  population=[elite[0].genes];
  const nextIds=new Set(population.map(genomeId));
  let attempts=0;
  while(population.length<c.population){
   const a=elite[Math.floor(random()*elite.length)].genes,b=elite[Math.floor(random()*elite.length)].genes;
   const child=attempts++<c.population*20?breed(a,b,random):randomGenome(random);
   const id=genomeId(child);
   if(nextIds.has(id)){
    if(attempts>c.population*200)throw Error('Could not form a distinct next generation');
    continue;
   }
   population.push(child);nextIds.add(id);
  }
 }
 const pilotLeader=generations.flatMap(x=>x.ranked).sort((a,b)=>b.score-a.score||b.meanScore-a.meanScore)[0];
 const finalists=[{strategy:'evolved',genes:pilotLeader.genes},...c.baselines.map(strategy=>({strategy,genes:null}))];
 const holdout=[];
 for(const finalist of finalists)for(const scenario of c.holdout){
  const report=await one(scenario,finalist.strategy,finalist.genes);
  holdout.push({strategy:finalist.strategy,id:finalist.genes?genomeId(finalist.genes):finalist.strategy,
   biome:scenario.biome,seed:scenario.seed,...scoreCampaign(report,c.days)});
 }
 const result={stamp,pilotLeader,holdout,
  limits:'Short-horizon pilot ranking only; cash, production and defenses can trade off. No 100-night victory, competitive strategy or balance approval.'};
 writeFileSync(join(out,`result-${runId}.json`),JSON.stringify(result,null,2)+'\n');
 return result;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const config=process.argv[2]?JSON.parse(readFileSync(resolve(process.argv[2]),'utf8')):{};
 runSearch(config).then(r=>console.log(JSON.stringify({pilotLeader:r.pilotLeader,holdout:r.holdout})),e=>{console.error(e);process.exitCode=1;});
}
