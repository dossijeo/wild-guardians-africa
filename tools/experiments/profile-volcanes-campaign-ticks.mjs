import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {Session} from 'node:inspector';
import {gzipSync} from 'node:zlib';
import {simulateNativeCampaign} from '../native-campaign-runner.mjs';
import {serialize} from '../../src/persistence/snapshots.js';
import {createSpatialCampaignOpening} from './spatial-campaign-opening.mjs';

const [output='test-results/volcanes-712-tick-profile.json',
  seedText='712',startText='19',endText='22']=process.argv.slice(2);
const seed=Number(seedText),startDay=Number(startText),endDay=Number(endText);
if(!Number.isInteger(seed)||!Number.isInteger(startDay)||
  !Number.isInteger(endDay)||startDay<2||endDay<startDay)
  throw Error('Usage: profile-volcanes-campaign-ticks.mjs OUTPUT SEED START_DAY END_DAY');

const session=new Session();
session.connect();
const post=method=>new Promise((resolve,reject)=>session.post(method,(error,value)=>
  error?reject(error):resolve(value)));
let active=false,startPromise=null,profileResult=null;
const measurements=[],repairProbes=[];
let capturedState=null;
globalThis.__wildRepairAccessProbe=event=>{
  if(event.day>=startDay&&event.day<=endDay)repairProbes.push(event);
};
const report=await simulateNativeCampaign({days:endDay,seed,biome:'volcanes',
  strategy:'good',culture:'mapungubwe',defend:true,wallSpendingEnabled:true,
  defensePolicy:'topological',spatialAdvice:true,decisionProfile:true,
  nativeIntents:true,nativeWallPlans:true,reloadRaids:false,
  openingFactory:createSpatialCampaignOpening,
  onTick:(state,_nav,timing)=>{
    const captureAt=Number(process.env.WILD_REPAIR_CAPTURE_TIME);
    if(capturedState||state.day!==startDay||
      (Number.isFinite(captureAt)&&captureAt>0?
        state.time<captureAt:timing.gameTickMs<100))return;
    const path=output.replace(/\.json$/,'.slow-tick-state.json.gz');
    writeFileSync(path,gzipSync(Buffer.from(serialize(state))));
    capturedState={path,day:state.day,time:state.time,
      tickMs:timing.gameTickMs};
  },
  onDay:row=>{
    measurements.push({day:row.day,gameTickMs:row.wallTime.gameTickMs,
      decisionMs:row.wallTime.decisionMs,living:row.living});
    console.log(JSON.stringify(measurements.at(-1)));
    if(row.day===startDay-1){
      // The callback runs at the deterministic day boundary. Profiling starts
      // on the next event-loop turn, before the next simulated tick.
      active=true;
      startPromise=post('Profiler.enable').then(()=>post('Profiler.start'));
    }
    if(row.day===endDay&&active){
      active=false;
      profileResult=startPromise.then(()=>post('Profiler.stop')).then(({profile})=>{
        const path=output.replace(/\.json$/,'.cpuprofile');
        writeFileSync(path,JSON.stringify(profile));
        return {path,sha256:createHash('sha256')
          .update(JSON.stringify(profile)).digest('hex')};
      });
    }
  }});
const profile=profileResult?await profileResult:null;
session.disconnect();
delete globalThis.__wildRepairAccessProbe;
const evidence={biome:'volcanes',seed,startDay,endDay,
  result:report.result,completedNights:report.completedNights,
  raids:report.raidEvidence?.status,profile,capturedState,repairProbes,
  measurements};
writeFileSync(output,JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({profile,...evidence}));
