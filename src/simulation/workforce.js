import {BALANCE} from './balance.js';
import {rational,rationalNumber,add,negate,multiply} from './money.js';
export const PROFILES = [
  {id:'olderMale',name:'Hombre mayor',wage:BALANCE.workers.older_wage,speed:1,male:true,end:250},
  {id:'olderFemale',name:'Mujer mayor',wage:BALANCE.workers.older_wage,speed:1,male:false,end:300},
  {id:'youngMale',name:'Hombre joven',wage:BALANCE.workers.young_wage,speed:1.5,male:true,end:250},
  {id:'youngFemale',name:'Mujer joven',wage:BALANCE.workers.young_wage,speed:1.5,male:false,end:300},
];
export const contractExpired=(worker,state)=>Number.isSafeInteger(worker.contractDay)&&worker.contractDay<state.day;
const stable=(a,b)=>a.created-b.created || a.id.localeCompare(b.id);
export function allocateWorkers(centers,total) {
  if(!Number.isSafeInteger(total)||total<0) throw new Error('Plantilla inválida');
  const list=[...centers].sort(stable);
  const result=Object.fromEntries(list.map(c=>[c.id,0]));
  if(!list.length) return result;
  if(total<list.length) {
    [...list].sort((a,b)=>b.plants-a.plants||stable(a,b)).slice(0,total).forEach(c=>result[c.id]=1);
    return result;
  }
  list.forEach(c=>result[c.id]=1);
  const remaining=total-list.length;
  const sum=list.reduce((s,c)=>s+c.plants,0);
  if(!sum) {
    list.forEach((c,i)=>result[c.id]+=Math.floor(remaining/list.length)+(i<remaining%list.length?1:0));
    return result;
  }
  const residues=[];
  let spent=0;
  for(const c of list) {
    const numerator=BigInt(remaining)*BigInt(c.plants);
    const extra=Number(numerator/BigInt(sum));
    result[c.id]+=extra; spent+=extra;
    residues.push({c,remainder:numerator%BigInt(sum)});
  }
  residues.sort((a,b)=>a.remainder===b.remainder?stable(a.c,b.c):a.remainder>b.remainder?-1:1);
  residues.slice(0,remaining-spent).forEach(({c})=>result[c.id]++);
  return result;
}
export function hiringCost(selection,{time=0}={}) {
  if(!Number.isFinite(time)||time<0)throw new Error('Hora de contratación inválida');
  if(Object.keys(selection).some(id=>!PROFILES.some(p=>p.id===id))) throw new Error('Perfil desconocido');
  const elapsed=rationalNumber(time);
  const cost=PROFILES.reduce((sum,p)=>{
    const count=selection[p.id]??0;
    if(!Number.isSafeInteger(count)||count<0) throw new Error('Cantidad inválida');
    if(count&&time>=p.end)throw new Error('La jornada de este perfil ya ha terminado');
    if(!count)return sum;
    // Calculate the remaining shift exactly, then round the complete bill once.
    // Floating subtraction made 30 * (1 - 100/300) charge 21 instead of 20.
    return add(sum,multiply(add(rational(p.end),negate(elapsed)),BigInt(count)*BigInt(p.wage),p.end));
  },rational(0));
  const whole=(BigInt(cost.n)+BigInt(cost.d)-1n)/BigInt(cost.d);
  if(whole>BigInt(Number.MAX_SAFE_INTEGER))throw new Error('Coste de contratación no representable');
  return Number(whole);
}
export function distributeProfiles(quotas,selection) {
  const centers=Object.keys(quotas);
  const result=Object.fromEntries(centers.map(id=>[id,[]]));
  // Apportion each profile across remaining capacity. Filling small centers
  // first would concentrate later profiles in the largest center.
  for(const p of PROFILES) {
    const available=centers.map((id,index)=>({id,index,free:quotas[id]-result[id].length}));
    const capacity=available.reduce((sum,c)=>sum+c.free,0);
    if(!capacity)return result;
    const count=Math.min(selection[p.id]??0,capacity);
    let assigned=0;
    for(const c of available){
      const numerator=BigInt(count)*BigInt(c.free);
      c.count=Number(numerator/BigInt(capacity));c.remainder=numerator%BigInt(capacity);assigned+=c.count;
    }
    available.sort((a,b)=>a.remainder===b.remainder?a.index-b.index:a.remainder>b.remainder?-1:1);
    for(const c of available.slice(0,count-assigned))c.count++;
    for(const c of available)for(let i=0;i<c.count;i++)result[c.id].push(p.id);
  }
  return result;
}
