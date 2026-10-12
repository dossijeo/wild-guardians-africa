import {rational,add,negate,multiply,compare,numberOf} from './money.js';

// Frozen candidate: 12 original 30-second, +50% growth applications;
// 12 reference millet harvests at 11 coins. Never derives from farm wealth.
export const AGRICULTURAL_POWER=Object.freeze({version:1,growth:180,multiply:132,plantGrowthCap:15,plantMultiplyCap:11,referenceGrowth:15,referenceHarvest:11});
const zero=()=>rational(0);
const subtract=(a,b)=>add(a,negate(b));
const divide=(a,b)=>rational(BigInt(a.n)*BigInt(b.d),BigInt(a.d)*BigInt(b.n));
const minimum=(a,b)=>compare(a,b)<0?a:b;
const floor=a=>BigInt(a.n)/BigInt(a.d);
function row(s,day=s.day){
  s.agriculturalPower??={version:1,days:{}};
  return s.agriculturalPower.days[day]??=(Object.fromEntries(['growth','multiply'].map(kind=>[kind,{budget:rational(AGRICULTURAL_POWER[kind]),requested:zero(),committed:zero(),consumed:zero(),liquidated:zero(),paid:'0',applications:0}])));
}
// E(T)=B*T/(B+T): monotonic, bounded, strictly positive marginal power,
// no refunds or retroactive dilution. The total is invariant under permutation
// of the same requests. Individual entitlements follow the actual cast order.
export function commitAgriculturalPower(s,p,kind,baseHarvest){
  const account=row(s)[kind];account.applications++;
  if(kind==='multiply'&&(p.multiplyPower||p.multiplyHarvest))return {day:s.day,amount:zero(),intensity:0,benefited:false};
  const cap=kind==='growth'?rational(AGRICULTURAL_POWER.plantGrowthCap):rational(Math.min(baseHarvest,AGRICULTURAL_POWER.plantMultiplyCap));
  const prior=kind==='growth'?p.growthPowerCommitted??zero():zero();
  const remaining=subtract(cap,minimum(cap,prior));
  // Nanosecond units keep repeated same-plant requests bounded in serialized
  // size; this is numerical resolution, not a limit on uses or distinct plants.
  const request=kind==='growth'?rational(BigInt(remaining.n)*1000000000n/BigInt(remaining.d),1000000000n):remaining;
  if(compare(request,zero())<=0)return {day:s.day,amount:zero(),intensity:0,benefited:false};
  const total=add(account.requested,request),old=account.committed;
  const committed=divide(multiply(total,BigInt(account.budget.n),BigInt(account.budget.d)),add(account.budget,total));
  const amount=subtract(committed,old);
  account.requested=total;account.committed=committed;
  if(kind==='growth')p.growthPowerCommitted=minimum(cap,add(prior,rational((BigInt(amount.n)*1000000000n+BigInt(amount.d)-1n)/BigInt(amount.d),1000000000n)));
  else p.multiplyPower={day:s.day,amount};
  return {day:s.day,amount,intensity:numberOf(divide(amount,rational(kind==='growth'?15:baseHarvest))),benefited:compare(amount,zero())>0};
}
export function consumeGrowthPower(s,spell,extra){
  if(!spell.power||extra<=0)return;
  const a=row(s,spell.power.day).growth;
  // Growth integration uses floating seconds. Preserve exact accounting of that
  // measurement and cap cumulative consumption at the committed entitlement.
  const previous=spell.power.consumed??zero();
  const micros=rational(BigInt(Math.round(extra*1e9)),1000000000n);
  const next=minimum(spell.power.amount,add(previous,micros));
  a.consumed=add(a.consumed,subtract(next,previous));spell.power.consumed=next;
}
export function settleMultiplyPower(s,crate){
  if(!crate.multiplyPower||crate.multiplyPowerSettled)return zero();
  const a=row(s,crate.multiplyPower.day).multiply;
  const next=add(a.liquidated,crate.multiplyPower.amount);
  if(compare(next,a.committed)>0)throw new Error('Potencia de cosecha excede lo comprometido');
  const paid=floor(next),coins=paid-BigInt(a.paid);
  a.liquidated=next;a.consumed=next;a.paid=String(paid);crate.multiplyPowerSettled=true;
  return rational(coins);
}
export function agriculturalPowerReport(s,day=s.day){
  const days=s.agriculturalPower?.days[day];
  return Object.fromEntries(['growth','multiply'].map(kind=>{
    const a=days?.[kind]??{budget:rational(AGRICULTURAL_POWER[kind]),requested:zero(),committed:zero(),consumed:zero(),liquidated:zero(),paid:'0',applications:0};
    let pending=zero();
    if(kind==='growth')for(const spell of s.spells??[]){
      if(spell.kind===kind&&spell.remaining>0&&spell.power?.day===Number(day)&&s.plants?.some(p=>p.id===spell.targetPlantId&&p.alive))pending=add(pending,subtract(spell.power.amount,spell.power.consumed??zero()));
    }
    else for(const e of [...(s.plants??[]),...(s.crates??[])])if(e.multiplyPower?.day===Number(day)&&e.alive!==false&&!e.delivered&&!e.multiplyPowerSettled)pending=add(pending,e.multiplyPower.amount);
    return [kind,{...a,available:subtract(a.budget,a.committed),pending,forfeited:subtract(subtract(a.committed,a.consumed),pending),unpaidFraction:subtract(a.liquidated,rational(a.paid))}];
  }));
}
export function validateAgriculturalPower(s){
  if(s.agriculturalPower===undefined){
    if([...s.plants,...s.crates].some(e=>e.multiplyPower||e.growthPowerCommitted)||s.spells.some(e=>e.power))throw new Error('Potencia sin presupuesto espiritual');
    return;
  }
  const root=s.agriculturalPower;
  if(root.version!==1||!root.days||typeof root.days!=='object'||Array.isArray(root.days))throw new Error('Presupuesto espiritual inválido');
  const exact=v=>v&&typeof v.n==='string'&&/^\d+$/.test(v.n)&&typeof v.d==='string'&&/^[1-9]\d*$/.test(v.d);
  for(const [day,accounts] of Object.entries(root.days)){
    if(!/^[1-9]\d*$/.test(day)||!Number.isSafeInteger(Number(day))||Number(day)>s.day)throw new Error('Jornada espiritual inválida');
    for(const kind of ['growth','multiply']){
      const a=accounts[kind];
      if(!a||!['budget','requested','committed','consumed','liquidated'].every(key=>exact(a[key]))||!/^\d+$/.test(a.paid)||!Number.isSafeInteger(a.applications)||a.applications<0)throw new Error('Contabilidad espiritual inválida');
      const expected=divide(multiply(a.requested,AGRICULTURAL_POWER[kind]),add(a.budget,a.requested));
      if(compare(a.budget,rational(AGRICULTURAL_POWER[kind]))||compare(a.committed,expected)||compare(a.consumed,a.committed)>0||compare(a.liquidated,a.consumed)>0||floor(a.liquidated)!==BigInt(a.paid))throw new Error('Límite espiritual inválido');
    }
  }
  for(const p of s.plants){
    if(p.growthPowerCommitted&&(!exact(p.growthPowerCommitted)||compare(p.growthPowerCommitted,rational(15))>0))throw new Error('Potencia individual inválida');
  }
  const pending=new Map();
  for(const e of [...s.plants,...s.crates])if(e.multiplyPower){
    const power=e.multiplyPower,a=root.days[power.day]?.multiply;
    if(!a||!exact(power.amount)||compare(power.amount,a.committed)>0)throw new Error('Cosecha espiritual inválida');
    if(!e.multiplyPowerSettled)pending.set(power.day,add(pending.get(power.day)??zero(),power.amount));
  }
  for(const [day,amount] of pending)if(compare(add(root.days[day].multiply.liquidated,amount),root.days[day].multiply.committed)>0)throw new Error('Compromiso espiritual duplicado');
  for(const spell of s.spells)if(spell.power){
    const power=spell.power,a=root.days[power.day]?.[spell.kind];
    if(!a||!exact(power.amount)||compare(power.amount,a.committed)>0||!Number.isFinite(power.intensity)||power.intensity<0||power.intensity>1)throw new Error('Efecto espiritual inválido');
    if(power.consumed&&(!exact(power.consumed)||compare(power.consumed,power.amount)>0))throw new Error('Consumo espiritual inválido');
  }
}
