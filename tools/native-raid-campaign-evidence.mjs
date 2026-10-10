// Read-only per-incursion facts. Does not assign damage, targets or exposure.
import assert from 'node:assert/strict';
import {animalSpec,cropSpec} from '../src/simulation/rules.js';
export function createNativeRaidCampaignEvidence(initial){
 let lastEvent=initial.events.at(-1)?.id,lastElapsed=initial.elapsed,current=null,coverageLost=false,previousLiving=initial.plants.filter(p=>p.alive).length;
 const raids=[],issues=[],observedEvents=new Set();
 function issue(reason){coverageLost=true;issues.push(reason);}
 function begin(s,events,event){
  const facts=event?.raidFacts,cohort=facts?.actors??s.raid?.animals;
  if(!cohort){issue('RaidSpawned and exit occurred without an observable cohort');return;}
  const r={id:facts?.id??s.raid.id,day:facts?.day??s.day,daytime:!!(facts?.daytime??s.raid.daytime),spawnElapsed:facts?.elapsed??null,exposureStatus:facts?'exact-native-spawn':'observation-interval',observedAt:s.elapsed,ended:false,species:{},cropHits:0,cropsDestroyed:0,cropReplacementCost:0,lostBaseHarvestValue:0,structureHits:0,wallHits:0,centerHits:0,structureHpLost:0,wallHpLost:0,structuresRuined:[],shieldContacts:0,misses:0,logicalContacts:0,workerHits:0,actors:[]};
  for(const a of cohort){
   const spec=animalSpec(a.species),v=r.species[a.species]??={generated:0,initialHitBudget:0,maximumStructureDamage:0,contacts:0,misses:0,cropHits:0,structureHits:0,shieldContacts:0,workerHits:0};
   r.actors.push({id:a.id,species:a.species,spawn:structuredClone(a.spawn),exit:structuredClone(a.exit)});
   v.generated++;v.initialHitBudget+=a.hitsRemaining;
   assert.ok(Number.isSafeInteger(a.hitsRemaining)&&a.hitsRemaining>=0);
   v.maximumStructureDamage+=a.hitsRemaining*spec.structure_hit_damage;
  }
  // tick() may complete contacts between spawn and this observation. Add only
  // native budget-consumption facts in this same spawn window, by species.
  for(const e of (facts?[]:events))if(['AnimalLogicalHit','AnimalLogicalMiss','WorkerHit'].includes(e.type)){
   const species=e.species??r.actors.find(a=>a.id===e.animalId)?.species,v=r.species[species];if(!v){issue('Contact species missing from spawned cohort');continue;}
   v.initialHitBudget++;v.maximumStructureDamage+=animalSpec(species).structure_hit_damage;
  }
  r.livingBeforeSpawnObservation=previousLiving;r.livingAfterSpawnObservation=s.plants.filter(p=>p.alive).length;
  r.exposedLivingAtSpawn=facts?.exposedLiving??null;r.exposedWoundedAtSpawn=facts?.exposedWounded??null;
  r.initialCropDamage=s.plants.filter(p=>p.alive&&(p.attackHits??0)>0).length;
  raids.push(r);current=r;
 }
 function observe(s){
  assert.ok(s.elapsed>=lastElapsed,'Raid evidence cannot rewind time');
  const index=lastEvent?s.events.findIndex(e=>e.id===lastEvent):-1;
  if(lastEvent&&index<0)issue('Lost event window');
  const events=s.events.slice(index+1).filter(e=>!observedEvents.has(e.id));
  let spawnAt=events.findIndex(e=>e.type==='RaidSpawned');
  if(events.filter(e=>e.type==='RaidSpawned').length>1)issue('Multiple unobserved cohorts in one observation');
  if(spawnAt>=0){if(current&&!current.ended)issue('Spawn observed before previous raid ended');begin(s,events.slice(spawnAt+1),events[spawnAt]);}
  let pendingCrop=0,pendingStructure=0;
  for(const e of events){
   observedEvents.add(e.id);
   if(e.type==='RaidSpawned')continue;
   if(!current){if(['CropHit','StructureHit','AnimalLogicalHit','AnimalLogicalMiss','RaidEnded'].includes(e.type))issue('Raid fact without captured cohort');continue;}
   const r=current;
   if(e.type==='CropHit'){r.cropHits++;pendingCrop++;}
   if(e.type==='CropDestroyed'){
    const p=s.plants.find(p=>p.id===e.targetId);if(!p){issue('Destroyed plant identity missing');continue;}
    assert.equal(p.alive,false);r.cropsDestroyed++;r.cropReplacementCost+=cropSpec(p.species).plant_cost;r.lostBaseHarvestValue+=cropSpec(p.species).base_harvest_value;
   }
   if(e.type==='StructureHit'){
    const hit=e.structureHit;if(!hit){issue('Structure hit lacks HP receipt');continue;}
    const loss=hit.previousHp-hit.hp;assert.ok(Number.isFinite(loss)&&loss>=0);
    r.structureHits++;r.structureHpLost+=loss;pendingStructure++;
    if(hit.kind==='wall'){r.wallHits++;r.wallHpLost+=loss;}else if(hit.kind==='center')r.centerHits++;
   }
   if(e.type==='WorkerHit'){const species=r.actors.find(a=>a.id===e.animalId)?.species,v=r.species[species];if(!v)issue('Worker hit actor missing');else{r.workerHits++;v.workerHits++;}}
   if(e.type==='StructureRuined')r.structuresRuined.push(e.targetId);
   if(e.type==='AnimalLogicalHit'||e.type==='AnimalLogicalMiss'){
    const v=r.species[e.species];if(!v){issue('Logical contact species absent');continue;}
    if(e.type==='AnimalLogicalMiss'){r.misses++;v.misses++;}
    else {
     r.logicalContacts++;v.contacts++;
     if(e.presentation?.shield){r.shieldContacts++;v.shieldContacts++;}
     else if(pendingCrop){v.cropHits++;pendingCrop--;}
     else if(pendingStructure){v.structureHits++;pendingStructure--;}
     else issue('Unshielded logical contact lacks native damage fact');
    }
   }
   if(e.type==='RaidEnded'){r.ended=true;r.endedAt=s.elapsed;current=null;}
  }
  if(pendingCrop||pendingStructure)issue('Native damage lacks associated logical contact in observation window');
  lastEvent=s.events.at(-1)?.id??lastEvent;lastElapsed=s.elapsed;previousLiving=s.plants.filter(p=>p.alive).length;
 }
 if(initial.raid)issue('Observer created during active raid; initial cohort budget unknown');
 function report(s){observe(s);for(const r of raids)for(const v of Object.values(r.species)){v.observedBudgetConsumed=v.contacts+v.misses+v.workerHits;v.unconsumedOrUnobservedBudget=v.initialHitBudget-v.observedBudgetConsumed;assert.ok(v.unconsumedOrUnobservedBudget>=0,'Observed contacts exceed native initial budget');}return structuredClone({status:coverageLost?'incomplete':'verified',coverageLost,issues,raids,scope:'Generated species and actual native hit budgets; native CropHit/StructureHit and HP receipts, shields and misses. Wall contacts are measured interception, not a guaranteed protection percentage. Replacement costs and lost base value are diagnostics, never ledger expenses or projected income. RaidSpawned raidFacts provide exact native spawn budgets and exposure when available; legacy living snapshots only bracket an observation interval. Initial wound snapshot is after the spawn tick, not an exact pre-attack wound census. Completed observer coverage is not proof of legal spawn geometry or rendered visibility.'});}
 return {observe,report};
}
