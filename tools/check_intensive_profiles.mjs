// Compare ordinary hiring choices without altering any gameplay rule or the
// original campaign strategy. Sequential runs share one loaded module revision.
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {simulateIntensiveFarm,auditIntensiveFarm} from './check_intensive_farm.mjs';
import {summarizeIntensiveFarm} from './summarize_intensive_farm.mjs';
import {intensiveRunProvenance} from './intensive-run-provenance.mjs';
import {serialize} from '../src/persistence/snapshots.js';
import {PROFILES} from '../src/simulation/workforce.js';

const days=Number(process.argv[2]??20);
if(!Number.isSafeInteger(days)||days<1||days>100)throw Error('Expected 1–100 nights');
const directory=resolve(process.argv[3]??`test-results/intensive-profiles-${days}-${Date.now()}`);
if(existsSync(resolve(directory,'matrix.json')))throw Error('Output directory already contains a recorded comparison');
mkdirSync(directory,{recursive:true});
const provenance=intensiveRunProvenance(process.argv.slice(2));
const matrix={days,biome:'sabana',culture:'mapungubwe',seed:712,mixed:true,middayHiring:true,pid:process.pid,provenance,cases:PROFILES.map(p=>({profile:p.id,status:'pending'}))};
const write=(file,value)=>writeFileSync(resolve(directory,file),JSON.stringify(value,null,2)+'\n');
const save=()=>write('matrix.json',matrix);
save();
for(const row of matrix.cases){
 let lastState=null;
 row.status='running';save();
 try{
  const result=simulateIntensiveFarm({days,seed:712,biome:matrix.biome,culture:matrix.culture,mixed:true,middayHiring:true,profile:row.profile,
   onTick:state=>{lastState=state;},onDay:day=>{row.lastDay=day;save();}});
  const {state,nav,...report}=result;
  write(row.profile+'-report.json',{...report,provenance});
  writeFileSync(resolve(directory,row.profile+'-state.json'),serialize(state));
  auditIntensiveFarm(result,{victory:days===100});
  const summary=summarizeIntensiveFarm({...result,provenance});write(row.profile+'-summary.json',summary);
  if(result.completedNights!==days||result.result==='defeat')throw Error('Responsible hiring strategy did not finish the requested nights');
  if(!result.daily.every(day=>day.staff>0&&day.delivered>0))throw Error('Workday without contracted labour or physical deliveries');
  Object.assign(row,{status:'passed',completedNights:result.completedNights,money:result.money,maximumLiving:result.maximumLiving,speciesObserved:summary.speciesObserved,unoccupiedFraction:summary.activity.unoccupiedFraction});
 }catch(error){
  row.status='failed';row.error={name:error.name,message:error.message};process.exitCode=1;
  if(lastState)try{writeFileSync(resolve(directory,row.profile+'-failure-state.json'),serialize(lastState));row.failureSnapshot='validated';}
  catch(snapshotError){write(row.profile+'-failure-unvalidated.json',lastState);row.failureSnapshot={validationError:snapshotError.message};}
 }
 save();console.log(JSON.stringify({profile:row.profile,status:row.status,completedNights:row.completedNights,money:row.money,error:row.error?.message.slice(0,160)}));
}
console.log(JSON.stringify({directory,passed:matrix.cases.filter(c=>c.status==='passed').length,total:matrix.cases.length}));
