import {rational,transact,numberOf} from '../simulation/money.js';
import {recordAwakeningOpportunity} from '../simulation/awakenings.js';
import {cropSpec} from '../simulation/rules.js';
import {EVENTS,MICROEVENT_CONFIG as C,eligibleAnchor} from './definitions.js';

export function microState(s){
  return s.microevents??={version:1,serial:0,rng:((Number(s.seed)^0x6d2b79f5)>>>0)||1,day:s.day,income:0,previousIncome:0,rewards:0,losses:0,pendingLosses:{},ticket:null,cooldown:C.cooldown,eventCooldowns:{},ignored:0,history:[],negativeTimes:[]};
}
export function trackIncome(s,events){
  const m=microState(s);
  for(const e of events){
    if(e.type==='Dawn'){m.previousIncome=m.income;m.income=0;m.rewards=0;m.losses=0;m.day=s.day;for(const id of Object.keys(m.pendingLosses))if(!s.plants.some(p=>p.id===id&&p.alive))delete m.pendingLosses[id];}
    if(e.type==='CrateDelivered'){const entry=s.ledger.entries[`deliver:${e.targetId}`];if(entry)m.income+=numberOf(entry);}
  }
  // Old or skipped-day snapshots cannot manufacture a production allowance.
  if(m.day!==s.day){m.previousIncome=0;m.income=0;m.rewards=0;m.losses=0;m.day=s.day;}
}
export function reserveEvent(s,id,targetId){
  const m=microState(s),target=EVENTS[id]?.anchor==='wood'?s.structures.find(p=>p.id===targetId):s.plants.find(p=>p.id===targetId&&p.alive);
  if(m.ticket||!EVENTS[id]||!eligibleAnchor(EVENTS[id],target))return null;
  const ticket={id:`micro:${++m.serial}`,type:id,targetId,day:s.day};m.ticket=ticket;return {...ticket};
}
// A single whitelisted settlement boundary. Never accept an amount from the overlay.
export function settleEvent(s,ticket,outcome,{enabled=true,losses=true}={}){
  const m=microState(s),current=m.ticket;
  if(!current||current.id!==ticket?.id||current.type!==ticket.type||current.targetId!==ticket.targetId)return {applied:false,delta:0};
  m.ticket=null;
  const def=EVENTS[current.type],target=def.anchor==='wood'?s.structures.find(p=>p.id===current.targetId):s.plants.find(p=>p.id===current.targetId&&p.alive);
  if(!enabled||!eligibleAnchor(def,target)||current.day!==s.day||s.pauses.length||s.result||!['completed','ignored'].includes(outcome))return {applied:true,delta:0};
  if(s.awakenings?.enabled!==false)recordAwakeningOpportunity(s,current.id,outcome);
  if(outcome==='completed'&&def.success==='coin'){
    const cap=Math.min(C.positiveDailyCoins,Math.floor(m.previousIncome*C.positiveDailyFraction));
    if(m.rewards<cap&&transact(s.ledger,current.id,rational(1))){m.rewards++;return {applied:true,delta:1};}
  }
  if(losses&&outcome==='ignored'&&def.timeout==='harvest-loss'&&!m.pendingLosses[target.id]){
    const cap=Math.min(C.negativeDailyCoins,Math.floor(m.previousIncome*C.negativeDailyFraction));
    const loss=Math.min(Math.floor(cropSpec(target.species).base_harvest_value*C.localLossFraction),Math.max(0,cap-m.losses));
    if(loss>0){m.pendingLosses[target.id]=loss;m.losses+=loss;return {applied:true,delta:0,reservedLoss:loss};}
  }
  return {applied:true,delta:0};
}
export function harvestMicroLoss(s,target,value,onLoss=()=>{}){
  const pending=s.microevents?.pendingLosses,loss=pending?.[target.id];
  if(!loss)return value;
  delete pending[target.id];
  const m=s.microevents;if(m.settledDay!==s.day){m.settledDay=s.day;m.settledLoss=0;}
  const cap=Math.min(C.negativeDailyCoins,Math.floor(m.previousIncome*C.negativeDailyFraction)),allowed=Math.min(loss,Math.max(0,cap-(m.settledLoss??0)));
  if(!allowed)return value;
  // Deduct whole coins AFTER ordinary bonuses; never multiply the nuisance loss.
  const settled=(BigInt(value.n)+BigInt(value.d)-1n)/BigInt(value.d);
  const applied=Math.min(allowed,Number(settled));m.settledLoss=(m.settledLoss??0)+applied;if(applied)onLoss({targetId:target.id,delta:-applied});
  return rational(settled-BigInt(applied));
}
export function disableMicroEconomy(s){if(s.microevents){s.microevents.pendingLosses={};s.microevents.ticket=null;}}
export function validateMicroState(s){
  const m=s.microevents;if(m===undefined)return;
  const nonnegative=v=>Number.isFinite(v)&&v>=0,whole=v=>Number.isSafeInteger(v)&&v>=0;
  if(!m||m.version!==1||!whole(m.serial)||!whole(m.rng)||m.rng>0xffffffff||!whole(m.day)||m.day<1||m.day>s.day||!['income','previousIncome','cooldown'].every(k=>nonnegative(m[k]))||!['rewards','losses','ignored'].every(k=>whole(m[k]))||!m.pendingLosses||Array.isArray(m.pendingLosses)||Object.entries(m.pendingLosses).some(([id,n])=>!s.plants.some(p=>p.id===id)||!whole(n)||n>2)||!m.eventCooldowns||Array.isArray(m.eventCooldowns)||Object.entries(m.eventCooldowns).some(([id,n])=>id!=='__emergency'&&!EVENTS[id]||!nonnegative(n))||!Array.isArray(m.history)||m.history.length>6||m.history.some(id=>!EVENTS[id])||!Array.isArray(m.negativeTimes)||m.negativeTimes.length>2||m.negativeTimes.some(n=>!nonnegative(n)))throw Error('Invalid microevent state');
  if(m.ticket!==null&&(!m.ticket||m.ticket.id!==`micro:${m.serial}`||!EVENTS[m.ticket.type]||typeof m.ticket.targetId!=='string'||!whole(m.ticket.day)||m.ticket.day> s.day))throw Error('Invalid microevent ticket');
  if(m.settledDay!==undefined&&(!whole(m.settledDay)||m.settledDay>s.day)||m.settledLoss!==undefined&&(!whole(m.settledLoss)||m.settledLoss>C.negativeDailyCoins))throw Error('Invalid settled microevent loss');
}
