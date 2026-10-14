import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_GENES,validateGenes,preferredAgriculturalPower} from '../tools/evolutionary-balance/policy-genes.mjs';
import {seededRandom,randomGenome,breed,scoreCampaign,genomeId} from '../tools/evolutionary-balance/ga.mjs';
import {validateConfig,evaluateOne} from '../tools/evolutionary-balance/run-ga.mjs';
import {calibrate} from '../tools/evolutionary-balance/calibrate-model.mjs';

test('GA genes mutate reproducibly and remain inside policy bounds',()=>{
 const a=seededRandom(712),b=seededRandom(712);
 const first=Array.from({length:20},()=>randomGenome(a));
 const second=Array.from({length:20},()=>randomGenome(b));
 assert.deepEqual(first,second);
 for(let i=0;i<20;i++)validateGenes(breed(first[i],first[(i+1)%20],a));
 assert.equal(genomeId(DEFAULT_GENES),genomeId({...DEFAULT_GENES}));
 assert.throws(()=>validateGenes({...DEFAULT_GENES,plantsPerWorker:1}));
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
 assert.equal(scoreCampaign({status:'error',rows:[],completedNights:99},100).valid,false);
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
 const raids=rows.map(r=>({day:r.day,daytime:false,pressureFacts:{observedValue:220},
  species:{warthog:{generated:2}},potentialAgriculturalHp:4,wallHpLost:40,exposedLivingAtSpawn:20,wallHits:3}));
 const m=calibrate({rows,raidEvidence:{raids},completedNights:9,result:'defeat',status:'completed'});
 assert.equal(m.source.rows,9);
 assert.equal(m.coefficients.seedCostPerPlant,5);
 assert.ok(m.coefficients.wallHpLostPerAnimal>0);
 assert.equal(m.observability.defenseEffectIdentifiable,false);
 assert.ok(m.coefficients.wagesToRaidAttraction>0);
 assert.ok(m.holdoutPredictions.length>0);
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
