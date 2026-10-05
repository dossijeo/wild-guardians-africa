import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createCropLifecycleObserver} from './crop-lifecycle.mjs';
import {simulateIntensiveFarm,auditIntensiveFarm} from './check_intensive_farm.mjs';
import {intensiveRunProvenance} from './intensive-run-provenance.mjs';
import {summarizeIntensiveFarm} from './summarize_intensive_farm.mjs';
import {serialize} from '../src/persistence/snapshots.js';
import {PROFILES} from '../src/simulation/workforce.js';

const days=Number(process.argv[2]??20),profile=process.argv[3]??'olderMale',directory=resolve(process.argv[4]??`test-results/crop-lifecycle-${Date.now()}`),plantsPerWorker=Number(process.argv[5]??12);
if(!Number.isSafeInteger(days)||days<1||days>100||!PROFILES.some(p=>p.id===profile)||!Number.isSafeInteger(plantsPerWorker)||plantsPerWorker<1)throw Error('Usage: node tools/check_crop_lifecycle.mjs NIGHTS PROFILE OUTPUT_DIRECTORY [PLANTS_PER_WORKER] [defend]');
const defend=process.argv[6]==='defend';
if(process.argv[6]&&!defend)throw Error('Expected optional defend argument');
if(existsSync(directory))throw Error('Refusing to overwrite a lifecycle recording');
mkdirSync(directory,{recursive:true});
const provenance=intensiveRunProvenance(process.argv.slice(2));
for(const file of ['tools/crop-lifecycle.mjs','tools/check_crop_lifecycle.mjs'])provenance.sourceHashes[file]=createHash('sha256').update(readFileSync(new URL('../'+file,import.meta.url))).digest('hex');
const observer=createCropLifecycleObserver(),status={status:'running',pid:process.pid,days,profile,plantsPerWorker,defend,provenance};let lastState=null;
provenance.sourceHashes['tools/farm-defense-policy.mjs']=createHash('sha256').update(readFileSync(new URL('./farm-defense-policy.mjs',import.meta.url))).digest('hex');
const write=(name,value)=>writeFileSync(resolve(directory,name+'.json'),JSON.stringify(value,null,2)+'\n');
write('status',status);
try{
 const result=simulateIntensiveFarm({days,seed:712,biome:'sabana',culture:'mapungubwe',profile,mixed:true,middayHiring:true,plantsPerWorker,defend,
  onTick:s=>{lastState=s;observer.observe(s);},onDay:day=>{status.lastDay=day;write('status',status);}});
 const {state,nav,...report}=result;
 write('report',{...report,provenance});writeFileSync(resolve(directory,'state.json'),serialize(state));
 auditIntensiveFarm(result,{victory:days===100});write('summary',summarizeIntensiveFarm({...result,provenance}));
 if(result.completedNights!==days||result.result==='defeat')throw Error('Recorded strategy did not complete the requested nights');
 status.status='passed';status.completedNights=result.completedNights;
}catch(error){
 status.status='failed';status.error={name:error.name,message:error.message};process.exitCode=1;
 if(lastState)try{writeFileSync(resolve(directory,'failure-state.json'),serialize(lastState));}catch(snapshotError){status.snapshotError=snapshotError.message;}
}finally{write('lifecycle',observer.report());write('status',status);}
console.log(JSON.stringify({directory,status:status.status,completedNights:status.completedNights,error:status.error}));
