import assert from 'node:assert/strict';

export const STRIKE_EVENT_TYPES=Object.freeze(['AnimalLogicalHit','AnimalLogicalMiss','WorkerHit','WorkerIncapacitated']);
// Native allocation facts are emitted before any movement or worker encounter.
// Unknown/lost coverage is rejected, never inferred from a later actor snapshot.
export function auditHordeStrikeEvidence(report){
 const seen=new Set(),spawns=new Map(),consumers=new Map(),counts=Object.fromEntries(STRIKE_EVENT_TYPES.map(k=>[k,0]));
 for(const e of report.raidFacts){
  assert.equal(typeof e.id,'string');assert.ok(!seen.has(e.id),'Duplicate native raid fact');seen.add(e.id);
  if(e.type==='RaidSpawned'){
   assert.equal(typeof e.raidId,'string');assert.ok(!spawns.has(e.raidId),'Duplicate raid allocation');assert.ok(Array.isArray(e.animals)&&e.animals.length>0);
   const actors=new Map();for(const a of e.animals){assert.equal(typeof a.id,'string');assert.equal(typeof a.species,'string');assert.ok(Number.isSafeInteger(a.hitsAllocated)&&a.hitsAllocated>0,'Unknown or zero allocated budget');assert.ok(!actors.has(a.id),'Duplicate allocated actor');actors.set(a.id,a);}
   spawns.set(e.raidId,actors);
  }else if(STRIKE_EVENT_TYPES.includes(e.type)){
   assert.equal(typeof e.raidId,'string');assert.equal(typeof e.animalId,'string');assert.ok(spawns.get(e.raidId)?.has(e.animalId),'Strike without native allocation');
   if(e.type.startsWith('AnimalLogical'))assert.equal(typeof e.attackId,'string');
   else assert.equal(typeof e.targetId,'string');
   const key=`${e.raidId}/${e.animalId}`;const list=consumers.get(key)??[];list.push(e);consumers.set(key,list);counts[e.type]++;
  }
 }
 assert.equal(spawns.size,report.counts.RaidSpawned??0,'Spawn event coverage mismatch');
 for(const type of STRIKE_EVENT_TYPES)assert.equal(counts[type],report.counts[type]??0,`Consumer count mismatch: ${type}`);
 assert.equal(report.raids.length,spawns.size,'Missing observed raid');
 const raidIds=new Set(),rows=[];let spentStrikes=0;
 for(const r of report.raids){
  assert.ok(!raidIds.has(r.id),'Duplicate observed raid');raidIds.add(r.id);const allocated=spawns.get(r.id);assert.ok(allocated,'Observed raid without allocation');
  const terminal=r.terminalActors??r.lastAnimals;assert.ok(Array.isArray(terminal)&&terminal.length===allocated.size,'Missing remaining actor budgets');
  const ids=new Set(),actors=[];for(const a of terminal){
   assert.ok(!ids.has(a.id),'Duplicate terminal actor');ids.add(a.id);const initial=allocated.get(a.id);assert.ok(initial,'Unknown remaining actor');assert.equal(a.species,initial.species);
   assert.ok(Number.isSafeInteger(a.hitsRemaining)&&a.hitsRemaining>=0&&a.hitsRemaining<=initial.hitsAllocated,'Malformed remaining budget');
   const facts=consumers.get(`${r.id}/${a.id}`)??[],spent=initial.hitsAllocated-a.hitsRemaining;
   assert.equal(spent,facts.length,`Actual spent strikes mismatch for ${r.id}/${a.id}`);
   const attacks=new Set();for(const e of facts)if(e.attackId){assert.ok(!attacks.has(e.attackId),'One committed attack consumed twice');attacks.add(e.attackId);}
   actors.push({id:a.id,species:a.species,hitsAllocated:initial.hitsAllocated,hitsRemaining:a.hitsRemaining,spent,events:facts.map(e=>({id:e.id,type:e.type,targetId:e.targetId,...(e.attackId?{attackId:e.attackId}:{})}))});spentStrikes+=spent;
  }
  rows.push({raidId:r.id,actors});
 }
 return {spentStrikes,counts,raids:rows,strikeEvidenceMatches:true,scope:'Exact native allocation minus remaining budgets equals four exclusive consumer event types per actor and raid; no gameplay commands or inferred missing events'};
}
