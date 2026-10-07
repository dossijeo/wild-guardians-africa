// Thirty native worlds with the same responsible reinvestment policy.
// Short runs are diagnostics and cannot satisfy hundred-night acceptance.
import {mkdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {BIOMES,CULTURES} from '../src/simulation/game.js';
import {simulateIntensiveFarm,auditIntensiveFarm} from './check_intensive_farm.mjs';
import {summarizeIntensiveFarm} from './summarize_intensive_farm.mjs';
import {serialize} from '../src/persistence/snapshots.js';
import {intensiveRunProvenance} from './intensive-run-provenance.mjs';
import {createIntensiveHeartbeat} from './intensive-heartbeat.mjs';

export function runIntensiveMatrix({days=100,seed=712,profile='olderFemale',output,onCase=()=>{}}={}) {
  if(!Number.isSafeInteger(days)||days<1||days>100)throw Error('Days must be an integer from 1 to 100');
  if(!output)throw Error('An explicit output directory is required');
  mkdirSync(output,{recursive:true});
  const provenance=intensiveRunProvenance(process.argv.slice(2));
  const matrix={days,seed,profile,mixed:true,provenance,campaign100:'unverified',cases:[]};
  const save=()=>writeFileSync(new URL('matrix.json',output),JSON.stringify(matrix,null,2)+'\n');
  save();
  for(const biome of BIOMES)for(const culture of CULTURES) {
    const row={biome,culture,status:'running'};matrix.cases.push(row);save();
    const heartbeat=createIntensiveHeartbeat();
    try {
      const result=simulateIntensiveFarm({days,seed,biome,culture,profile,mixed:true,onTick:state=>{const live=heartbeat(state);if(live){row.live=live;save();}},onDay:day=>{row.lastDay=day;save();}});
      const {state,nav,...report}=result,key=biome+'-'+culture;
      // Preserve even a defeated result before asserting responsible survival.
      writeFileSync(new URL(key+'-state.json',output),serialize(state));
      writeFileSync(new URL(key+'-report.json',output),JSON.stringify({...report,provenance},null,2)+'\n');
      auditIntensiveFarm(result,{victory:days===100});
      if(result.completedNights!==days||result.result==='defeat')throw Error('Responsible strategy failed to finish the requested nights');
      if(!result.daily.every(day=>day.staff>0&&day.delivered>0))throw Error('A workday lacked contracted workers or physical deliveries');
      const summary=summarizeIntensiveFarm({...result,provenance});
      writeFileSync(new URL(key+'-summary.json',output),JSON.stringify(summary,null,2)+'\n');
      Object.assign(row,{status:'passed',result:result.result,completedNights:result.completedNights,money:result.money,maximumLiving:result.maximumLiving,speciesObserved:summary.speciesObserved,unoccupiedFraction:summary.activity.unoccupiedFraction});
    }catch(error){row.status='failed';row.error={name:error.name,message:error.message};}
    save();onCase(row);
  }
  matrix.campaign100=days===100&&matrix.cases.length===30&&matrix.cases.every(row=>row.status==='passed')?'verified':'unverified';
  save();return matrix;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const days=Number(process.argv[2]??100),output=new URL(`../test-results/intensive-matrix-${days}-${Date.now()}/`,import.meta.url);
  console.log(JSON.stringify({output:output.pathname,days}));
  const matrix=runIntensiveMatrix({days,output,onCase:row=>console.log(JSON.stringify(row))});
  if(matrix.cases.some(row=>row.status!=='passed'))process.exitCode=1;
}
