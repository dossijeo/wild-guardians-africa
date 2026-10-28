import {cropSpec,operational} from './rules.js';
import {numberOf} from './money.js';

import {AWAKENINGS} from './awakening-config.js';
export {AWAKENINGS} from './awakening-config.js';
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const round=v=>Math.round(v*1e6)/1e6;
const live=e=>e.blessing&&(e.alive===true||e.kind==='wall'&&e.status==='intact'&&e.hp>0);
export const activeBlessings=s=>[...s.plants,...s.structures].filter(live);
export function awakeningState(s){
  // A legacy save starts tracking on its current day; loading never awards past days.
  return s.awakenings??={version:1,progress:0,lastEvaluatedDay:s.day-1,total:0,
    destroyed:0,streak:0,history:[],current:dailyRecord(s)};
}
function dailyRecord(s){return {day:s.day,opportunity:0,productive:0,
  delivered:0,seedBasis:0,wages:0,seeds:0,repairs:0,losses:0,
  cropValueLost:0,exposed:0,threat:0,eventsCompleted:0,
  deliveryIds:[],opportunityIds:[],lossIds:[],eventIds:[],raidIds:[]};}
function row(s){
  const a=awakeningState(s);
  if(a.current.day<s.day){a.current=dailyRecord(s);a.lastEvaluatedDay=Math.max(a.lastEvaluatedDay,s.day-1);}
  return a.current;
}
export function recordAgriculturalCare(s,plant,seconds,productiveSeconds){
  if(plant.blessing||!plant.alive||seconds<=0)return;
  const r=row(s),cycle=cropSpec(plant.species).growth_seconds;
  // Time-weighted productive capacity, not farm size or number of casts.
  r.opportunity+=seconds/cycle;r.productive+=clamp(productiveSeconds/seconds)*seconds/cycle;
}
export function recordAwakeningEvent(s,event){
  const type=event.type;
  if(!['CropPlaced','HiringConfirmed','RepairApplied','CrateDelivered','CropDestroyed','RaidSpawned','RaidWaveSpawned'].includes(type))return;
  const r=row(s),p=type==='CropPlaced'||type==='CropDestroyed'?s.plants.find(p=>p.id===event.targetId):null;
  if(type==='CropPlaced')r.seeds+=p?cropSpec(p.species).plant_cost:0;
  if(type==='HiringConfirmed')r.wages+=event.cost??0;
  if(type==='RepairApplied')r.repairs+=event.repair?.paidCoins??0;
  if(type==='CrateDelivered'&&!r.deliveryIds.includes(event.targetId)){
    r.deliveryIds.push(event.targetId);
    const crate=s.crates.find(c=>c.id===event.targetId),entry=s.ledger.entries[`deliver:${event.targetId}`];
    if(crate&&entry){r.delivered+=numberOf(entry);r.seedBasis+=cropSpec(crate.species).plant_cost;}
  }
  if(type==='CropDestroyed'&&!r.lossIds.includes(event.targetId)){
    r.lossIds.push(event.targetId);r.losses++;r.cropValueLost+=p?cropSpec(p.species).base_harvest_value:0;
  }
  if(type==='RaidSpawned'||type==='RaidWaveSpawned'){
    const facts=event.raidFacts,key=`${facts?.id}:${facts?.waveIndex??0}`;
    if(!r.raidIds.includes(key)){
      r.raidIds.push(key);r.exposed=Math.max(r.exposed,facts?.exposedLiving??0);
      // Threat reward is capped by campaign age, so inflating attraction cannot buy points.
      r.threat+=Math.min(1,(facts?.actors??[]).reduce((n,a)=>n+Math.max(0,a.hitsRemaining??0),0)/4);
    }
  }
}
export function recordAwakeningOpportunity(s,id,outcome){
  const r=row(s);if(r.eventIds.includes(id))return;
  r.eventIds.push(id);if(outcome==='completed')r.eventsCompleted++;
}
export function scoreAwakeningDay(facts,{day,active=0,hasCenter=true,balance=0,reserve=30}={}){
  const care=facts.opportunity>0?clamp(facts.productive/facts.opportunity):0;
  const activity=clamp(facts.productive); // One real crop cycle is enough; area adds no points.
  const agriculture=8*care*activity;
  const running=facts.seedBasis+facts.wages+facts.repairs;
  const margin=running>0?clamp((facts.delivered-facts.seedBasis)/Math.max(1,facts.wages+facts.repairs)):0;
  // Productive investment days count without requiring yesterday's sales or increasing revenue.
  const sustainable=hasCenter?clamp(balance/Math.max(1,reserve)):0;
  const economy=8*Math.max(margin,care*activity*.75)*sustainable;
  const survival=facts.exposed>0?clamp(1-facts.losses/facts.exposed):0;
  const ageThreat=clamp((day-1)/30);
  const defense=hasCenter?12*survival*Math.min(1,.5+ageThreat*.5)*Math.min(1,facts.threat):0;
  const events=Math.min(4,facts.eventsCompleted*2);
  // Losses already reduce survival. Only unpaid sustainable management costs can add a small penalty.
  const penalty=Math.min(6,!hasCenter?3:balance<reserve?2:0);
  const positive=agriculture+economy+defense+events;
  const earned=positive/(1+AWAKENINGS.diminishing*active);
  return Object.fromEntries(Object.entries({agriculture,economy,defense,events,penalty,positive,earned,
    care,activity,sustainable,survival,active}).map(([k,v])=>[k,round(v)]));
}
export function evaluateAwakeningDay(s,{emit=()=>{},notice=()=>{}}={}){
  const r=row(s),a=awakeningState(s);
  if(a.lastEvaluatedDay>=s.day)return null;
  const scores=scoreAwakeningDay(r,{day:s.day,active:activeBlessings(s).length,
    hasCenter:s.structures.some(operational),balance:numberOf(s.ledger.balance),
    reserve:Math.max(30,r.wages)});
  const before=a.progress;
  // A banked charge survives subsequent bad days, as promised by the interaction contract.
  a.progress=before>=100?100:round(clamp(before+scores.earned-scores.penalty,0,100));
  const summary={day:s.day,...scores,before,after:a.progress,delta:round(a.progress-before),facts:structuredClone(r)};
  a.history.push(summary);a.lastEvaluatedDay=s.day;
  a.streak=scores.positive>=18?a.streak+1:0;
  emit('AwakeningDayEvaluated',{summary});
  if(before<100&&a.progress===100){emit('AwakeningReady');notice('La tierra está preparada: tienes un Despertar disponible.');}
  else if(summary.delta>=1||scores.penalty){notice(`Despertar ${summary.delta>=0?'+':''}${summary.delta.toFixed(1)} · Agricultura ${scores.agriculture.toFixed(1)}, economía ${scores.economy.toFixed(1)}, defensa ${scores.defense.toFixed(1)}, acontecimientos ${scores.events.toFixed(1)}${scores.penalty?`, penalización −${scores.penalty}`:''}.`);}
  return summary;
}
export function startAwakeningDay(s){const a=awakeningState(s);a.current=dailyRecord(s);}

export function validateAwakenings(s){
  const a=s.awakenings;if(a===undefined)return;
  const nonnegative=n=>Number.isFinite(n)&&n>=0;
  const whole=n=>Number.isSafeInteger(n)&&n>=0;
  if(!a||a.version!==1||a.enabled!==undefined&&typeof a.enabled!=='boolean'||!nonnegative(a.progress)||a.progress>100||
    !whole(a.lastEvaluatedDay)||a.lastEvaluatedDay>s.day||
    !['total','destroyed','streak'].every(k=>whole(a[k]))||a.destroyed>a.total||
    !Array.isArray(a.history)||a.history.some((h,i)=>!whole(h.day)||h.day<1||h.day>s.day||i&&h.day<=a.history[i-1].day||
      !['agriculture','economy','defense','events','penalty','positive','earned','before','after'].every(k=>nonnegative(h[k]))||h.after>100)||
    !a.current||!whole(a.current.day)||a.current.day<1||a.current.day>s.day||
    !['opportunity','productive','delivered','seedBasis','wages','seeds','repairs','losses','cropValueLost','exposed','threat','eventsCompleted'].every(k=>nonnegative(a.current[k]))||
    !['deliveryIds','opportunityIds','lossIds','eventIds','raidIds'].every(k=>Array.isArray(a.current[k])&&a.current[k].every(id=>typeof id==='string')&&new Set(a.current[k]).size===a.current[k].length))throw Error('Progreso de Despertar inválido');
}
