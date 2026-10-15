// Opt-in profiler for legacy and native spatial-advice campaign arms. Both
// execute the ordinary game commands; source and candidate binary hashes are
// recorded so a changed spatial policy is not mistaken for a pure speedup.
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {simulateNativeCampaign} from '../native-campaign-runner.mjs';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';

const days=Number(process.argv[2]??14);
const output=process.argv[3]??'.cache/spatial-player-decisions-baseline.json';
const engine=process.argv[4]??'legacy';
const preparedQuotes=process.argv[5]!=='recompute';
const spatialAdvice=process.argv[6]==='advice';
const seed=Number(process.argv[7]??712);
if(!Number.isSafeInteger(days)||days<1||days>100)throw Error('Invalid days');
if(!Number.isSafeInteger(seed)||seed<1)throw Error('Invalid seed');
if(!['legacy','wild-engine'].includes(engine))throw Error('Unknown campaign engine');
const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const files=['tools/native-campaign-runner.mjs','tools/native-campaign-plots.mjs',
 'tools/native-expanding-defense-policy.mjs','src/simulation/game.js',
 'src/world/hierarchical-wasm/spatial-intent-bridge.js'];
const sourceFiles=Object.fromEntries(files.map(file=>[file,
 createHash('sha256').update(readFileSync(file)).digest('hex')]));
if(engine==='wild-engine'){
 const binary=process.env.WILD_ENGINE_SPATIAL_SERVICES_WASM??
  'src/world/hierarchical-wasm/spatial-savanna.wasm';
 sourceFiles[binary]=createHash('sha256').update(readFileSync(binary)).digest('hex');
}
const daily=[];
try{
 const native=engine==='wild-engine'?{
   openingFactory:createSpatialCampaignOpening,reloadRaids:false,
   entryDriverFactory:nav=>({
     async advancePresentation(){if(nav.raidEntryFailure)throw Error(JSON.stringify(nav.raidEntryFailure));},
     async waitForEntry(){if(nav.raidEntryFailure)throw Error(JSON.stringify(nav.raidEntryFailure));},
     report(){return {mode:'same-session-native-entry'};},async dispose(){}
   }),onTick:(_state,nav)=>nav.serviceRaidConnectivityDemand?.()
  }:{};
 const result=await simulateNativeCampaign({days,seed,biome:'sabana',
  culture:'mapungubwe',strategy:'good',decisionProfile:true,nativeEvidence:false,
  preparedWallQuotes:preparedQuotes,spatialAdvice,...native,
  onDay:row=>{
   const {entries,...finance}=row.finance;
   const item={day:row.day,living:row.living,planted:row.planted,
    delivered:row.delivered,destroyed:row.destroyed,staff:row.staff,
    money:row.money,finance,wallTime:row.wallTime,phases:row.decisionPhases};
   daily.push(item);console.log(JSON.stringify(item));
  }});
 const report={source,sourceFiles,engine,preparedQuotes,spatialAdvice,
  spatialSite:result.spatialSite,spatialAdviceInitMs:result.spatialAdviceInitMs,
  spatialSync:result.spatialSync,daysRequested:days,completedNights:result.completedNights,
  result:result.result,biome:result.biome,seed:result.seed,strategy:result.strategy,
  policy:result.policy,defense:{paidCost:result.defense?.paidCost,
   paidPieces:result.defense?.paidPieces,repairRequests:result.defense?.repairRequests},
  daily};
 mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2));
}catch(error){
 mkdirSync(dirname(output),{recursive:true});
 writeFileSync(output,JSON.stringify({source,sourceFiles,engine,preparedQuotes,spatialAdvice,seed,daysRequested:days,daily,
  error:error.message,partialDay:error.nativeCampaignPartial?.day},null,2));
 throw error;
}
