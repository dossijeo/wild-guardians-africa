import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_GENES,validateGenes,preferredAgriculturalPower} from '../tools/evolutionary-balance/policy-genes.mjs';
import {seededRandom,randomGenome,breed,scoreCampaign,genomeId} from '../tools/evolutionary-balance/ga.mjs';
import {validateConfig,evaluateOne,scoreSearchReport} from '../tools/evolutionary-balance/run-ga.mjs';
import {calibrate,screenProjection} from '../tools/evolutionary-balance/calibrate-model.mjs';
import {RAID_PRESSURE_CANDIDATE,raidAnimalCount} from '../src/simulation/raid-pressure-budget.js';
import {archiveGaReports} from '../tools/evolutionary-balance/archive-ga-reports.mjs';
import {archiveProgress,restoreProgress} from '../tools/evolutionary-balance/archive-progress.mjs';
import {mkdtempSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';

test('GA campaign archives retain exact reports and exclude incomplete progress',()=>{
 const dir=mkdtempSync(join(tmpdir(),'wg-ga-archive-'));
 try{
  const name='123456789abc-1234567890abcdef-sabana-411-7.json',raw='{"result":"defeat","completedNights":5}\n';
  writeFileSync(join(dir,name),raw);
  writeFileSync(join(dir,'progress-partial.jsonl'),'{"day":2}\n');
  const entries=archiveGaReports(dir);
  assert.equal(entries.length,1);
  assert.equal(entries[0].source,name);
  assert.equal(gunzipSync(readFileSync(join(dir,`${name}.gz`))).toString(),raw);
  assert.equal(existsSync(join(dir,name)),false);
  assert.equal(existsSync(join(dir,'progress-partial.jsonl')),true);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('progress bundle roundtrips exact logs and checks each original hash',()=>{
 const dir=mkdtempSync(join(tmpdir(),'wg-ga-progress-'));
 const restored=join(dir,'restored');
 try{
  const first='{"day":1}\n{"day":2}\n',second='{"day":3,"note":"é"}\n';
  writeFileSync(join(dir,'first.jsonl'),first);writeFileSync(join(dir,'second.jsonl'),second);
  assert.equal(archiveProgress(dir).count,2);
  assert.equal(existsSync(join(dir,'first.jsonl')),false);
  assert.equal(restoreProgress(join(dir,'progress-bundle.json.gz'),restored),2);
  assert.equal(readFileSync(join(restored,'first.jsonl'),'utf8'),first);
  assert.equal(readFileSync(join(restored,'second.jsonl'),'utf8'),second);
  writeFileSync(join(dir,'third.jsonl'),'{}\n');
  assert.throws(()=>archiveProgress(dir),/already exists/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('GA genes mutate reproducibly and remain inside policy bounds',()=>{
 const a=seededRandom(712),b=seededRandom(712);
 const first=Array.from({length:20},()=>randomGenome(a));
 const second=Array.from({length:20},()=>randomGenome(b));
 assert.deepEqual(first,second);
 for(let i=0;i<20;i++)validateGenes(breed(first[i],first[(i+1)%20],a));
 assert.equal(genomeId(DEFAULT_GENES),genomeId({...DEFAULT_GENES}));
 assert.throws(()=>validateGenes({...DEFAULT_GENES,plantsPerWorker:1}));
 assert.equal(validateGenes({...DEFAULT_GENES,wallPolicy:'none'}).wallPolicy,'none');
 assert.equal(validateGenes({...DEFAULT_GENES,wallPolicy:'service-side'}).wallPolicy,'service-side');
 assert.notEqual(genomeId(DEFAULT_GENES),genomeId({...DEFAULT_GENES,wallPolicy:'none'}));
 assert.throws(()=>validateGenes({...DEFAULT_GENES,wallPolicy:'unknown'}));
});
test('daily magic schedule distributes growth and multiplication without imposing a use cap',()=>{
 const order=(growthShare,magicPriority)=>Array.from({length:8},(_,i)=>
  preferredAgriculturalPower({...DEFAULT_GENES,growthShare,magicPriority},i));
 assert.deepEqual(order(0,'growth'),Array(8).fill('multiply'));
 assert.deepEqual(order(1,'multiply'),Array(8).fill('growth'));
 assert.deepEqual(order(0.5,'growth'),['growth','growth','multiply','multiply','growth','growth','multiply','multiply']);
 assert.deepEqual(order(0.5,'multiply'),['multiply','multiply','growth','growth','multiply','multiply','growth','growth']);
 assert.throws(()=>validateGenes({...DEFAULT_GENES,growthShare:0.3}));
});
test('search cohorts cannot overlap and truncation cannot count as victory',()=>{
 assert.throws(()=>validateConfig({train:[{biome:'sabana',seed:712}],holdout:[{biome:'sabana',seed:712}]}));
 assert.throws(()=>validateConfig({train:[{biome:'sabana',seed:712}],holdout:[{biome:'sabana',seed:123}],requireBiomeHoldout:true}));
 assert.throws(()=>validateConfig({population:2,initialPopulation:[DEFAULT_GENES,DEFAULT_GENES]}));
 assert.throws(()=>validateConfig({costStop:{maxDayGameTickMs:0,maxElapsedWallMs:1000}}));
 assert.throws(()=>validateConfig({days:14}),/post-intro-v2/);
 assert.throws(()=>validateConfig({days:14,fitnessVersion:'post-intro-v1'}),/post-intro-v2/);
 assert.throws(()=>validateConfig({days:14,fitnessVersion:'post-intro-v2'}),/delivery floor/);
 assert.equal(validateConfig({days:14,fitnessVersion:'post-intro-v2',
  minimumTerminalDeliveryPerDay:82,deliveryFloorSource:'frozen training controls'}).fitnessVersion,
  'post-intro-v2');
 const longReport={status:'completed',completedNights:14,result:null,
  rows:Array.from({length:14},(_,i)=>({day:i+1,money:600,living:100,
   delivered:100,destroyed:0,income:200,seeds:40,wages:90,repairs:10,walls:0})),
  raid:Array.from({length:9},(_,i)=>({day:i+6,livingAtSpawn:100,attraction:1000}))};
 assert.equal(scoreSearchReport(longReport,validateConfig({days:14,
  fitnessVersion:'post-intro-v2',minimumTerminalDeliveryPerDay:82,
  deliveryFloorSource:'frozen training controls'})).scoreVersion,'post-intro-v2');
 assert.equal(validateConfig({costStop:{maxDayGameTickMs:180000,maxElapsedWallMs:1800000}}).costStop.maxDayGameTickMs,180000);
 assert.equal(scoreCampaign({status:'error',rows:[],completedNights:99},100).valid,false);
 assert.equal(scoreCampaign({status:'error',name:'CampaignCostStop',rows:[],completedNights:5,result:null},7).reason,
  'computational-cost-stop');
 assert.equal(scoreCampaign({status:'completed',rows:[{money:500,living:10,delivered:20}],completedNights:7,result:null},100).valid,false);
 assert.equal(scoreCampaign({status:'completed',rows:[{money:500,living:10,delivered:20}],completedNights:7,result:'defeat'},100).completed,7);
 const survivor=scoreCampaign({status:'completed',rows:[{money:500,living:10,delivered:20}],completedNights:7,result:null},7);
 const defeated=scoreCampaign({status:'completed',rows:[{money:500,living:10,delivered:20}],completedNights:7,result:'defeat'},7);
 assert.equal(defeated.scoreVersion,'terminal-defeat-v2');
 assert.equal(survivor.score-defeated.score,500);
 assert.equal(scoreCampaign({status:'completed',rows:[{money:500,living:0,planted:0,delivered:0}],completedNights:7,result:null},7).valid,false);
});
test('calibration predicts from ledger outcomes without folding structural damage into crop damage',()=>{
 const rows=Array.from({length:10},(_,i)=>({day:i+1,living:20,planted:4,destroyed:i>5?2:0,
  finance:{income:100,wages:60,seeds:20,walls:10,repairs:i>5?5:0}}));
 const raids=rows.map(r=>({day:r.day,daytime:false,ended:true,cropsDestroyed:r.destroyed,
  pressureFacts:{observedValue:220},
  species:{warthog:{generated:2}},potentialAgriculturalHp:4,wallHpLost:40,exposedLivingAtSpawn:20,wallHits:3}));
 const m=calibrate({rows,raidEvidence:{raids},completedNights:9,result:'defeat',status:'completed'});
 assert.equal(m.source.rows,9);
 assert.equal(m.coefficients.seedCostPerPlant,5);
 assert.ok(m.coefficients.wallHpLostPerAnimal>0);
 assert.equal(m.observability.defenseEffectIdentifiable,false);
 assert.ok(m.coefficients.wagesToRaidAttraction>0);
 assert.ok(m.holdoutPredictions.length>0);
 assert.equal(m.holdoutPredictions.some(r=>r.day===10),false,
  'the defeat row is not a complete economic day');
 assert.equal(m.raidHoldoutPredictions.at(-1).day,10);
 assert.equal(m.raidHoldoutPredictions.at(-1).terminal,true,
  'an ended terminal raid remains valid agricultural-damage evidence');
 assert.equal(m.raidHoldoutPredictions.at(-1).actualDestroyed,2);
 assert.ok(m.raidHoldoutError.absolute>0);
 assert.equal(m.source.raidPressureVersion,1);
 const currentRaids=raids.map(r=>({...r,pressureFacts:{...r.pressureFacts,candidateVersion:3}}));
 const currentRows=rows.map(({finance,...row})=>({...row,...finance}));
 const current=calibrate({rows:currentRows,raidEvidence:{raids:currentRaids},
  completedNights:9,result:'defeat',status:'completed'});
 assert.equal(current.source.raidPressureVersion,3);
 const projection=screenProjection(current,{days:12});
 assert.deepEqual(projection.openingAssumption,{cash:700,living:68});
 assert.ok(projection.rows.length>=6);
 for(const row of projection.rows){
  assert.equal(row.animals,raidAnimalCount(row.day,row.pressure,RAID_PRESSURE_CANDIDATE));
  assert.ok(row.effectiveAttraction>=row.attraction);
 }
 assert.throws(()=>calibrate({rows:currentRows,raidEvidence:{raids:currentRaids.map((r,i)=>
  i===7?{...r,pressureFacts:{...r.pressureFacts,candidateVersion:1}}:r)},
  completedNights:9,result:'defeat',status:'completed'}),/Mixed raid pressure versions/);
});
test('opening end-of-day census is not reused as a fictitious opening plant stock',()=>{
 const rows=Array.from({length:10},(_,i)=>({day:i+1,living:20,planted:4,destroyed:0,
  income:i===0?1000:100,wages:40,seeds:20,walls:0,repairs:0}));
 const raids=rows.map(r=>({day:r.day,daytime:false,ended:true,cropsDestroyed:0,
  pressureFacts:{observedValue:100},species:{warthog:{generated:1}},
  potentialAgriculturalHp:2,wallHpLost:0,exposedLivingAtSpawn:20}));
 const model=calibrate({rows,raidEvidence:{raids},completedNights:10,result:null});
 assert.deepEqual(model.stockCoefficientDays,[2,3,4,5,6,7]);
 assert.equal(model.coefficients.incomePerPriorPlant,5);
 assert.equal(model.coefficients.nonRaidPlantExitPerPriorPlant,0.2);
});
test('desert pilot skips uncertain plots and still completes a paid native day', {timeout:60000}, async()=>{
 const report=await evaluateOne({biome:'desierto',seed:909},1,'evolved',
  {...DEFAULT_GENES,growthShare:0.5,magicPriority:'multiply'});
 assert.equal(report.status,'completed',report.message);
 assert.equal(report.completedNights,1);
 assert.ok(report.plotSearch.unknownPaths>0);
 assert.ok(report.rows[0].planted>0);
 assert.equal(report.rows[0].reconciled,true);
});
test('zero-wall gene suppresses wall construction without suppressing agricultural powers', {timeout:60000},async()=>{
 const report=await evaluateOne({biome:'sabana',seed:712},2,'evolved',
  {...DEFAULT_GENES,wallPolicy:'none'});
 assert.equal(report.status,'completed',report.message);
 assert.equal(report.policy.buildRepairWalls,false);
 assert.equal(report.policy.useShield,true);
 assert.equal(report.rows.reduce((n,row)=>n+row.walls,0),0);
 assert.ok(report.rows.reduce((n,row)=>n+row.magic.multiply,0)>0);
});
