// A player strategy using only ordinary commands on native terrain. No overrides
// to balances, growth, task order, worker movement, RNG or animal damage/budgets.
import {pathToFileURL} from 'node:url';
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
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {intensiveRunProvenance} from './intensive-run-provenance.mjs';
import {createFarmDefensePolicy} from './farm-defense-policy.mjs';
import {createNativeExpandingDefensePolicy} from './native-expanding-defense-policy.mjs';
import {createNativeCampaignEvidence} from './native-campaign-evidence.mjs';
import {createNativeRaidCampaignEvidence} from './native-raid-campaign-evidence.mjs';
import {NativeCampaignEntryDriver} from './native-campaign-entry-driver.mjs';
import {nativeCampaignStrategy,affordableOpening,villageSavingsFromTotals,NATIVE_CAMPAIGN_PROTOCOL} from './native-campaign-protocol.mjs';
import {createNativeCampaignPlots} from './native-campaign-plots.mjs';
import {createNativeCampaignExpansion} from './native-campaign-expansion.mjs';

import {campaignFinanceCheckpoint,campaignFinanceDelta} from './native-campaign-finance.mjs';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export async function simulateNativeCampaign({days=100,strategy='good',profile='olderFemale',mixed=true,middayHiring=false,plantsPerWorker=12,defend=false,reserveLabourGrowth=true,reserveMaintenance=true,burstPlanting=false,cameraEntry=true,defensePolicy='expanding',nativeEvidence=true,onDay,onTick,onDecision,...world}={}){
 if(!Number.isSafeInteger(days)||days<1||days>180)throw Error('Native protocol permits1–180 days only');
 if(!Number.isSafeInteger(plantsPerWorker)||plantsPerWorker<1)throw new Error('Plants per worker must be a positive integer');
 const policy=nativeCampaignStrategy(strategy);defend=policy.defend;middayHiring=policy.middayHiring;plantsPerWorker=6;
 if(typeof Game.nightEntryPending!=='function')throw Error('Native pending entry handshake is not integrated; no campaign started');
 const opening=createOpeningWorld(world),nav=opening.nav;let s=opening.s,sequence=0;
 const worker=PROFILES.find(p=>p.id===profile);if(!worker)throw new Error('Unknown worker profile');
 if(!['legacy','expanding'].includes(defensePolicy))throw Error('Unknown defense policy');
 const defense=defend?(defensePolicy==='expanding'?createNativeExpandingDefensePolicy({repairWalls:policy.repair,reserveMode:'none'}):createFarmDefensePolicy()):null;
 const driver=new NativeCampaignEntryDriver(nav);let partialEvidence=()=>({});
 try {
 const evidence=nativeEvidence?createNativeCampaignEvidence(s):null,raidEvidence=createNativeRaidCampaignEvidence(s);
 const command=kind=>`intensive-${kind}-${sequence++}`,center=s.structures[0],origin=centerServicePoint(center,s,.8);
 if(cameraEntry){
  const pose=nativeCameraPose(nav.field,[center.x,0,center.z],nav.field.canyon?0:.5,nav.field.canyon?1.18:1.16,nav.field.canyon?34:38);
  nav.setRaidView({x:pose.eye[0],z:pose.eye[2]},center);nav.setActiveBounds(activeChunkRegion({x:pose.eye[0],z:pose.eye[2]}).bounds);
 }
 const plots=[];let nextWages=worker.wage,staff=1,plantedSequence=0;
 const expansion=policy.foundVillages?createNativeCampaignExpansion():null;
 const daily=[],counts={},seen=new Set(),savedRaids=new Set(),additionalHiring={count:0,cost:0};let maximumLiving=0,reloads=0,settledDeliveryIncome=0;
 let financeStart=campaignFinanceCheckpoint(s);
 partialEvidence=()=>({currentFinance:campaignFinanceDelta(financeStart,s),daily:structuredClone(daily),nativeEvidence:evidence?.report(s)??null,raidEvidence:raidEvidence.report(s),defense:defense?.report(s)??null,expansion:expansion?.report()??null});
 const collect=()=>{for(const e of s.events)if(!seen.has(e.id)){seen.add(e.id);counts[e.type]=(counts[e.type]??0)+1;if(e.type==='CrateDelivered'){const q=s.ledger.entries['deliver:'+e.targetId];assert.ok(q&&q.d==='1'&&Number(q.n)>0);settledDeliveryIncome+=Number(q.n);}if(e.type==='HiringConfirmed'&&e.additional){additionalHiring.count+=e.count;additionalHiring.cost+=e.cost;}}};
 const plotSearch=createNativeCampaignPlots(nav,()=>s);
 const choosePlot=()=>{const p=plotSearch.choose();if(p&&!plots.some(q=>q.x===p.x&&q.z===p.z))plots.push(p);return p;};
 const nextSpecies=()=>mixed&&s.day>=10&&numberOf(s.ledger.balance)>1000?['mijo','girasol','sorgo','maiz','batata','algodon','yuca','platano'][plantedSequence%8]:'mijo';
 const labourReserve=(additional=0)=>policy.cashPolicy==='progressive-village'?Math.max(nextWages,Math.ceil((s.plants.filter(p=>p.alive).length+additional)/plantsPerWorker)*worker.wage):nextWages;
 const maintenanceReserve=()=>policy.repair?s.tasks.filter(t=>t.kind==='repair').reduce((n,t)=>{const c=s.structures.find(c=>c.id===t.targetId);return n+(c?Math.ceil(numberOf(Game.repairCost(c))):0);},0):0;
 const savingsReserve=(additional=0)=>Math.min(villageSavingsFromTotals(policy,settledDeliveryIncome,expansion?.paidVillageCoins()??0),Math.max(0,numberOf(s.ledger.balance)-labourReserve(additional)-maintenanceReserve()-cropSpec(nextSpecies()).plant_cost));
 const plant=()=>{
  const species=nextSpecies();if(numberOf(s.ledger.balance)<labourReserve(1)+maintenanceReserve()+(defense?.reserve(s)??0)+savingsReserve(1)+cropSpec(species).plant_cost)return false;
  const p=choosePlot();if(!p)return false;
  if(!Game.plant(s,command('plant'),species,p.x,p.z,nav))return false;plantedSequence++;maximumLiving=Math.max(maximumLiving,s.plants.filter(p=>p.alive).length);return true;
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
    if(numberOf(s.ledger.balance)>=cost+tomorrow+maintenanceReserve()+(defense?.reserve(s)??0)+savingsReserve()){
     if(Game.hireAdditional(s,command('hire'),selection,center.id)){staff+=extra;nextWages=staff*worker.wage;actions++;}
    }
   }
  }
  // Request repairs before reinvesting, preserving their real FIFO position.
  for(const c of (policy.repair?s.structures.filter(operational):[]))if(c.hp<(reserveMaintenance?600:540)&&!s.tasks.some(t=>t.kind==='repair'&&t.targetId===c.id)&&numberOf(s.ledger.balance)>=numberOf(Game.repairCost(c))+labourReserve()){const taskCount=s.tasks.length;Game.requestRepair(s,command('repair'),c.id);if(s.tasks.length>taskCount)actions++;}
  if(defense)actions+=defense.act(s,nav,{command,reserve:labourReserve()+maintenanceReserve()+savingsReserve()});
  if(expansion)actions+=expansion.act(s,nav,{command,reserve:labourReserve()+maintenanceReserve(),villageSavings:savingsReserve()});
  const live=s.plants.filter(p=>p.alive);
  for(const kind of ['multiply','growth'])if(s.day>=(kind==='multiply'?5:3)&&s.cooldowns[kind]===0){
   const eligible=live.filter(p=>kind==='multiply'?!p.multiplyHarvest:!isMature(p)&&p.water.every(w=>w.status!=='due'));
   const point=bestMagicPoint(kind,eligible);if(point&&cast(kind,point))actions++;
  }
  // Replant as money arrives. No fixed plot or plant-count limit.
  if(s.time<worker.end-20){if(burstPlanting){while(plant())actions++;}else if(plant())actions++;}
  return {actions,reason:actions?'active':s.time>=worker.end-20?'shift-end':plotSearch.reason()==='space'?'space':plotSearch.reason()==='searching'?'navigation':'budget'};
 };
 // The mandatory first seed opens hiring normally. Staff is paid immediately.
 let openingSearch=0;while(!plant()){if(++openingSearch>4096||plotSearch.reason()==='space')throw Error('No legal affordable first seed in bounded opening search');await new Promise(resolve=>setImmediate(resolve));}
 Game.openInitialHiring(s);
 const hire=()=>{
  const money=numberOf(s.ledger.balance),living=s.plants.filter(p=>p.alive).length;
  const desired=s.day===1?affordableOpening({cash:money,living,wage:worker.wage,seedCost:cropSpec(nextSpecies()).plant_cost,plantsPerWorker,repairReserve:maintenanceReserve()}).staff:Math.max(1,Math.ceil(living/plantsPerWorker));
  const affordable=Math.floor(money/worker.wage);
  staff=Math.max(1,Math.min(desired,affordable));
  const id=command('hire');Game.hire(s,id,{[profile]:staff});
  if(!s.ledger.entries[id])throw Error('Native daily hiring did not settle');nextWages=staff*worker.wage;
 };
 hire();collect();
 while(s.day<=days&&!s.result){
  const day=s.day,start=s.elapsed,before=financeStart.balance,baseline={...counts},additionalBaseline={...additionalHiring},idle={budget:0,space:0,'shift-end':0,incursion:0,night:0},initialStaff=staff;
  let longestIdle=0,idleRun=0,actions=0,daylightSeconds=0,unoccupiedSeconds=0;
  while(s.day===day&&!s.result){
   if(s.pauses.length)throw new Error('Unexpected pause: '+s.pauses);
   await driver.advancePresentation(s);
   if(Game.nightEntryPending(s)&&s.time>=600)await driver.waitForEntry(s);
   const beforeRepairs=new Set(s.tasks.filter(t=>t.kind==='repair').map(t=>t.id));
   const decision=act();actions+=decision.actions;
   const centerRequests=s.tasks.filter(t=>t.kind==='repair'&&!beforeRepairs.has(t.id)&&s.structures.some(c=>c.id===t.targetId&&c.kind==='center')).length;
   const dt=s.time<300||s.raid?1:5;
   evidence?.decision(s,{seconds:dt,reason:decision.reason,otherActions:Math.max(0,decision.actions-centerRequests)});
   // Optional evidence only: immutable scalar observations, not navigation or
   // game commands. Values describe the state after this strategy's decision.
   if(onDecision)onDecision(Object.freeze({day:s.day,time:s.time,seconds:dt,
    actions:decision.actions,reason:decision.reason,balance:numberOf(s.ledger.balance),
    seedCost:cropSpec(nextSpecies()).plant_cost,nextWages,
    labourReserve:labourReserve(1),maintenanceReserve:maintenanceReserve(),
    defenseReserve:defense?.reserve(s)??0,living:s.plants.filter(p=>p.alive).length,
    pendingTasks:s.tasks.length}));
   raidEvidence.observe(s);
   const tickStart=s.elapsed,tickTime=s.time;
   Game.tick(s,dt,nav);evidence?.finishDecision(s);
   const actualDt=s.elapsed-tickStart,daylightDt=tickTime<300?Math.min(actualDt,300-tickTime):0;daylightSeconds+=daylightDt;
   if(!decision.actions){idle[decision.reason]=(idle[decision.reason]??0)+actualDt;unoccupiedSeconds+=daylightDt;idleRun+=daylightDt;longestIdle=Math.max(longestIdle,idleRun);}else idleRun=0;
   collect();evidence?.observe(s);raidEvidence.observe(s);onTick?.(s,nav);await driver.advancePresentation(s);
   if(s.raid&&!savedRaids.has(s.raid.id)){savedRaids.add(s.raid.id);s=deserialize(serialize(s));nav.setState(s);reloads++;}
   if(s.elapsed-start>2400)throw new Error(`Unfinished real incursion on day ${day}: ${JSON.stringify(s.raid)}`);
  }
  const finance=campaignFinanceDelta(financeStart,s);
  const row={day,before,finance,daylightSeconds,unoccupiedSeconds,money:numberOf(s.ledger.balance),staff:initialStaff,wages:finance.wages,nextLabourReserve:labourReserve(),maintenanceReserve:maintenanceReserve(),pendingTasks:s.tasks.length,planted:(counts.CropPlaced??0)-(baseline.CropPlaced??0),delivered:(counts.CrateDelivered??0)-(baseline.CrateDelivered??0),destroyed:(counts.CropDestroyed??0)-(baseline.CropDestroyed??0),living:s.plants.filter(p=>p.alive).length,centerHp:s.structures.filter(operational).map(c=>c.hp),actions,longestIdle,idle,result:s.result};
  row.additionalStaff=additionalHiring.count-additionalBaseline.count;row.additionalWages=additionalHiring.cost-additionalBaseline.cost;
  daily.push(row);onDay?.(row);
  if(s.result==='victory'&&s.day<=days){Game.continuePostgame(s);collect();}
  if(s.day<=days&&!s.result){financeStart=campaignFinanceCheckpoint(s);hire();collect();}
 }
 const idleRuns=daily.map(r=>r.longestIdle).sort((a,b)=>a-b),unoccupied=daily.reduce((n,r)=>n+r.unoccupiedSeconds,0),daylight=daily.reduce((n,r)=>n+r.daylightSeconds,0);
 const activity={daylightSeconds:daylight,unoccupiedSeconds:unoccupied,unoccupiedFraction:daylight?unoccupied/daylight:null,longestIdle:Math.max(...idleRuns),p90LongestIdle:idleRuns[Math.ceil(idleRuns.length*.9)-1]};
 return {protocol:NATIVE_CAMPAIGN_PROTOCOL,strategy,raidEvidence:raidEvidence.report(s),entryTransport:driver.report(),peaceAfter100:true,expansion:expansion?.report()??null,plotSearch:plotSearch.report(),...(evidence?{nativeEvidence:evidence.report(s)}:{}),biome:s.biome,culture:s.culture,seed:s.seed,policy:{profile,mixed,middayHiring,plantsPerWorker,defend,cashPolicy:policy.cashPolicy,reserveMaintenance,burstPlanting,cameraEntry,defensePolicy},defense:defense?.report(s)??null,additionalHiring,result:s.result,completedNights:s.completedNights,money:numberOf(s.ledger.balance),maximumLiving,plots:plots.length,reloads,counts,activity,daily,state:s,nav};
 } catch(error){let receipts;try{receipts=partialEvidence();}catch(e){receipts={evidenceError:e.message};}error.nativeCampaignPartial={strategy,seed:s.seed,day:s.day,time:s.time,result:s.result,state:serialize(s),entryTransport:driver.report(),receipts};throw error;} finally {await driver.dispose();}
}
