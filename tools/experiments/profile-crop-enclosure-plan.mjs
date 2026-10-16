import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {execFileSync} from 'node:child_process';
import {simulateNativeCampaign} from '../native-campaign-runner.mjs';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';
import {createCropEnclosurePlanner} from '../../src/world/hierarchical-wasm/spatial-crop-enclosure-plan.js';

const out=process.argv[2];
if(!out)throw Error('Usage: node profile-crop-enclosure-plan.mjs <report.json>');
const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const wasmPath=process.env.WILD_ENGINE_SPATIAL_SERVICES_WASM??
  'src/world/hierarchical-wasm/spatial-savanna.wasm';
const wasmSha256=createHash('sha256').update(readFileSync(wasmPath)).digest('hex');
let latestState=null,latestNav=null,sample=null;
const started=performance.now();
const entryDriverFactory=nav=>({
  async advancePresentation(){if(nav.raidEntryFailure)throw Error('Native entry failed');},
  async waitForEntry(){if(nav.raidEntryFailure)throw Error('Native entry failed');},
  report(){return {mode:'profile-no-presentation'};},async dispose(){}
});
const inspect=()=>{
  const bridge=latestNav.intentTaskPlanner;
  const groupStart=performance.now();
  const groups=bridge.getUnprotectedCropGroups();
  const groupMs=performance.now()-groupStart;
  const group=groups.find(item=>item.protection==='unprotected');
  if(!group){sample={status:'no-unprotected-group',groupMs,groups:groups.length};return;}
  const planStart=performance.now();
  const plan=createCropEnclosurePlanner(latestState,latestNav,bridge)
    .planCropEnclosure(group.id);
  sample={status:plan.status,reason:plan.reason,groupId:group.id,
    groupCrops:group.cropIds.length,groups:groups.length,groupMs,
    planMs:performance.now()-planStart,proposedModules:plan.modules?.length??0,
    proposedCost:plan.cost??null,gaps:plan.gaps?.length??0};
};
const result=await simulateNativeCampaign({days:3,biome:'sabana',seed:712,
  culture:'mapungubwe',strategy:'good',nativeIntents:true,spatialAdvice:true,
  defensePolicy:'expanding',nativeEvidence:false,reloadRaids:false,
  openingFactory:createSpatialCampaignOpening,entryDriverFactory,
  onTick:(state,nav)=>{latestState=state;latestNav=nav;
    nav.serviceRaidConnectivityDemand?.();
    if(!sample&&state.day===3&&state.time>=240&&state.time<300&&!state.raid)
      inspect();}});
const report={source,wasmSha256,biome:'sabana',seed:712,day:3,
  campaignSeconds:(performance.now()-started)/1000,
  completedNights:result.completedNights,raidStatus:result.raidEvidence.status,
  livingCrops:result.state.plants.filter(plant=>plant.alive).length,
  sample};
writeFileSync(out,JSON.stringify(report,null,2)+'\n');
process.stdout.write(JSON.stringify(report)+'\n');
