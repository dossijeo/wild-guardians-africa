// Exact composition statistics without materializing every legal group.
import {BALANCE as B} from '../src/simulation/balance.js';
import {pathToFileURL} from 'node:url';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export function estimateNativeHorde(budget,unlocked=B.animals.map(a=>a.id)){
 if(B.raids.max_animals!==null)throw Error('Estimator requires unlocked global animal limit');
 if(!Number.isSafeInteger(budget)||budget<1)throw Error('Positive integer budget required');
 let states=new Map([[0,{ways:1,count:0,hits:0,rolledHits:0,damage:0,maxHits:0,maxAnimals:0}]]);
 for(const a of B.animals.filter(a=>unlocked.includes(a.id))){
  const next=new Map();
  for(const [cost,v] of states)for(let n=0;n<=Math.floor((budget-cost)/a.threat_cost);n++){
   if(a.max_per_raid!==null&&n>a.max_per_raid)break;
   const c=cost+n*a.threat_cost,t=next.get(c)??{ways:0,count:0,hits:0,rolledHits:0,damage:0,maxHits:0,maxAnimals:0};
   t.ways+=v.ways;t.count+=v.count+n*v.ways;t.hits+=v.hits+n*a.hit_budget_max*v.ways;t.rolledHits+=v.rolledHits+n*(a.hit_budget_min+a.hit_budget_max)/2*v.ways;t.damage+=v.damage+n*a.hit_budget_max*a.structure_hit_damage*v.ways;
   t.maxHits=Math.max(t.maxHits,v.maxHits+n*a.hit_budget_max);t.maxAnimals=Math.max(t.maxAnimals,v.maxAnimals+n);next.set(c,t);
  }
  states=next;
 }
 const eligible=[...states].filter(([cost])=>cost>=Math.ceil(.75*budget)).map(([,v])=>v),ways=eligible.reduce((n,v)=>n+v.ways,0);
 if(!Number.isSafeInteger(ways))throw Error('Composition count exceeds exact numeric range');
 return {budget,unlocked,compositions:ways,meanAnimals:eligible.reduce((n,v)=>n+v.count,0)/ways,meanMaximumHits:eligible.reduce((n,v)=>n+v.hits,0)/ways,meanRolledHits:eligible.reduce((n,v)=>n+v.rolledHits,0)/ways,meanMaximumStructureDamage:eligible.reduce((n,v)=>n+v.damage,0)/ways,maxAnimals:Math.max(...eligible.map(v=>v.maxAnimals)),maxHits:Math.max(...eligible.map(v=>v.maxHits))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const sourceHashes=Object.fromEntries(['src/simulation/balance.js','src/simulation/rules.js','tools/estimate-native-horde-budgets.mjs'].map(p=>[p,createHash('sha256').update(readFileSync(new URL('../'+p,import.meta.url))).digest('hex')]));
 const rows=[14,24,36,48,60,72,96,132].map(b=>estimateNativeHorde(b)),out=process.argv[2];mkdirSync(out,{recursive:true});
 writeFileSync(out+'/horde-budget-estimates.json',JSON.stringify({scope:'Exact uniform-composition capacity estimates only; no native campaign, no production parameter change',sourceHashes,rows},null,2)+'\n');
 writeFileSync(out+'/horde-budget-estimates.md',['# Presupuestos candidatos: capacidad previa a pilotos','',
 'Se cuentan exactamente las composiciones legales sin crear los arrays de animales. Coincide con selección uniforme de compositions(), especies completas y costes vigentes sin límites por especie. No incluye introducciones, movilidad, frecuencia de golpe, escudos ni intercepción. Se separan la media de golpes sorteados (intervalo nativo uniforme) y la media de máximos posibles; ninguna es daño efectivo ni cosechas destruidas. No modifica producción.','',
 '| Presupuesto | Composiciones | Animales medios | Máximo animales | Golpes sorteados medios | Golpes máximos medios | Máximo golpes |','|---:|---:|---:|---:|---:|---:|---:|',...rows.map(r=>`| ${r.budget} | ${r.compositions} | ${r.meanAnimals.toFixed(2)} | ${r.maxAnimals} | ${r.meanRolledHits.toFixed(2)} | ${r.meanMaximumHits.toFixed(2)} | ${r.maxHits} |`),'',
 'La enumeración actual materializa todas las composiciones. Antes de adoptar presupuestos altos debe medirse ese coste o seleccionar una composición uniformemente mediante conteos dinámicos, conservando RNG y probabilidades. Las entradas físicas y gastos económicos deben validarse con el motor. El presupuesto no debe variar por estrategia ni riqueza.'
 ].join('\n')+'\n');console.log(JSON.stringify(rows));
}
