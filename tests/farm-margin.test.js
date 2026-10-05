import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {analyzeFarmMargin,loadMarginCampaign} from '../tools/analyze_farm_margin.mjs';

const balancePath=fileURLToPath(new URL('../docs/qa/farm-margin-baseline/source-balance.js.gz',import.meta.url));
const campaign=loadMarginCampaign(fileURLToPath(new URL('../docs/qa/intensive-mangrove-shield-100/',import.meta.url)),balancePath);

test('reconciles the historical 100-night plantation, physical deliveries and recorded idle time without rewriting it',()=>{
 const before=JSON.stringify(campaign),r=analyzeFarmMargin(campaign);
 assert.equal(r.baseline.income,'135973');assert.equal(r.baseline.operatingCosts,'135570');
 assert.equal(r.baseline.operatingProfit,'403');assert.equal(r.baseline.endingBalance,'1103');
 assert.equal(r.baseline.activity.idleSecondsByReason.budget,15455);
 assert.equal(r.baseline.activity.unoccupiedFraction,17450/30000);
 assert.equal(r.bySpecies.platano.delivered,1);assert.equal(r.bySpecies.platano.destroyed,34);
 assert.equal(r.bySpecies.algodon.harvestMinusSeedCosts,'-3780');
 assert.equal(JSON.stringify(campaign),before);
 assert.match(r.scope,/No resimulation, no predicted idle reduction/);
});

test('computes an integer-price candidate from exact crate values but does not declare it a campaign victory',()=>{
 const r=analyzeFarmMargin(campaign),m=r.target.minimumUniformIncrease;
 assert.equal(r.target.profit,'27114');assert.equal(r.target.income,'162684');
 assert.equal(m.factorPermille,1112);assert.equal(m.prices.mijo,11);
 assert.equal(m.income,'165275');assert.equal(m.operatingProfit,'29705');
 assert.equal(m.finalAttraction,'3622');assert.equal(r.baseline.finalAttraction,'3075');
 assert.equal(m.finalThreatTier.index,4);assert.equal(m.finalThreatTier.threatMax,14);
 assert.ok(BigInt(m.income)>=BigInt(r.target.income));
 assert.equal(m.result,undefined);assert.equal(m.unoccupiedFraction,undefined);
 assert.ok(BigInt(r.scenarios.find(s=>s.factorPermille===1100).income)<BigInt(r.target.income));
});

for(const profile of ['olderMale','olderFemale','youngMale','youngFemale'])test(`reconciles independent historical ${profile} campaign using its source balance`,()=>{
 const input=loadMarginCampaign(fileURLToPath(new URL('../docs/qa/intensive-profile-comparison-20/',import.meta.url)),balancePath,profile+'-');
 const r=analyzeFarmMargin(input);assert.equal(r.baseline.completedNights,20);
 assert.equal(r.baseline.policy.profile,profile);
 assert.equal(r.scenarios[0].endingBalance,input.state.ledger.balance.n);
 assert.equal(r.scenarios[0].income,r.baseline.income);
 assert.equal(BigInt(r.baseline.endingBalance),BigInt(input.balance.initial_money)+BigInt(r.baseline.operatingProfit)-BigInt(r.baseline.centres));
});

test('rejects a mismatched historical balance rather than silently analysing current prices',()=>{
 assert.throws(()=>loadMarginCampaign(fileURLToPath(new URL('../docs/qa/intensive-mangrove-shield-100/',import.meta.url)),fileURLToPath(new URL('../src/simulation/crops.js',import.meta.url))),/Expected a generated JSON balance/);
 const altered=structuredClone(campaign);altered.balance.crops[0].plant_cost++;
 assert.throws(()=>analyzeFarmMargin(altered),/Historical seed prices do not reconcile/);
});

test('rejects a fabricated delivery credit even when the total ledger is reconciled',()=>{
 const input=structuredClone(campaign),crate=input.state.crates.find(c=>c.delivered);
 input.state.ledger.entries['deliver:'+crate.id].n=String(BigInt(input.state.ledger.entries['deliver:'+crate.id].n)+1n);
 input.state.ledger.balance.n=String(BigInt(input.state.ledger.balance.n)+1n);
 assert.throws(()=>analyzeFarmMargin(input));
});

test('reprices the raw rational value and rounds once, instead of multiplying a rounded historical credit',()=>{
 const input={balance:{initial_money:10,crops:[{id:'a',plant_cost:1,base_harvest_value:3,growth_seconds:5}],clock:{day_seconds:300},threat_tiers:[{attraction_min:0,attraction_max_exclusive:null}]},report:{completedNights:1,result:null,daily:[{idle:{budget:3}}]},state:{completedNights:1,result:null,ledger:{balance:{n:'11',d:'1'},entries:{'intensive-plant-1':{n:'-1',d:'1'},'deliver:c':{n:'2',d:'1'}}},plants:[{id:'p',species:'a',alive:false,growth:5,water:[{status:'manual'}]}],crates:[{id:'c',species:'a',sourcePlantId:'p',delivered:true,value:{n:'3',d:'2'}}]}};
 const r=analyzeFarmMargin(input);
 assert.equal(r.scenarios.find(s=>s.factorPermille===1250).prices.a,4);
 assert.equal(r.scenarios.find(s=>s.factorPermille===1250).income,'2');
 assert.equal(r.bySpecies.a.seedOnlyBreakEvenHarvest,'1');
 input.state.crates[0].delivered=false;delete input.state.ledger.entries['deliver:c'];input.state.ledger.balance.n='9';
 const pending=analyzeFarmMargin(input);assert.equal(pending.target.minimumUniformIncrease,null);
 assert.equal(pending.scenarios.at(-1).income,'0','Undelivered crates cannot generate forecast income');
 assert.equal(pending.bySpecies.a.inTransit,1);
});

test('rejects a physically unwatered harvest and invalid analytical targets',()=>{
 const input=structuredClone(campaign),crate=input.state.crates[0];
 input.state.plants.find(p=>p.id===crate.sourcePlantId).water[0].status='due';
 assert.throws(()=>analyzeFarmMargin(input),/Harvest lacked completed growth\/watering/);
 for(const target of [-1,101,2.5,NaN])assert.throws(()=>analyzeFarmMargin(campaign,{targetMarginPercent:target}));
});
