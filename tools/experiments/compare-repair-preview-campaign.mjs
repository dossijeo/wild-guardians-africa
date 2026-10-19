import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {serialize} from '../../src/persistence/snapshots.js';
import {simulateNativeCampaign} from '../native-campaign-runner.mjs';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';

const [arm,output,daysText='19',seedText='712']=process.argv.slice(2);
const days=Number(daysText),seed=Number(seedText);
if(!['sequential','batch'].includes(arm)||!output||
  !Number.isInteger(days)||days<1||days>100||!Number.isInteger(seed))
  throw Error('Usage: compare-repair-preview-campaign.mjs ARM OUTPUT [DAYS] [SEED]');
const sha256=value=>createHash('sha256').update(value).digest('hex');
const sourceSha256=sha256(readFileSync(new URL('../../src/simulation/game.js',
  import.meta.url)));
const wasmSha256=sha256(readFileSync(new URL(
  '../../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const rows=[];
let state=null,wrapped=false;
const started=performance.now();
const report=await simulateNativeCampaign({days,seed,biome:'volcanes',
  strategy:'good',culture:'mapungubwe',defend:true,wallSpendingEnabled:true,
  defensePolicy:'topological',spatialAdvice:true,decisionProfile:true,
  nativeIntents:true,nativeWallPlans:true,reloadRaids:false,
  openingFactory:createSpatialCampaignOpening,
  onTick:(current,nav)=>{
    state=current;
    if(arm==='sequential'&&!wrapped){
      wrapped=true;
      const preview=nav.withWallStatePreview;
      nav.withWallStatePreview=(walls,inspect)=>preview(walls,({route})=>
        inspect({route}));
    }
  },
  onDay:row=>{
    const result={day:row.day,stateSha256:sha256(serialize(state)),
      living:row.living,money:row.money,destroyed:row.destroyed,
      gameTickMs:row.wallTime.gameTickMs,
      decisionMs:row.wallTime.decisionMs};
    rows.push(result);
    console.log(JSON.stringify({arm,...result}));
  }});
const result={arm,days,seed,sourceSha256,wasmSha256,
  elapsedMs:performance.now()-started,completedNights:report.completedNights,
  gameResult:report.result,raidEvidenceStatus:report.raidEvidence?.status,
  raidEvidenceIssues:report.raidEvidence?.issues,rows};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');
