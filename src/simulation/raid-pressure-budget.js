// Pure, unintegrated candidate. No clock, state, command or damage mutations.
import {BALANCE as B} from './balance.js';
export const RAID_PRESSURE_CANDIDATE=Object.freeze({version:1,emaAlpha:1/3,referenceSpacing:1.5,referenceConeRadians:Math.PI/2,peripheralWeight:.5,qMeanMultiplier:1,activeWaveLimit:16});
const IDS=['warthog','hyena','buffalo','lion','rhino'],SHARES=[.25,.28,.23,.16,.08],CROP=[1,1,2,2,3],RADII=[.7,1.2,2,1.6,2.8];
const finite=(v,label)=>{if(!Number.isFinite(v)||v<0)throw Error('Invalid '+label);return v;};
const day=(d)=>{if(!Number.isSafeInteger(d)||d<1)throw Error('Invalid night');return d;};
const pressure=(p)=>{if(!Number.isFinite(p)||p<0||p>1)throw Error('Invalid pressure');return p;};
export function agriculturalRaidValue(plants,balance=B){
 let value=0;for(const p of plants)if(p.alive){const crop=balance.crops.find(c=>c.id===p.species);if(!crop)throw Error('Unknown crop');value+=crop.base_harvest_value;}
 return finite(value,'agricultural value');
}
export function validateRaidPressureMemory(memory){
 if(!memory||memory.version!==1)throw Error('Invalid pressure memory');day(memory.lastDay);finite(memory.ema,'EMA');finite(memory.sample,'sample');return memory;
}
export function updateRaidPressureMemory(previous,d,value,config=RAID_PRESSURE_CANDIDATE){
 day(d);finite(value,'agricultural value');if(!(config.emaAlpha>0&&config.emaAlpha<=1))throw Error('Invalid EMA alpha');
 if(previous){validateRaidPressureMemory(previous);if(d<previous.lastDay)throw Error('Cannot rewind pressure EMA');
  if(d===previous.lastDay)return {...previous};
  if(d!==previous.lastDay+1)throw Error('Missing night samples must not be invented');
 }
 return {version:1,lastDay:d,sample:value,ema:previous?previous.ema+config.emaAlpha*(value-previous.ema):value};
}
export function raidPressure(d,value){
 day(d);finite(value,'agricultural value');return Math.max(0,Math.min(1,.45*(d-1)/99+.55*Math.log1p(value/1000)/Math.log(26)));
}
export function raidPressureSummary(d,value,memory){
 day(d);finite(value,'agricultural value');validateRaidPressureMemory(memory);if(memory.lastDay!==d)throw Error('Plan requires current night EMA sample');
 // EMA is idempotent; caller owns/persists a selected plan, never rerolls it.
 const effectiveValue=Math.max(value,memory.ema),p=raidPressure(d,effectiveValue);
 return {night:d,observedValue:value,capturedValue:memory.sample,effectiveValue,pressure:p,targetAnimals:d<=5?1:Math.round(4+30*p),areaCap:1+Math.floor(6*p),introductory:d<=5};
}
export function raidSpeciesPressure(id,p,balance=B){
 pressure(p);const i=IDS.indexOf(id),a=balance.animals.find(a=>a.id===id);if(i<0||!a)throw Error('Unknown raid species');const extra=Math.floor(2*p);
 return {id,minHits:a.hit_budget_min+extra,maxHits:a.hit_budget_max+extra,cropDamage:CROP[i]+Math.floor(1.5*p),structureDamage:a.structure_hit_damage*(1+.5*p),attackRadius:RADII[i]*(1+.3*p),areaCap:1+Math.floor(6*p)};
}
export function raidCompositionWeights(p,unlocked){
 pressure(p);if(!Array.isArray(unlocked)||!unlocked.length||unlocked.some(id=>!IDS.includes(id)))throw Error('Invalid unlocked species');
 const values=IDS.map((id,i)=>unlocked.includes(id)?(i===0?1-p+p*SHARES[i]:p*SHARES[i]):0),total=values.reduce((n,v)=>n+v,0);
 if(!total)throw Error('Early weak mixture needs unlocked warthog');return values.map(v=>v/total);
}
export function raidCompositionCounts(n,p,unlocked){
 if(!Number.isSafeInteger(n)||n<1||n>34)throw Error('Invalid animal count');const weights=raidCompositionWeights(p,unlocked),counts=weights.map(w=>Math.floor(w*n));
 const fractions=weights.map((w,i)=>({i,remainder:w*n-counts[i]})).sort((a,b)=>b.remainder-a.remainder||a.i-b.i);
 for(let left=n-counts.reduce((a,b)=>a+b,0),i=0;i<left;i++)counts[fractions[i].i]++;
 return Object.fromEntries(IDS.map((id,i)=>[id,counts[i]]));
}
// Reference crop centres on a1.5m lattice in a90-degree forward cone.
// Central crop contributes1; reachable peripheral centres contribute .5.
// This is a geometric envelope, never a runtime list of damaged plants.
export function referenceRaidArea(spec,config=RAID_PRESSURE_CANDIDATE){
 finite(config.referenceSpacing,'spacing');if(!config.referenceSpacing)throw Error('Zero spacing');
 if(!(config.referenceConeRadians>0&&config.referenceConeRadians<=Math.PI*2))throw Error('Invalid cone');
 if(!(config.peripheralWeight>=0&&config.peripheralWeight<=1))throw Error('Invalid peripheral weight');
 const r=finite(spec.attackRadius,'radius'),points=[];if(r>4||!Number.isSafeInteger(spec.areaCap)||spec.areaCap<1||spec.areaCap>7)throw Error('Unbounded reference geometry');
 const extent=Math.ceil(r/config.referenceSpacing),angle=config.referenceConeRadians/2;
 for(let x=-extent;x<=extent;x++)for(let z=-extent;z<=extent;z++){
  if(!x&&!z)continue;const dx=x*config.referenceSpacing,dz=z*config.referenceSpacing,d=Math.hypot(dx,dz);
  if(d<=r+1e-12&&Math.abs(Math.atan2(dx,dz))<=angle+1e-12)points.push({x:dx,z:dz,distance:d});
 }
 points.sort((a,b)=>a.distance-b.distance||a.x-b.x||a.z-b.z);const selected=points.slice(0,spec.areaCap-1);
 return {effective:1+selected.length*config.peripheralWeight,central:1,peripheral:selected.length,points:selected,scope:'Directional reference lattice only; actual occlusion/Shield/spacing require physical enumeration'};
}
export function raidProductEnvelope(counts,p,config=RAID_PRESSURE_CANDIDATE,balance=B){
 const rows=IDS.map(id=>{const count=counts[id]??0;if(!Number.isSafeInteger(count)||count<0)throw Error('Invalid composition count');const s=raidSpeciesPressure(id,p,balance),area=referenceRaidArea(s,config);
  return {...s,count,area:area.effective,minProduct:count*s.minHits*s.cropDamage*area.effective,meanProduct:count*(s.minHits+s.maxHits)/2*s.cropDamage*area.effective,maxProduct:count*s.maxHits*s.cropDamage*area.effective,minStructureProduct:count*s.minHits*s.structureDamage,meanStructureProduct:count*(s.minHits+s.maxHits)/2*s.structureDamage,maxStructureProduct:count*s.maxHits*s.structureDamage};});
 const sum=k=>rows.reduce((n,r)=>n+r[k],0),mean=sum('meanProduct'),min=sum('minProduct');
 if(!(config.qMeanMultiplier>0&&config.qMeanMultiplier<=2))throw Error('Invalid Q multiplier');
 const q=Math.floor(mean*config.qMeanMultiplier*2)/2;
 return {rows,min,mean,max:sum('maxProduct'),structure:{min:sum('minStructureProduct'),mean:sum('meanStructureProduct'),max:sum('maxStructureProduct'),scope:'Alternative all-hits-on-structures envelope, not additive with agricultural damage'},q,feasible:q>=min,units:'Reference agricultural HP-points; no loss fraction or ledger debit'};
}
function draw(rng){if(!Number.isInteger(rng)||rng<0||rng>4294967295)throw Error('Invalid RNG');rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return {rng:rng>>>0,value:(rng>>>0)/4294967296};}
export function selectBudgetedRaid({night,pressure:p,unlocked,rng,postgame=false,config=RAID_PRESSURE_CANDIDATE,balance=B}){
 day(night);pressure(p);
 if(!Number.isInteger(rng)||rng<0||rng>4294967295)throw Error('Invalid RNG');
 if(postgame)return {status:'peaceful-postgame',actors:[],rng,draws:0};
 if(!Number.isSafeInteger(config.activeWaveLimit)||config.activeWaveLimit<1||config.activeWaveLimit>16)throw Error('Invalid physical wave limit');
 if(night<=5){const a=balance.animals[night-1];return {introductory:true,actors:[{species:a.id,hits:a.hit_budget_min}],rng,draws:0,scope:'Existing introduction min-hits and actor; runtime intro cap remains authoritative'};}
 const targetAnimals=Math.round(4+30*p),counts=raidCompositionCounts(targetAnimals,p,unlocked),envelope=raidProductEnvelope(counts,p,config,balance);
 if(!envelope.feasible)return {status:'infeasible-budget',targetAnimals,counts,envelope,rng,draws:0,actors:[]};
 const remaining={...counts},actors=[];let budget=envelope.q,minimum=envelope.min,draws=0;
 for(let left=targetAnimals;left>0;left--){
  let r=draw(rng);rng=r.rng;draws++;let rank=Math.floor(r.value*left),row;
  for(const candidate of envelope.rows){if(rank<remaining[candidate.id]){row=candidate;break;}rank-=remaining[candidate.id];}
  const unit=row.cropDamage*row.area,reserved=minimum-row.minHits*unit,maxHits=Math.min(row.maxHits,Math.floor((budget-reserved+1e-9)/unit));
  if(maxHits<row.minHits)throw Error('Budget allocation invariant');
  r=draw(rng);rng=r.rng;draws++;const hits=row.minHits+Math.floor(r.value*(maxHits-row.minHits+1));
  actors.push({species:row.id,hits,cropDamage:row.cropDamage,structureDamage:row.structureDamage,attackRadius:row.attackRadius,areaCap:row.areaCap,referenceArea:row.area,product:hits*unit});
  remaining[row.id]--;budget-=hits*unit;minimum=reserved;
 }
 return {status:'selected',introductory:false,targetAnimals,counts,envelope,actors,rng,draws,spentProduct:envelope.q-budget,remainingProduct:budget,waves:Array.from({length:Math.ceil(actors.length/config.activeWaveLimit)},(_,i)=>actors.slice(i*config.activeWaveLimit,(i+1)*config.activeWaveLimit)),scope:'Descriptor selection only; waves are not spawned and no physical damage has occurred'};
}
