import test from 'node:test';
import assert from 'node:assert/strict';
import {BALANCE as B} from '../src/simulation/balance.js';
import {agriculturalRaidValue,raidAnimalCount,validateRaidPressureMemory,updateRaidPressureMemory,raidPressure,raidPressureSummary,raidSpeciesPressure,raidCompositionWeights,raidCompositionCounts,referenceRaidArea,raidProductEnvelope,selectBudgetedRaid,planRaidProductComposition,validateRaidPressureConfiguration,validateRaidPressureRuntimeConfig,validateRaidPressureSource,RAID_PRESSURE_CANDIDATE as C} from '../src/simulation/raid-pressure-budget.js';
const ids=B.animals.map(a=>a.id);
test('V uses only native living agricultural base value, not cash/maturity/magic bonuses',()=>{
 const plants=B.crops.map(c=>({species:c.id,alive:true,growth:999,multiplyHarvest:true,harvestBonus:999}));assert.equal(agriculturalRaidValue(plants),577);
 plants.push({species:'platano',alive:false});assert.equal(agriculturalRaidValue(plants),577);
 assert.throws(()=>agriculturalRaidValue([{alive:true,species:'invalid'}]));
});
test('five-night EMA is pure/idempotent, initializes legacy, persists exactly and never invents missing samples',()=>{
 const first=updateRaidPressureMemory(null,58,1000);assert.deepEqual(first,{version:1,lastDay:58,sample:1000,ema:1000});
 const before=JSON.stringify(first),next=updateRaidPressureMemory(first,59,400);assert.equal(JSON.stringify(first),before);assert.equal(next.ema,800);
 assert.deepEqual(updateRaidPressureMemory(next,59,9999),next);
 const restored=JSON.parse(JSON.stringify(next));assert.deepEqual(updateRaidPressureMemory(restored,60,0),updateRaidPressureMemory(next,60,0));
 assert.throws(()=>updateRaidPressureMemory(next,58,0));assert.throws(()=>updateRaidPressureMemory(next,61,0));assert.throws(()=>validateRaidPressureMemory({...next,ema:NaN}));
});
test('P follows independent formula with clamping and growing/retiring agriculture',()=>{
 assert.equal(raidPressure(1,0),0);assert.equal(raidPressure(100,25000),1);
 assert.ok(Math.abs(raidPressure(50,1000)-(.45*49/99+.55*Math.log(2)/Math.log(26)))<1e-14);
 assert.equal(raidPressure(400,1e9),1);
 const memory=updateRaidPressureMemory(updateRaidPressureMemory(null,6,1000),7,0);
 const retired=raidPressureSummary(7,0,memory);assert.equal(retired.effectiveValue,memory.ema);
 assert.equal(raidPressureSummary(7,9000,memory).effectiveValue,9000);
 assert.throws(()=>raidPressureSummary(8,0,memory));
});
test('species formulas apply jointly with no cash-dependent input',()=>{
 const bases=[1,1,2,2,3],radii=[.7,1.2,2,1.6,2.8];
 for(let i=0;i<ids.length;i++)for(const p of [0,.49,.5,.66,1]){
  const s=raidSpeciesPressure(ids[i],p),a=B.animals[i];assert.equal(s.minHits,a.hit_budget_min+Math.floor(4*p));assert.equal(s.maxHits,a.hit_budget_max+Math.floor(4*p));assert.equal(s.cropDamage,bases[i]+Math.floor(1.5*p));assert.equal(s.structureDamage,Math.round(a.structure_hit_damage*(1+.5*p)));assert.equal(s.attackRadius,radii[i]*(1+.3*p));assert.equal(s.areaCap,1+Math.floor(6*p));
 }
});
test('mixture interpolates weak opening to final proportions, preserves unlocks and finite rounding',()=>{
 assert.deepEqual(raidCompositionWeights(0,ids),[1,0,0,0,0]);assert.deepEqual(raidCompositionWeights(1,ids),[.25,.28,.23,.16,.08]);
 for(const p of [0,.1,.5,1])for(const unlocked of [ids.slice(0,1),ids.slice(0,2),ids]){
  const n=Math.round(4+30*p),counts=raidCompositionCounts(n,p,unlocked),w=raidCompositionWeights(p,unlocked);
  assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),n);
  for(let i=0;i<ids.length;i++){assert.ok(counts[ids[i]]<=Math.ceil(w[i]*n));if(!unlocked.includes(ids[i]))assert.equal(counts[ids[i]],0);}
 }
});
test('reference directional area is below cap when radius/spacing cannot reach neighbours',()=>{
 const warthog=referenceRaidArea(raidSpeciesPressure('warthog',1));assert.equal(warthog.effective,1);assert.equal(warthog.peripheral,0);
 const rhino=referenceRaidArea(raidSpeciesPressure('rhino',1));assert.ok(rhino.effective>1);assert.ok(rhino.effective<7);assert.ok(rhino.points.every(p=>p.z>=0&&p.distance<=3.64+1e-12));
 for(const id of ids)for(const p of [0,.5,1]){const s=raidSpeciesPressure(id,p),a=referenceRaidArea(s);assert.ok(a.effective<=s.areaCap);assert.ok(a.effective>=1);}
});
test('Q controls joint product without deleting animals or materializing composition lists',()=>{
 for(const p of [0,.1,.5,.9,1])for(const seed of [1,712,2026]){
  const result=selectBudgetedRaid({night:6,pressure:p,unlocked:ids,rng:seed});assert.equal(result.status,'selected');assert.equal(result.actors.length,raidAnimalCount(6,p));assert.equal(result.draws,result.actors.length*2);assert.ok(result.spentProduct<=result.envelope.q+1e-9);
  assert.equal(result.spentProduct,result.actors.reduce((n,a)=>n+a.product,0));assert.ok(result.waves.every(w=>w.length<=16));assert.equal(result.waves.flat().length,result.actors.length);
  for(const a of result.actors){const s=raidSpeciesPressure(a.species,p);assert.ok(a.hits>=s.minHits&&a.hits<=s.maxHits);}
 }
});
test('selection deterministically roundtrips RNG and leaves inputs/config/balance unchanged',()=>{
 const input={night:6,pressure:.75,unlocked:ids,rng:712},before=JSON.stringify({input,B,C});
 const one=selectBudgetedRaid(input),two=selectBudgetedRaid(JSON.parse(JSON.stringify(input)));assert.deepEqual(one,two);assert.equal(JSON.stringify({input,B,C}),before);
 const after=selectBudgetedRaid({...input,rng:one.rng});assert.notEqual(after.rng,one.rng);
});
test('introductions keep original one actor/min budget without new random draws',()=>{
 for(let night=1;night<=5;night++){const r=selectBudgetedRaid({night,pressure:1,unlocked:ids,rng:712});assert.equal(r.rng,712);assert.equal(r.draws,0);assert.deepEqual(r.actors,[{species:ids[night-1],hits:B.animals[night-1].hit_budget_min}]);}
});
test('explicit infeasible Q rejects composition before any random draw',()=>{
 const plan=planRaidProductComposition(34,1,ids,C,B,0);assert.equal(plan.status,'infeasible-budget');assert.equal(plan.counts,null);
 const r=selectBudgetedRaid({night:6,pressure:1,unlocked:ids,rng:712,qBudget:0});assert.equal(r.status,'infeasible-budget');assert.equal(r.rng,712);assert.equal(r.draws,0);assert.deepEqual(r.actors,[]);assert.equal(r.targetAnimals,8);
});
test('invalid inputs reject bounded work instead of propagating unsafe values',()=>{
 for(const p of [-1,NaN,Infinity,1.1])assert.throws(()=>raidSpeciesPressure('rhino',p));assert.throws(()=>raidPressure(0,0));assert.throws(()=>raidPressure(1,-1));assert.throws(()=>raidCompositionCounts(10000,1,ids));assert.throws(()=>referenceRaidArea({attackRadius:100,areaCap:7}));assert.throws(()=>selectBudgetedRaid({night:6,pressure:1,unlocked:ids,rng:1,config:{...C,activeWaveLimit:0}}));
});

test('peaceful postgame has no actor, pressure draw or budget assignment',()=>{const r=selectBudgetedRaid({night:101,pressure:1,unlocked:ids,rng:712,postgame:true});assert.deepEqual(r,{status:'peaceful-postgame',actors:[],rng:712,draws:0});});

test('unintegrated candidate configuration matches the pure module decisions',async()=>{
 const {readFileSync}=await import('node:fs');const c=JSON.parse(readFileSync(new URL('../content/balance/raid_pressure_candidate.json',import.meta.url)));
 assert.equal(c.ema.alpha,C.emaAlpha);assert.equal(c.reference.spacing,C.referenceSpacing);assert.equal(c.reference.coneRadians,C.referenceConeRadians);assert.equal(c.reference.peripheralWeight,C.peripheralWeight);assert.equal(c.q.meanMultiplier,C.qMeanMultiplier);assert.equal(c.waveActiveLimit,C.activeWaveLimit);assert.deepEqual(c.composition.final,raidCompositionWeights(1,ids));
 for(let i=0;i<ids.length;i++){const spec=raidSpeciesPressure(ids[i],0);assert.equal(spec.cropDamage,c.speciesCropBaseDamage[i]);assert.equal(spec.attackRadius,c.speciesBaseAttackRadii[i]);}
});

test('full-range hit roll is independent of remaining Q after composition is fixed',()=>{
 for(const p of [0,.2,.5,1])for(const seed of [1,712,2026,4294967295]){
  const result=selectBudgetedRaid({night:6,pressure:p,unlocked:ids,rng:seed});let rng=seed;
  const draw=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;rng>>>=0;return rng/4294967296;};
  for(const actor of result.actors){draw();const spec=raidSpeciesPressure(actor.species,p),r=draw();assert.equal(actor.hits,spec.minHits+Math.floor(r*(spec.maxHits-spec.minHits+1)));}
  assert.equal(result.rng,rng);assert.ok(result.plan.maximumProduct<=result.plan.q+1e-9);
 }
});
test('composition adjusts before RNG under maximum shares, finite swaps, exact N and transparent Q floor',()=>{
 for(let i=0;i<=100;i++)for(const unlocked of [ids.slice(0,1),ids.slice(0,2),ids]){
  const p=i/100,n=Math.round(4+30*p),plan=planRaidProductComposition(n,p,unlocked);
  assert.equal(plan.status,'planned');assert.equal(Object.values(plan.counts).reduce((a,b)=>a+b,0),n);assert.ok(plan.maximumProduct<=plan.q+1e-9);assert.ok(plan.adjustments.length<=n*ids.length);
  for(const id of ids)assert.ok(plan.counts[id]<=plan.caps[id]);
  assert.equal(plan.q,Math.max(plan.requestedQ,plan.minimumLegalWorstCase));
 }
 const low=planRaidProductComposition(4,0,ids);assert.equal(low.requestedQ,18);assert.equal(low.minimumLegalWorstCase,16);assert.equal(low.q,18);assert.equal(low.qRaisedForRangeSafety,false);
});
test('strict config/source contracts reject unknown keys, drift, malformed numbers and unreviewed costs',async()=>{
 const {readFileSync}=await import('node:fs'),original=JSON.parse(readFileSync(new URL('../content/balance/raid_pressure_candidate.json',import.meta.url)));
 assert.equal(validateRaidPressureConfiguration(original),original);assert.equal(validateRaidPressureRuntimeConfig(C),C);assert.equal(validateRaidPressureSource(B),B);
 for(const mutate of [c=>c.pressure.dayWeight=.5,c=>c.q.meanMultiplier=.5,c=>c.reference.spacing=0,c=>c.unknown=true,c=>c.ema.alpha=NaN,c=>c.structureRounding='none']){const c=structuredClone(original);mutate(c);assert.throws(()=>validateRaidPressureConfiguration(c));}
 for(const mutate of [b=>b.work_center.cost=600,b=>b.workers.young_wage=39,b=>b.crops[0].plant_cost=4,b=>b.crops[0].base_harvest_value=33,b=>b.animals[0].hit_budget_max=5,b=>b.animals[0].structure_hit_damage=10]){const b=structuredClone(B);mutate(b);assert.throws(()=>validateRaidPressureSource(b));}
 assert.throws(()=>validateRaidPressureRuntimeConfig({...C,qMeanMultiplier:.5}));assert.throws(()=>validateRaidPressureRuntimeConfig({...C,unknown:1}));
});

test('candidate-3 count warmup and joint hit progression match the selected native-pressure preflight',()=>{
 assert.equal(raidAnimalCount(6,1),8);assert.equal(raidAnimalCount(7,1),10);assert.equal(raidAnimalCount(8,1),12);assert.equal(raidAnimalCount(100,1),34);
 assert.equal(raidAnimalCount(14,.3227955420253256),21);
 for(let d=1;d<=5;d++)assert.equal(raidAnimalCount(d,1),1);
 const counts=raidCompositionCounts(21,.3227955420253256,ids.slice(0,4)),envelope=raidProductEnvelope(counts,.3227955420253256);
 assert.equal(envelope.mean,129.5);assert(envelope.max<=envelope.q);
 for(const config of [{...C,countPower:0},{...C,introCountStart:-1},{...C,introCountRise:NaN}])assert.throws(()=>raidAnimalCount(6,.5,config));
 assert.throws(()=>raidSpeciesPressure('warthog',.5,B,{...C,hitPressureSteps:NaN}));
});
