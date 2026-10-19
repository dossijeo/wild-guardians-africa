import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {serialize} from '../../src/persistence/snapshots.js';
import {simulateNativeCampaign} from '../native-campaign-runner.mjs';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';

const [biome='desierto',daysText='40',seedText='123',output]=process.argv.slice(2);
const days=Number(daysText),seed=Number(seedText);
if(!output||!Number.isInteger(days)||days<1||days>100||!Number.isInteger(seed))
  throw Error('Usage: audit-defended-raid-pressure.mjs BIOME DAYS SEED OUTPUT.json.gz');
const sha256=value=>createHash('sha256').update(value).digest('hex');
const wasm=process.env.WILD_ENGINE_SPATIAL_SERVICES_WASM??
  'src/world/wild-engine/spatial-savanna.wasm';
const daily=[],report={biome,days,seed,
  runnerSha256:sha256(readFileSync(new URL('../native-campaign-runner.mjs',import.meta.url))),
  wasmSha256:sha256(readFileSync(wasm))};
const began=performance.now();
let navigation;
let captured=false;
const captureDay=Number(process.env.WILD_ENGINE_CAPTURE_RAID_DAY??0);
const openingFactory=async options=>{
  const opening=await createSpatialCampaignOpening(options);
  opening.nav.raidSelectionStats={};
  navigation=opening.nav;
  return opening;
};
try{
  const run=await simulateNativeCampaign({days,seed,biome,strategy:'good',
    culture:'mapungubwe',defend:true,defensePolicy:'topological',
    spatialAdvice:true,decisionProfile:true,nativeIntents:true,
    nativeWallPlans:true,reloadRaids:false,
    openingFactory,onTick:state=>{
      if(!captured&&captureDay===state.day&&
        state.raid?.animals.some(animal=>animal.status==='waiting')){
        captured=true;
        writeFileSync(output+'.raid-state.json.gz',gzipSync(serialize(state)));
      }
    },onDay:row=>{
      daily.push({day:row.day,living:row.living,money:row.money,
        gameTickMs:row.wallTime.gameTickMs,decisionMs:row.wallTime.decisionMs,
        raidSelection:structuredClone(navigation.raidSelectionStats)});
      console.log(JSON.stringify({day:row.day,living:row.living,money:row.money}));
    }});
  Object.assign(report,{status:'completed',result:run.result,
    completedNights:run.completedNights,daily,
    raids:run.raidEvidence,defense:run.defense,
    finalStateSha256:sha256(serialize(run.state))});
}catch(error){
  Object.assign(report,{status:'error',message:error.message,stack:error.stack,
    daily,partialDay:error.nativeCampaignPartial?.day,
    partialTime:error.nativeCampaignPartial?.time,
    partialStateSha256:error.nativeCampaignPartial?.state?
      sha256(error.nativeCampaignPartial.state):null});
  if(error.nativeCampaignPartial?.state)
    writeFileSync(output+'.partial-state.json.gz',
      gzipSync(error.nativeCampaignPartial.state));
}
report.elapsedMs=performance.now()-began;
writeFileSync(output,gzipSync(JSON.stringify(report)));
console.log(JSON.stringify({status:report.status,result:report.result,
  completedNights:report.completedNights,partialDay:report.partialDay,
  elapsedMs:report.elapsedMs,output}));
if(report.status==='error')process.exitCode=1;
