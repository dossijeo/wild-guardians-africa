export const PROFILES = [
  {id:'olderMale',name:'Hombre mayor',wage:100,speed:1,male:true,end:250},
  {id:'olderFemale',name:'Mujer mayor',wage:100,speed:1,male:false,end:300},
  {id:'youngMale',name:'Hombre joven',wage:120,speed:1.5,male:true,end:250},
  {id:'youngFemale',name:'Mujer joven',wage:120,speed:1.5,male:false,end:300},
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
export function hiringCost(selection) {
  if(Object.keys(selection).some(id=>!PROFILES.some(p=>p.id===id))) throw new Error('Perfil desconocido');
  return PROFILES.reduce((sum,p)=>{
    const count=selection[p.id]??0;
    if(!Number.isSafeInteger(count)||count<0) throw new Error('Cantidad inválida');
    return sum+count*p.wage;
  },0);
}
export function distributeProfiles(quotas,selection) {
  const centers=Object.keys(quotas);
  const result=Object.fromEntries(centers.map(id=>[id,[]]));
  // Round-robin among centers with available quotas; no task/sex optimization.
  let cursor=0;
  for(const p of PROFILES) for(let i=0;i<(selection[p.id]??0);i++) {
    if(!centers.some(id=>result[id].length<quotas[id])) return result;
    while(result[centers[cursor%centers.length]].length>=quotas[centers[cursor%centers.length]]) cursor++;
    result[centers[cursor++%centers.length]].push(p.id);
  }
  return result;
}
