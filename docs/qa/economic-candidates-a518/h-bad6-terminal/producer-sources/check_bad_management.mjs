// Ordinary native commands; this deliberately omits growing wage/repair reserves.
// Survival in a particular biome is recorded, not converted into an artificial loss.
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {BIOMES} from '../src/simulation/game.js';
import {serialize} from '../src/persistence/snapshots.js';
import {simulateIntensiveFarm,auditIntensiveFarm} from './check_intensive_farm.mjs';
import {summarizeIntensiveFarm} from './summarize_intensive_farm.mjs';
import {intensiveRunProvenance} from './intensive-run-provenance.mjs';

const output=resolve(process.argv[2]??'.cache/bad-management-native');
const provenance=intensiveRunProvenance(process.argv.slice(2));
const matrix={provenance,policy:{days:10,seed:712,culture:'mapungubwe',reserveLabourGrowth:false,reserveMaintenance:false,burstPlanting:true,cameraEntry:true},cases:[],status:'running'};
mkdirSync(output,{recursive:true});
const save=()=>writeFileSync(resolve(output,'matrix.json'),JSON.stringify(matrix,null,2)+'\n');save();
for(const biome of BIOMES){
  const row={biome,status:'running'};matrix.cases.push(row);save();
  try{
    const result=simulateIntensiveFarm({...matrix.policy,biome,onDay:day=>console.log(JSON.stringify({biome,day:day.day,money:day.money,result:day.result}))});
    const {state,nav,...report}=result;
    writeFileSync(resolve(output,`${biome}-report.json`),JSON.stringify(report,null,2)+'\n');
    const snapshot=serialize(state);writeFileSync(resolve(output,`${biome}-state.json.gz`),gzipSync(snapshot));
    auditIntensiveFarm(result);
    assert.equal(state.raid,null,'an unfinished incursion must not stand in for defeat/survival');
    assert.equal(report.counts.RaidSpawned??0,report.counts.RaidEnded??0);
    assert.equal(report.counts.CampaignWon??0,0);
    assert.equal(report.counts.GameOver??0,report.result==='defeat'?1:0);
    const summary=summarizeIntensiveFarm(result);writeFileSync(resolve(output,`${biome}-summary.json`),JSON.stringify(summary,null,2)+'\n');
    Object.assign(row,{status:'audited',result:report.result,completedNights:report.completedNights,money:report.money,maximumLiving:report.maximumLiving,delivered:report.counts.CrateDelivered??0,unoccupiedFraction:report.activity.unoccupiedFraction,gameOver:state.events.filter(e=>e.type==='GameOver'),snapshotSha256:createHash('sha256').update(snapshot).digest('hex')});
  }catch(error){Object.assign(row,{status:'failed',error:{name:error.name,message:error.message}});}
  save();console.log(JSON.stringify(row));
}
matrix.sourcesUnchanged=Object.entries(provenance.sourceHashes).every(([file,hash])=>createHash('sha256').update(readFileSync(file)).digest('hex')===hash);
matrix.defeats=matrix.cases.filter(row=>row.result==='defeat').length;
matrix.status=matrix.sourcesUnchanged&&matrix.defeats>0&&matrix.cases.every(row=>row.status==='audited')?'passed':'failed';save();
if(matrix.status!=='passed')process.exitCode=1;
