import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {simulateNativeCampaign} from '../native-campaign-runner.mjs';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';
import {serialize} from '../../src/persistence/snapshots.js';

const nights=Number(process.argv[2]??1),biome=process.argv[3]??'sabana',
  strategy=process.argv[4]??'good',
  output=process.argv[5]??'docs/qa/hierarchical-navigation/spatial-virtual-campaign.json',
  seed=Number(process.argv[6]??712);
if(!Number.isSafeInteger(nights)||nights<1||nights>100)
  throw RangeError('Expected 1–100 campaign nights');
if(!Number.isSafeInteger(seed)||seed<0)throw RangeError('Expected a nonnegative integer seed');
const entryDriverFactory=nav=>({
  async advancePresentation(){
    if(nav.raidEntryFailure)throw Error('Native entry failed: '+JSON.stringify(nav.raidEntryFailure));
  },
  async waitForEntry(){
    if(nav.raidEntryFailure)throw Error('Native entry failed: '+JSON.stringify(nav.raidEntryFailure));
  },
  report(){return {mode:'same-session-native-entry-no-js-worker'};},
  async dispose(){}
});
const started=performance.now(),rows=[],recent=[],tickBands={};
const captureAt=Number(process.env.WG_SPATIAL_CAPTURE_AT),
  captureDay=Number(process.env.WG_SPATIAL_CAPTURE_DAY??13);
try{
  const result=await simulateNativeCampaign({days:nights,biome,seed,
    culture:'mapungubwe',strategy,nativeEvidence:false,
    openingFactory:createSpatialCampaignOpening,entryDriverFactory,
    reloadRaids:false,onDecision:decision=>{
      recent.push({day:decision.day,time:decision.time,reason:decision.reason,
        living:decision.living,pendingTasks:decision.pendingTasks});
      if(recent.length>32)recent.shift();
    },onTick:(state,nav,timing)=>{
      nav.serviceRaidConnectivityDemand?.();
      if(captureAt>0&&state.day===captureDay&&state.time>=captureAt){
        writeFileSync(output.replace(/\.json$/,'-capture-state.json'),serialize(state));
        throw Error('Intentional spatial profile capture');
      }
      const key=state.day;
      const band=tickBands[key]??={ticks:0,gameTickMs:0,decisionMs:0,
        maxTick:null,byClock:{}};
      const clock=Math.min(5,Math.floor(state.time/100));
      const bucket=band.byClock[clock]??={ticks:0,gameTickMs:0,decisionMs:0};
      band.ticks++;band.gameTickMs+=timing.gameTickMs;
      band.decisionMs+=timing.decisionMs;
      bucket.ticks++;bucket.gameTickMs+=timing.gameTickMs;
      bucket.decisionMs+=timing.decisionMs;
      if(!band.maxTick||timing.gameTickMs>band.maxTick.gameTickMs)
        band.maxTick={time:state.time,gameTickMs:timing.gameTickMs,
          decisionMs:timing.decisionMs,animals:state.raid?.animals?.length??0,
          workers:state.workers.filter(w=>w.status!=='home').length,
          living:state.plants.filter(p=>p.alive).length};
    },onDay:row=>{
      rows.push(row);
      console.log(JSON.stringify({day:row.day,wallSeconds:+((performance.now()-started)/1000).toFixed(2),
        money:row.money,living:row.living,result:row.result}));
    }});
  const report={status:'completed',scope:'Experimental virtual player on one C++ spatial world, no JavaScript raid-entry worker and no synthetic reload. Strategy is the existing campaign policy, not a calibrated balance acceptance.',
    nights,biome,strategy,seed,wallSeconds:(performance.now()-started)/1000,
    completedNights:result.completedNights,result:result.result,rows,
    entryTransport:result.entryTransport,plotSearch:result.plotSearch,
    tickBands,raidEvidence:result.raidEvidence};
  writeFileSync(output,JSON.stringify(report,null,2)+'\n');
}catch(error){
  const captured=error.message==='Intentional spatial profile capture';
  const report={status:captured?'captured':'error',nights,biome,strategy,seed,
    wallSeconds:(performance.now()-started)/1000,
    message:error.message,stack:error.stack,
    routeStart:error.start??null,routeEnd:error.end??null,
    missingChunks:error.missing??null,routeDetails:error.details??null,
    day:error.nativeCampaignPartial?.day,tickBands,
    time:error.nativeCampaignPartial?.time,rows,
    recent,receipts:error.nativeCampaignPartial?.receipts??null};
  writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  if(error.nativeCampaignPartial?.state)
    writeFileSync(output.replace(/\.json$/,'-state.json'),
      error.nativeCampaignPartial.state);
  console.error(JSON.stringify({status:report.status,message:report.message,
    day:report.day,time:report.time,wallSeconds:report.wallSeconds}));
  if(!captured)process.exitCode=1;
}
