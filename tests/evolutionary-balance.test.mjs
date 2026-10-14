import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_GENES,validateGenes} from '../tools/evolutionary-balance/policy-genes.mjs';
import {seededRandom,randomGenome,breed,scoreCampaign,genomeId} from '../tools/evolutionary-balance/ga.mjs';
import {validateConfig} from '../tools/evolutionary-balance/run-ga.mjs';
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
test('search cohorts cannot overlap and truncation cannot count as victory',()=>{
 assert.throws(()=>validateConfig({train:[{biome:'sabana',seed:712}],holdout:[{biome:'sabana',seed:712}]}));
 assert.equal(scoreCampaign({status:'error',rows:[],completedNights:99},100).valid,false);
 assert.equal(scoreCampaign({status:'completed',rows:[{money:500,living:10,delivered:20}],completedNights:7,result:null},100).valid,false);
 assert.equal(scoreCampaign({status:'completed',rows:[{money:500,living:10,delivered:20}],completedNights:7,result:'defeat'},100).completed,7);
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
 assert.ok(m.holdoutPredictions.length>0);
});
