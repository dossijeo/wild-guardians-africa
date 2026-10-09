import {writeFileSync,mkdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {simulateIntensiveFarm,auditIntensiveFarm} from './check_intensive_farm.mjs';
import {summarizeIntensiveFarm} from './summarize_intensive_farm.mjs';
import {intensiveRunProvenance} from './intensive-run-provenance.mjs';
import {createIntensiveHeartbeat} from './intensive-heartbeat.mjs';
import {createBlockedCheckpoint,createBlockedCheckpointWriter} from './intensive-blocked-checkpoint.mjs';
import {serialize} from '../src/persistence/snapshots.js';
import {BIOMES,CULTURES} from '../src/simulation/game.js';

const [biome,culture,daysText,directory]=process.argv.slice(2),days=Number(daysText);
if(!BIOMES.includes(biome)||!CULTURES.includes(culture)||!Number.isSafeInteger(days)||days<1||days>100||!directory)throw Error('Usage: node tools/check_intensive_case.mjs BIOME CULTURE DAYS OUTPUT_DIRECTORY');
const output=pathToFileURL(directory.replace(/[\\/]$/,'')+'/'),key=biome+'-'+culture;
mkdirSync(output,{recursive:true});
const provenance=intensiveRunProvenance(process.argv.slice(2)),row={biome,culture,days,status:'running',pid:process.pid,provenance};
const save=()=>writeFileSync(new URL(key+'-status.json',output),JSON.stringify(row,null,2)+'\n');
save();
let lastState=null;
const heartbeat=createIntensiveHeartbeat();
const checkpoint=createBlockedCheckpoint({capture:createBlockedCheckpointWriter(directory,key,provenance)});
try {
  const result=simulateIntensiveFarm({days,seed:712,biome,culture,mixed:true,onTick:(state,nav)=>{lastState=state;const live=heartbeat(state);if(live){row.live=live;const captured=checkpoint(state,nav,live);if(captured)row.blockedCheckpoint=captured;save();}},onDay:day=>{row.lastDay=day;save();}});
  const {state,nav,...report}=result;
  writeFileSync(new URL(key+'-state.json',output),serialize(state));
  writeFileSync(new URL(key+'-report.json',output),JSON.stringify({...report,provenance},null,2)+'\n');
  auditIntensiveFarm(result,{victory:days===100});
  if(result.completedNights!==days||result.result==='defeat')throw Error('Responsible strategy did not finish the requested nights');
  if(!result.daily.every(day=>day.staff>0&&day.delivered>0))throw Error('Workday without contracted labour or physical deliveries');
  const summary=summarizeIntensiveFarm({...result,provenance});
  writeFileSync(new URL(key+'-summary.json',output),JSON.stringify(summary,null,2)+'\n');
  Object.assign(row,{status:'passed',result:result.result,completedNights:result.completedNights,money:result.money,maximumLiving:result.maximumLiving,speciesObserved:summary.speciesObserved,unoccupiedFraction:summary.activity.unoccupiedFraction,activityAcceptance:summary.activity.acceptance});
}catch(error){
  row.status='failed';row.error={name:error.name,message:error.message};process.exitCode=1;
  if(lastState)try{writeFileSync(new URL(key+'-failure-state.json',output),serialize(lastState));row.failureSnapshot='validated';}
  catch(snapshotError){writeFileSync(new URL(key+'-failure-unvalidated.json',output),JSON.stringify(lastState));row.failureSnapshot={validationError:snapshotError.message};}
}
save();console.log(JSON.stringify({biome,culture,status:row.status,completedNights:row.completedNights,error:row.error}));
