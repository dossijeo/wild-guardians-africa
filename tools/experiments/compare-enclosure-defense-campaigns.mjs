import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {simulateNativeCampaign} from '../native-campaign-runner.mjs';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';

const [biome='gran-canon',daysText='14',seedText='712',output,only]=
  process.argv.slice(2);
const days=Number(daysText),seed=Number(seedText);
if(!Number.isInteger(days)||days<6||days>100||!Number.isInteger(seed)||
  (only&&only!=='expanding'&&only!=='topological')||
  !output)throw TypeError('Usage: compare-enclosure-defense-campaigns.mjs BIOME DAYS SEED OUTPUT');
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const wasmPath=process.env.WILD_ENGINE_SPATIAL_SERVICES_WASM??
  'src/world/wild-engine/spatial-savanna.wasm';
const evidence={biome,days,seed,
  sourceSha256:sha256(readFileSync(new URL('../native-campaign-runner.mjs',
    import.meta.url))),wasmSha256:sha256(readFileSync(wasmPath)),arms:[]};
for(const defensePolicy of only?[only]:['expanding','topological']){
  const started=performance.now(),rows=[];
  try{
    const report=await simulateNativeCampaign({days,seed,biome,
      strategy:'good',culture:'mapungubwe',defend:true,
      defensePolicy,spatialAdvice:true,decisionProfile:true,
      nativeIntents:true,nativeWallPlans:true,reloadRaids:false,
      openingFactory:createSpatialCampaignOpening,
      onDay:row=>{
        const daily={day:row.day,living:row.living,money:row.money,
          destroyed:row.destroyed,planted:row.planted,
          decisionMs:row.wallTime.decisionMs,
          gameTickMs:row.wallTime.gameTickMs,
          stateSha256:row.stateSha256};
        rows.push(daily);
        console.log(JSON.stringify({defensePolicy,...daily}));
      }});
    evidence.arms.push({defensePolicy,status:'completed',
      elapsedMs:performance.now()-started,
      result:report.result,completedNights:report.completedNights,
      rows,defense:report.defense,
      raids:report.raidEvidence?.raids?.map(raid=>({day:raid.day,
        cropsDestroyed:raid.cropsDestroyed,wallHits:raid.wallHits,
        structuresRuined:raid.structuresRuined}))??[],
      raidEvidenceStatus:report.raidEvidence?.status,
      raidEvidenceIssues:report.raidEvidence?.issues});
  }catch(error){
    const partial=error.nativeCampaignPartial;
    const partialStatePath=partial?.state?
      `${output}.${defensePolicy}.partial-state.json.gz`:null;
    if(partialStatePath)writeFileSync(partialStatePath,
      gzipSync(Buffer.from(partial.state)));
    evidence.arms.push({defensePolicy,status:'error',
      elapsedMs:performance.now()-started,message:error.message,stack:error.stack,
      rows,partial:partial?{day:partial.day,time:partial.time,
        result:partial.result,entryTransport:partial.entryTransport,
        navigation:partial.navigation,
        completedDailyRows:partial.receipts?.daily?.length,
        stateSha256:partial.state?sha256(partial.state):null,
        partialStatePath}:null});
  }
  writeFileSync(output,JSON.stringify(evidence,null,2)+'\n');
}
