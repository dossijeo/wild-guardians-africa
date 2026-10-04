// A player strategy using only ordinary commands on native terrain. No overrides
// to balances, growth, task order, worker movement, RNG or animal damage/budgets.
import {pathToFileURL} from 'node:url';
import {createOpeningWorld} from './check_opening.mjs';
import * as Game from '../src/simulation/game.js';
import {cropSpec,permission,operational} from '../src/simulation/rules.js';
import {numberOf} from '../src/simulation/money.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {isMature} from '../src/simulation/crops.js';
import {centerServicePoint} from '../src/world/centers.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {nativeCameraPose} from '../src/rendering/terrain-camera.js';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {intensiveRunProvenance} from './intensive-run-provenance.mjs';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function simulateIntensiveFarm({days=100,profile='olderFemale',mixed=false,reserveLabourGrowth=true,reserveMaintenance=true,burstPlanting=false,cameraEntry=true,onDay,onTick,...world}={}){
 const opening=createOpeningWorld(world),nav=opening.nav;let s=opening.s,sequence=0;
 const worker=PROFILES.find(p=>p.id===profile);if(!worker)throw new Error('Unknown worker profile');
 const command=kind=>`intensive-${kind}-${sequence++}`,center=s.structures[0],origin=centerServicePoint(center,s,.8);
 if(cameraEntry){
  const pose=nativeCameraPose(nav.field,[center.x,0,center.z],nav.field.canyon?0:.5,nav.field.canyon?1.18:1.16,nav.field.canyon?34:38);
  nav.setRaidView({x:pose.eye[0],z:pose.eye[2]},center);nav.setActiveBounds(activeChunkRegion({x:pose.eye[0],z:pose.eye[2]}).bounds);
 }
 const bounds=activeChunkRegion(center).bounds,grid=1.5,candidates=[];
 for(let z=Math.ceil(bounds[1]/grid)*grid;z<=bounds[3];z+=grid)for(let x=Math.ceil(bounds[0]/grid)*grid;x<=bounds[2];x+=grid)candidates.push({x,z});
 candidates.sort((a,b)=>distance(a,origin)-distance(b,origin)||a.z-b.z||a.x-b.x);
 const plots=[];let candidateIndex=0,nextWages=worker.wage,staff=1,plantedSequence=0;
 const daily=[],counts={},seen=new Set(),savedRaids=new Set();let maximumLiving=0,reloads=0;
 const collect=()=>{for(const e of s.events)if(!seen.has(e.id)){seen.add(e.id);counts[e.type]=(counts[e.type]??0)+1;}};
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
 const labourReserve=(additional=0)=>reserveLabourGrowth?Math.max(nextWages,Math.ceil((s.plants.filter(p=>p.alive).length+additional)/12)*worker.wage):nextWages;
 const maintenanceReserve=()=>reserveMaintenance?Math.max(100,...s.structures.filter(operational).map(c=>numberOf(Game.repairCost(c)))):0;
 const plant=()=>{
  const species=nextSpecies();if(numberOf(s.ledger.balance)<labourReserve(1)+maintenanceReserve()+cropSpec(species).plant_cost)return false;
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
  // Request repairs before reinvesting, preserving their real FIFO position.
  for(const c of s.structures.filter(operational))if(c.hp<(reserveMaintenance?600:540)&&!s.tasks.some(t=>t.kind==='repair'&&t.targetId===c.id)&&numberOf(s.ledger.balance)>=numberOf(Game.repairCost(c))+labourReserve()){Game.requestRepair(s,command('repair'),c.id);actions++;}
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
  const desired=Math.max(1,Math.ceil((living+(s.day===1?money/10:0))/12));
  const affordable=reserveLabourGrowth?Math.floor(money/worker.wage):Math.floor((money-5)/(2*worker.wage));
  staff=Math.max(1,Math.min(desired,affordable));
  Game.hire(s,command('hire'),{[profile]:staff});nextWages=staff*worker.wage;
 };
 hire();collect();
 while(s.day<=days&&!s.result){
  const day=s.day,start=s.elapsed,before=numberOf(s.ledger.balance),baseline={...counts},idle={budget:0,space:0,'shift-end':0,incursion:0,night:0},initialStaff=staff;
  let longestIdle=0,idleRun=0,actions=0;
  while(s.day===day&&!s.result){
   if(s.pauses.length)throw new Error('Unexpected pause: '+s.pauses);
   const decision=act();actions+=decision.actions;
   const dt=s.time<300||s.raid?1:5;
   if(!decision.actions){idle[decision.reason]=(idle[decision.reason]??0)+dt;if(s.time<300&&!s.raid){idleRun+=dt;longestIdle=Math.max(longestIdle,idleRun);}}else idleRun=0;
   Game.tick(s,dt,nav);collect();onTick?.(s,nav);
   if(s.raid&&!savedRaids.has(s.raid.id)){savedRaids.add(s.raid.id);s=deserialize(serialize(s));nav.setState(s);reloads++;}
   if(s.elapsed-start>2400)throw new Error(`Unfinished real incursion on day ${day}: ${JSON.stringify(s.raid)}`);
  }
  const row={day,before,money:numberOf(s.ledger.balance),staff:initialStaff,wages:initialStaff*worker.wage,nextLabourReserve:labourReserve(),maintenanceReserve:maintenanceReserve(),pendingTasks:s.tasks.length,planted:(counts.CropPlaced??0)-(baseline.CropPlaced??0),delivered:(counts.CrateDelivered??0)-(baseline.CrateDelivered??0),destroyed:(counts.CropDestroyed??0)-(baseline.CropDestroyed??0),living:s.plants.filter(p=>p.alive).length,centerHp:s.structures.filter(operational).map(c=>c.hp),actions,longestIdle,idle,result:s.result};
  daily.push(row);onDay?.(row);
  if(s.day<=days&&!s.result){hire();collect();}
 }
 const idleRuns=daily.map(r=>r.longestIdle).sort((a,b)=>a-b),unoccupied=daily.reduce((n,r)=>n+r.idle.budget+r.idle.space+r.idle['shift-end'],0);
 const activity={daylightSeconds:daily.length*300,unoccupiedSeconds:unoccupied,unoccupiedFraction:unoccupied/(daily.length*300),longestIdle:Math.max(...idleRuns),p90LongestIdle:idleRuns[Math.ceil(idleRuns.length*.9)-1]};
 return {biome:s.biome,culture:s.culture,seed:s.seed,policy:{profile,mixed,reserveLabourGrowth,reserveMaintenance,burstPlanting,cameraEntry},result:s.result,completedNights:s.completedNights,money:numberOf(s.ledger.balance),maximumLiving,plots:plots.length,reloads,counts,activity,daily,state:s,nav};
}
export function auditIntensiveFarm(report,{victory=false}={}){
 const s=report.state,plants=new Map(s.plants.map(p=>[p.id,p]));let balance=1500n;
 for(const entry of Object.values(s.ledger.entries)){assert.equal(entry.d,'1');balance+=BigInt(entry.n);}
 assert.equal(s.ledger.balance.n,String(balance));assert.equal(s.ledger.balance.d,'1');
 assert.equal(s.plants.length,Object.keys(s.ledger.entries).filter(id=>id.startsWith('intensive-plant-')).length);
 const picked=new Set();
 for(const crate of s.crates){
  const p=plants.get(crate.sourcePlantId);assert.ok(p&&!p.alive&&!picked.has(p.id));picked.add(p.id);
  assert.equal(crate.species,p.species);assert.ok(p.growth>=cropSpec(p.species).growth_seconds);
  assert.ok(p.water.every(w=>['manual','magic'].includes(w.status)));
  const charge=s.ledger.entries['deliver:'+crate.id];
  if(crate.delivered){assert.ok(charge);assert.equal(charge.n,String((BigInt(crate.value.n)+BigInt(crate.value.d)-1n)/BigInt(crate.value.d)));assert.equal(crate.carrierId,null);}
  else assert.equal(charge,undefined);
 }
 assert.equal(report.counts.CrateDelivered??0,s.crates.filter(c=>c.delivered).length);
 assert.equal(report.counts.CropPicked??0,s.crates.length);
 assert.equal(serialize(deserialize(serialize(s))),serialize(s));
 if(victory){assert.equal(s.result,'victory');assert.equal(s.completedNights,100);assert.equal(s.day,101);assert.equal(s.raid,null);assert.equal(report.counts.CampaignWon,1);assert.equal(report.counts.GameOver??0,0);}
 return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const provenance=intensiveRunProvenance(process.argv.slice(2));console.log(JSON.stringify({provenance}));
 const days=Number(process.argv[2]??100),profile=process.argv[6]??'olderFemale',result=simulateIntensiveFarm({days,biome:process.argv[3]??'sabana',culture:process.argv[4]??'mapungubwe',mixed:process.argv[5]==='mixed',profile,seed:712,onDay:r=>console.log(JSON.stringify(r))});
 const {state,nav,daily,...report}=result;console.log(JSON.stringify(report));
 mkdirSync(new URL('../test-results/',import.meta.url),{recursive:true});
 const key=`intensive-${report.biome}-${report.culture}-${report.seed}${process.argv[5]==='mixed'?'-mixed':''}${profile==='olderFemale'?'':'-'+profile}`;
 writeFileSync(new URL(`../test-results/${key}.json`,import.meta.url),JSON.stringify({...report,daily,provenance},null,2)+'\n');
 writeFileSync(new URL(`../test-results/${key}-state.json`,import.meta.url),serialize(state));
 auditIntensiveFarm(result,{victory:days===100});
}
