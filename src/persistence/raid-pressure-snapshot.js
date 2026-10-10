import {BALANCE as B} from '../simulation/balance.js';
import {threatTier} from '../simulation/rules.js';
import {validateRaidPressureMemory,raidPressureSummary,raidSpeciesPressure,referenceRaidArea,planRaidProductComposition,raidPressureCandidateForVersion} from '../simulation/raid-pressure-budget.js';
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function validatePressureSnapshot(s){
 const memory=s.raidPressureMemory;
 if(memory){validateRaidPressureMemory(memory);if(memory.lastDay>s.day)throw Error('Future pressure sample');}
 const p=s.nightPlan;if(p?.pressureVersion===undefined){if(s.raid?.waves)throw Error('Wave without pressure plan');return;}
 if(p.pressureVersion!==1||p.night!==s.day||!Number.isFinite(p.at)||p.at<323||p.at>=548||typeof p.done!=='boolean'||!Array.isArray(p.waves)||!Array.isArray(p.actors))throw Error('Invalid pressure night plan');
 if(p.peaceful){if(!s.postgame||p.group.length||p.actors.length||p.waves.length||s.raid)throw Error('Invalid peaceful plan');return;}
 if(s.postgame||!memory)throw Error('Invalid active pressure memory');
 const f=p.pressureFacts,config=raidPressureCandidateForVersion(f?.candidateVersion),summary=raidPressureSummary(p.night,f.observedValue,memory);
 for(const [k,v] of Object.entries(summary))if(f[k]!==v)throw Error('Pressure summary mismatch');
 const actors=p.waves.flat();
 if(p.waves.some(w=>!Array.isArray(w)||!w.length||w.length>16)||actors.length!==summary.targetAnimals||!equal(p.actors,p.waves[0])||!equal(p.group,p.actors.map(a=>a.species)))throw Error('Invalid pressure cohort');
 const unlocked=threatTier(summary.effectiveValue).unlocked_species;let potential=0;
 for(const a of actors){
  if(summary.introductory){const native=B.animals[p.night-1];if(a.species!==native.id||a.hits!==native.hit_budget_min||a.damageProfile!==undefined)throw Error('Invalid introduction');potential+=a.hits;}
  else {
   const spec=raidSpeciesPressure(a.species,summary.pressure),profile={cropDamage:spec.cropDamage,structureDamage:spec.structureDamage,attackRadius:spec.attackRadius,areaCap:spec.areaCap,peripheralWeight:.5};
   if(!unlocked.includes(a.species)||!Number.isSafeInteger(a.hits)||a.hits<spec.minHits||a.hits>spec.maxHits||!equal(a.damageProfile,profile))throw Error('Invalid pressure actor');
   potential+=a.hits*spec.cropDamage*referenceRaidArea(spec,config).effective;
  }
 }
 const budget=summary.introductory?potential:planRaidProductComposition(actors.length,summary.pressure,unlocked,config).q;
 if(f.budget!==budget||Math.abs(f.potential-potential)>1e-9||potential>budget+1e-9)throw Error('Invalid pressure product');
 const r=s.raid;if(!r?.waves)return;
 if(!equal(r.waves,p.waves)||!Number.isSafeInteger(r.waveIndex)||r.waveIndex<0||r.waveIndex>=p.waves.length||!equal(r.pressureFacts,p.pressureFacts))throw Error('Invalid active waves');
 const expected=r.waves.slice(0,r.waveIndex+1).flat();
 if(r.animals.length!==expected.length)throw Error('Missing or extra wave actor');
 for(let i=0;i<expected.length;i++){
  const a=r.animals[i],d=expected[i],prior=i<expected.length-r.waves[r.waveIndex].length;
  if(a.species!==d.species||!Number.isSafeInteger(a.hitsRemaining)||a.hitsRemaining<0||a.hitsRemaining>d.hits||!equal(a.damageProfile,d.damageProfile)||prior&&a.status!=='gone')throw Error('Invalid native wave actor');
 }
 if(r.pendingWavePlan){const next=r.pendingWavePlan,index=r.waveIndex+1;
  if(index>=r.waves.length||next.index!==index||next.done!==false||!Number.isFinite(next.at)||next.at<0||next.at>600||r.animals.some(a=>a.status!=='gone')||!equal(next.actors,r.waves[index])||!equal(next.group,next.actors.map(a=>a.species)))throw Error('Invalid pending wave');
 }
}
