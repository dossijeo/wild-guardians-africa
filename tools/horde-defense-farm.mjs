// A player strategy using only ordinary commands on native terrain. No overrides
// to balances, growth, task order, worker movement, RNG or animal damage/budgets.
import {createOpeningWorld} from './check_opening.mjs';
import * as Game from '../src/simulation/game.js';
import {cropSpec,permission,operational} from '../src/simulation/rules.js';
import {numberOf} from '../src/simulation/money.js';
import {PROFILES,hiringCost} from '../src/simulation/workforce.js';
import {isMature} from '../src/simulation/crops.js';
import {centerServicePoint} from '../src/world/centers.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {nativeCameraPose} from '../src/rendering/terrain-camera.js';
import {createRepairSettlementEvidence} from './repair-settlement-evidence.mjs';
import {HordeEntryDriver} from './horde-entry-driver.mjs';
import {requestComparisonCenterRepairs} from './horde-defense-actions.mjs';
import {createFarmDefensePolicy} from './farm-defense-policy.mjs';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
// Separate comparison scenario. Productive policy copied from the immutable original;
// only explicit defensive actions and asynchronous presentation driver differ.
export async function simulateHordeDefenseFarm({days=100,profile='olderFemale',mixed=false,middayHiring=false,plantsPerWorker=12,arm='responsible',reserveLabourGrowth=true,reserveMaintenance=true,burstPlanting=false,cameraEntry=true,onDay,onTick,onDecision,...world}={}){
 if(!Number.isSafeInteger(plantsPerWorker)||plantsPerWorker<1)throw new Error('Plants per worker must be a positive integer');
 if(!['responsible','neglect'].includes(arm))throw Error('Unknown comparison arm');
 const opening=createOpeningWorld(world),nav=opening.nav;let s=opening.s,sequence=0;
 const settlement=createRepairSettlementEvidence(s),commands=[],raidFacts=[],decisions=[],raids=new Map();let raidActors=null;
 const defenseEnabled=arm==='responsible';
 const worker=PROFILES.find(p=>p.id===profile);if(!worker)throw new Error('Unknown worker profile');
 const driver=new HordeEntryDriver(nav);
 try{
 const defense=defenseEnabled?createFarmDefensePolicy():null;
 const command=kind=>{const id=`intensive-${kind}-${sequence++}`;commands.push({id,kind,day:s.day,time:s.time,elapsed:s.elapsed,balance:numberOf(s.ledger.balance)});return id;};const center=s.structures[0],origin=centerServicePoint(center,s,.8);
 if(cameraEntry){
  const pose=nativeCameraPose(nav.field,[center.x,0,center.z],nav.field.canyon?0:.5,nav.field.canyon?1.18:1.16,nav.field.canyon?34:38);
  nav.setRaidView({x:pose.eye[0],z:pose.eye[2]},center);nav.setActiveBounds(activeChunkRegion({x:pose.eye[0],z:pose.eye[2]}).bounds);
 }
 const bounds=activeChunkRegion(center).bounds,grid=1.5,candidates=[];
 for(let z=Math.ceil(bounds[1]/grid)*grid;z<=bounds[3];z+=grid)for(let x=Math.ceil(bounds[0]/grid)*grid;x<=bounds[2];x+=grid)candidates.push({x,z});
 candidates.sort((a,b)=>distance(a,origin)-distance(b,origin)||a.z-b.z||a.x-b.x);
 const plots=[];let candidateIndex=0,nextWages=worker.wage,staff=1,plantedSequence=0;
 const daily=[],counts={},seen=new Set(),savedRaids=new Set(),additionalHiring={count:0,cost:0};let maximumLiving=0,reloads=0;
 const collect=()=>{
  settlement.observe(s);
  if(s.raid){raidActors=s.raid.animals;let row=raids.get(s.raid.id);if(!row){row={id:s.raid.id,day:s.day,spawnElapsed:s.elapsed,species:raidActors.map(a=>a.species),initialHitBudgets:raidActors.map(a=>a.hitsRemaining),maxOwners:0,terminalActors:null};raids.set(s.raid.id,row);}
   row.maxOwners=Math.max(row.maxOwners,Object.keys(s.raid.reservations??{}).length);
   for(const owner of Object.values(s.raid.reservations??{}))if(raidActors.filter(a=>a.id===owner&&a.reservation).length!==1)throw Error('Reservation owner identity mismatch');
   for(const reservation of new Set(raidActors.map(a=>a.reservation).filter(Boolean)))if(raidActors.filter(a=>a.reservation===reservation).length!==1)throw Error('Exclusive reservation broken');
   row.lastAnimals=raidActors.map(a=>({id:a.id,species:a.species,x:a.x,z:a.z,status:a.status,reservation:a.reservation,targetId:a.targetId,hitsRemaining:a.hitsRemaining,exit:a.exit}));
  }else if(raidActors){const row=[...raids.values()].at(-1);row.terminalActors=raidActors.map(a=>({id:a.id,species:a.species,status:a.status,hitsRemaining:a.hitsRemaining,x:a.x,z:a.z,exit:a.exit,exitDistance:Math.hypot(a.x-a.exit.x,a.z-a.exit.z)}));row.endElapsed=s.elapsed;raidActors=null;}
  for(const e of s.events)if(!seen.has(e.id)){seen.add(e.id);counts[e.type]=(counts[e.type]??0)+1;if(['RaidSpawned','RaidEnded','AnimalLogicalHit','AnimalLogicalMiss','AnimalRetreating','CropHit','CropDestroyed','StructureHit','RepairApplied'].includes(e.type))raidFacts.push(structuredClone(e));if(e.type==='HiringConfirmed'&&e.additional){additionalHiring.count+=e.count;additionalHiring.cost+=e.cost;}}
 };
 const choosePlot=()=>{
  const occupied=new Set(s.plants.filter(p=>p.alive).map(p=>`${p.x},${p.z}`));
  const old=plots.find(p=>!occupied.has(`${p.x},${p.z}`));if(old)return old;
  while(candidateIndex<candidates.length){
   const p=candidates[candidateIndex++];
   if(nav.placement(p.x,p.z,.4).valid&&nav.path(origin,p,.28,null,true)&&nav.path(p,origin,.28,null,true)){plots.push(p);return p;}
  }
  return null;
 };
 const nextSpecies=()=>mixed&&s.day>=10&&numberOf(s.ledger.balance)>1000?['mijo','girasol','sorgo','maiz','batata','algodon','yuca','platano'][plantedSequence%8]:'mijo';
 const labourReserve=(additional=0)=>reserveLabourGrowth?Math.max(nextWages,Math.ceil((s.plants.filter(p=>p.alive).length+additional)/plantsPerWorker)*worker.wage):nextWages;
 const maintenanceReserve=()=>reserveMaintenance?Math.max(100,...s.structures.filter(operational).map(c=>numberOf(Game.repairCost(c)))):0;
 const plant=()=>{
  const species=nextSpecies();if(numberOf(s.ledger.balance)<labourReserve(1)+maintenanceReserve()+(defense?.reserve(s)??0)+cropSpec(species).plant_cost)return false;
  const p=choosePlot();if(!p)return false;
  Game.plant(s,command('plant'),species,p.x,p.z,nav);plantedSequence++;maximumLiving=Math.max(maximumLiving,s.plants.filter(p=>p.alive).length);return true;
 };
 const canCast=(kind,p)=>permission(s,kind)&&s.cooldowns[kind]===0&&
  !s.spells.some(a=>distance(a,p)<a.radius+Game.spellRadius(kind))&&
  (kind!=='shield'||!s.raid?.animals.some(a=>a.status!=='gone'&&distance(a,p)<a.radius+Game.spellRadius(kind)));
 const cast=(kind,p)=>canCast(kind,p)&&Game.cast(s,command(kind),kind,p.x,p.z,nav);
 const bestMagicPoint=(kind,plants)=>{
  let best=null,score=0;
  for(const p of plants)if(canCast(kind,p)){
   const coverage=plants.reduce((total,q)=>total+Number(distance(p,q)<=Game.spellRadius(kind)),0);
   if(coverage>score){best=p;score=coverage;}
  }
  return best;
 };
 const act=()=>{
  let actions=0;
  if(s.raid){
   const threats=s.raid.animals.filter(a=>a.hitsRemaining>0).map(a=>({a,target:[...s.plants,...s.structures].find(t=>t.id===a.targetId)}));
   threats.sort((a,b)=>Number(b.target?.kind==='center')-Number(a.target?.kind==='center'));
   for(const {a,target} of threats){
    if(target&&distance(a,target)<8&&!Game.spellAt(s,'shield',target)&&cast('shield',target)){actions++;break;}
   }
   return {actions,reason:actions?'active':'incursion'};
  }
  if(!permission(s,'plant'))return {actions,reason:'night'};
  // Optional comparison: ordinary proportional hiring during the workday.
  // The original dawn-only strategy remains the default, including old runs.
  if(middayHiring&&s.time<worker.end-20){
   const desired=Math.max(1,Math.ceil(s.plants.filter(p=>p.alive).length/plantsPerWorker)),extra=desired-staff;
   if(extra>0){
    const selection={[profile]:extra},cost=hiringCost(selection,{time:s.time});
    const tomorrow=Math.max(labourReserve(),desired*worker.wage);
    if(numberOf(s.ledger.balance)>=cost+tomorrow+maintenanceReserve()+(defense?.reserve(s)??0)){
     Game.hireAdditional(s,command('hire'),selection,center.id);staff+=extra;nextWages=staff*worker.wage;actions++;
    }
   }
  }
  // Request repairs before reinvesting, preserving their real FIFO position.
  actions+=requestComparisonCenterRepairs(s,{enabled:defenseEnabled,command,labourReserve,reserveMaintenance});
  if(defense)actions+=defense.act(s,nav,{command,reserve:labourReserve()+maintenanceReserve()});
  const live=s.plants.filter(p=>p.alive);
  for(const kind of ['multiply','growth'])if(s.day>=(kind==='multiply'?5:3)&&s.cooldowns[kind]===0){
   const eligible=live.filter(p=>kind==='multiply'?!p.multiplyHarvest:!isMature(p)&&p.water.every(w=>w.status!=='due'));
   const point=bestMagicPoint(kind,eligible);if(point&&cast(kind,point))actions++;
  }
  // Replant as money arrives. No fixed plot or plant-count limit.
  if(s.time<worker.end-20){if(burstPlanting){while(plant())actions++;}else if(plant())actions++;}
  return {actions,reason:actions?'active':s.time>=worker.end-20?'shift-end':candidateIndex>=candidates.length?'space':'budget'};
 };
 // The mandatory first seed opens hiring normally. Staff is paid immediately.
 plant();Game.openInitialHiring(s);
 const hire=()=>{
  const money=numberOf(s.ledger.balance),living=s.plants.filter(p=>p.alive).length;
  const desired=Math.max(1,Math.ceil((living+(s.day===1?money/10:0))/plantsPerWorker));
  const affordable=reserveLabourGrowth?Math.floor(money/worker.wage):Math.floor((money-5)/(2*worker.wage));
  staff=Math.max(1,Math.min(desired,affordable));
  Game.hire(s,command('hire'),{[profile]:staff});nextWages=staff*worker.wage;
 };
 hire();collect();
 while(s.day<=days&&!s.result){
  const day=s.day,start=s.elapsed,before=numberOf(s.ledger.balance),baseline={...counts},additionalBaseline={...additionalHiring},idle={budget:0,space:0,'shift-end':0,incursion:0,night:0},initialStaff=staff;
  let longestIdle=0,idleRun=0,actions=0;
  while(s.day===day&&!s.result){
   if(s.pauses.length)throw new Error('Unexpected pause: '+s.pauses);
   await driver.advancePresentation(s);
   if(Game.nightEntryPending(s)&&s.time>=600)await driver.waitForEntry(s);
   const decision=act();actions+=decision.actions;
   const dt=s.time<300||s.raid?1:5;
   // Optional evidence only: immutable scalar observations, not navigation or
   // game commands. Values describe the state after this strategy's decision.
   if(onDecision)onDecision(Object.freeze({day:s.day,time:s.time,seconds:dt,
    actions:decision.actions,reason:decision.reason,balance:numberOf(s.ledger.balance),
    seedCost:cropSpec(nextSpecies()).plant_cost,nextWages,
    labourReserve:labourReserve(1),maintenanceReserve:maintenanceReserve(),
    defenseReserve:defense?.reserve(s)??0,living:s.plants.filter(p=>p.alive).length,
    pendingTasks:s.tasks.length}));
   if(!decision.actions){idle[decision.reason]=(idle[decision.reason]??0)+dt;if(s.time<300&&!s.raid){idleRun+=dt;longestIdle=Math.max(longestIdle,idleRun);}}else idleRun=0;
   const observation={balance:numberOf(s.ledger.balance),staff,living:s.plants.filter(p=>p.alive).length,pendingTasks:s.tasks.length,queueKinds:s.tasks.reduce((counts,t)=>{counts[t.kind]=(counts[t.kind]??0)+1;return counts;},{}),workerStates:s.workers.reduce((counts,w)=>{counts[w.status]=(counts[w.status]??0)+1;return counts;},{})};
   const elapsedBefore=s.elapsed,timeBefore=s.time;Game.tick(s,dt,nav);collect();onTick?.(s,nav);
   decisions.push({...observation,day,time:timeBefore,requestedSeconds:dt,simulatedSeconds:s.elapsed-elapsedBefore,actions:decision.actions,reason:decision.reason,daylightSeconds:timeBefore<300?Math.min(s.elapsed-elapsedBefore,300-timeBefore):0});
   await driver.advancePresentation(s);
   if(s.raid&&!savedRaids.has(s.raid.id)){savedRaids.add(s.raid.id);s=deserialize(serialize(s));nav.setState(s);reloads++;raidActors=s.raid?.animals??null;settlement.observe(s);await driver.advancePresentation(s);}
   if(s.elapsed-start>2400)throw new Error(`Unfinished real incursion on day ${day}: ${JSON.stringify(s.raid)}`);
  }
  const row={day,startElapsed:start,endElapsed:s.elapsed,before,money:numberOf(s.ledger.balance),staff:initialStaff,wages:initialStaff*worker.wage,nextLabourReserve:labourReserve(),maintenanceReserve:maintenanceReserve(),pendingTasks:s.tasks.length,planted:(counts.CropPlaced??0)-(baseline.CropPlaced??0),delivered:(counts.CrateDelivered??0)-(baseline.CrateDelivered??0),destroyed:(counts.CropDestroyed??0)-(baseline.CropDestroyed??0),living:s.plants.filter(p=>p.alive).length,centerHp:s.structures.filter(operational).map(c=>c.hp),actions,longestIdle,idle,result:s.result};
  row.additionalStaff=additionalHiring.count-additionalBaseline.count;row.additionalWages=additionalHiring.cost-additionalBaseline.cost;
  daily.push(row);onDay?.(row);
  if(s.day<=days&&!s.result){hire();collect();}
 }
 const idleRuns=daily.map(r=>r.longestIdle).sort((a,b)=>a-b),unoccupied=daily.reduce((n,r)=>n+r.idle.budget+r.idle.space+r.idle['shift-end'],0);
 const activity={daylightSeconds:daily.length*300,unoccupiedSeconds:unoccupied,unoccupiedFraction:unoccupied/(daily.length*300),longestIdle:Math.max(...idleRuns),p90LongestIdle:idleRuns[Math.ceil(idleRuns.length*.9)-1]};
 const daytime=decisions.reduce((n,d)=>n+d.daylightSeconds,0),idleTime=decisions.reduce((n,d)=>n+(!d.actions&&['budget','space','shift-end'].includes(d.reason)?d.daylightSeconds:0),0);
 return {protocol:'horde-defense-comparison-v1',repairSettlements:settlement.report(s),entryTransport:driver.report(),commands,raidFacts,raids:[...raids.values()],decisions,observedActivity:{daylightSeconds:daytime,unoccupiedSeconds:idleTime,unoccupiedFraction:daytime?idleTime/daytime:null},biome:s.biome,culture:s.culture,seed:s.seed,policy:{profile,mixed,middayHiring,plantsPerWorker,arm,defend:defenseEnabled,centerRepairs:defenseEnabled,reserveLabourGrowth,reserveMaintenance,burstPlanting,cameraEntry},defense:defense?(()=>{const r=defense.report(s),owned=new Set(r.built?.ids??[]);return {...r,initialNativeSkippedModules:r.built?r.built.expectedPieces-r.built.pieces:null,currentOwnedOperational:s.structures.filter(w=>owned.has(w.id)&&operational(w)).length,currentOwnedRuined:s.structures.filter(w=>owned.has(w.id)&&!operational(w)).length};})():null,additionalHiring,result:s.result,completedNights:s.completedNights,money:numberOf(s.ledger.balance),maximumLiving,plots:plots.length,reloads,counts,activity,daily,state:s,nav};
 }catch(error){error.partialReport={protocol:'horde-defense-comparison-v1',arm,state:s,commands,raidFacts,raids:[...raids.values()],decisions,repairSettlements:settlement.report(s),entryTransport:driver.report(),scope:'Incomplete native case; no synthetic outcome'};throw error;}finally{await driver.dispose();}
}
