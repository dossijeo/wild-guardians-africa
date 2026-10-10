// Capacity bounds from production composition/hit rules, not a loss simulation.
import {BALANCE as B} from '../src/simulation/balance.js';
import {compositions,animalSpec} from '../src/simulation/rules.js';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
export function capacityAudit(){
 const tiers=B.threat_tiers.map(t=>{
  const legal=[];
  for(let budget=t.threat_min;budget<=t.threat_max;budget++)for(const group of compositions(budget,t.unlocked_species)){
   const hits=group.reduce((n,id)=>n+animalSpec(id).hit_budget_max,0),damage=group.reduce((n,id)=>n+animalSpec(id).hit_budget_max*animalSpec(id).structure_hit_damage,0);
   legal.push({budget,group,hits,structureDamage:damage,maxFreshCropKills:Math.floor(hits/2),maxAlreadyWoundedCropKills:hits});
  }
  const strongest=legal.reduce((a,b)=>!a||b.hits>a.hits?b:a,null);
  return {attractionMin:t.attraction_min,attractionMax:t.attraction_max_exclusive,legalEntries:legal.length,maxAnimals:Math.max(...legal.map(v=>v.group.length)),strongest,maxStructureDamage:Math.max(...legal.map(v=>v.structureDamage))};
 });
 const maxHits=Math.max(...tiers.map(t=>t.strongest.hits)),maxKills=Math.floor(maxHits/2),perAnimalMax=Math.max(...B.animals.map(a=>a.hit_budget_max));
 const references=[];
 for(const night of [1,50,100])for(const plants of [60,100,200,400,600]){
  // Integer numerator avoids ceil(110.00000000000001) inventing a victim.
  const unprotectedNumerator=2057+7*(night-1),unprotectedFraction=unprotectedNumerator/10000,protectedFraction=(351+night-1)/10000,targetKills=Math.ceil(plants*unprotectedNumerator/10000);
  references.push({night,plants,unprotectedFraction,protectedFraction,targetKills,freshCropHitsRequired:targetKills*2,alreadyWoundedHitsRequired:targetKills,optimisticMinimumAnimals:Math.ceil(targetKills*2/perAnimalMax),currentMaximumFreshCropLossFraction:maxKills/plants,defenseExpenseReference:12+.42*plants+.003*plants**2});
 }
 return {scope:'Native-rule upper capacity bounds, not realized damage, economic projection or campaign acceptance',tiers,maxHits,maxFreshCropKills:maxKills,perAnimalMax,references,
 caveats:['Each native hit affects one target; fresh crops require two hits. Already wounded crops may need one, so the fresh bound cannot be applied to wounded stock.','Hits spent on walls, shields, workers, misses, inaccessible targets and travel lower realized crop damage. No negative loss or exposure factor is applied.','Introductory nights have one species and the native 20% destruction safeguard; full-tier capacity must not be attributed to night1.','Optimistic animal minimum assumes every animal has the globally largest hit budget and all hits become crop hits, ignoring unlocks, composition and frequency. It is a lower bound, not a recommended horde.']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const r=capacityAudit(),out=process.argv[2];mkdirSync(out,{recursive:true});
 const paths=['tools/audit-native-raid-capacity.mjs','src/simulation/rules.js','src/simulation/balance.js','src/simulation/raids.js'];
 r.sourceHashes=Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(new URL('../'+p,import.meta.url))).digest('hex')]));
 writeFileSync(out+'/capacity.json',JSON.stringify(r,null,2)+'\n');
 writeFileSync(out+'/capacity.md',['# Capacidad destructiva de las incursiones actuales','',
 '**Cota de las reglas nativas, no campaña ni porcentaje aplicado a cultivos.** Se enumeran las composiciones legales actuales y presupuestos máximos de golpes. No se modifican cantidad, daño, salarios, precios ni RNG.', '',
 '| Atracción mínima | Máximo animales | Máximo golpes | Máximo cultivos nuevos destruidos | Máximo daño estructural |','|---:|---:|---:|---:|---:|',...r.tiers.map(t=>`| ${t.attractionMin} | ${t.maxAnimals} | ${t.strongest.hits} | ${t.strongest.maxFreshCropKills} | ${t.maxStructureDamage} |`),'',
 '## Objetivos orientativos sin defensa', '',
 '| Noche | Plantas | Objetivo destruido | Golpes necesarios si sanas | Animales mínimos optimistas | Gasto defensivo de referencia |','|---:|---:|---:|---:|---:|---:|',...r.references.map(v=>`| ${v.night} | ${v.plants} | ${v.targetKills} | ${v.freshCropHitsRequired} | ${v.optimisticMinimumAnimals} | ${v.defenseExpenseReference.toFixed(2)} |`),'',
 ...r.caveats.map(c=>'- '+c),'',
 'La tabla de noche1 muestra sólo el objetivo solicitado; no propone saltarse la introducción ni su protección. La calibración real debe medir heridas iniciales/finales, uso de presupuesto, golpes interceptados y destrucción efectiva por especie. No basta aumentar daño a edificios para alcanzar destrucción agrícola: ese daño no se aplica a plantas.', '',
 'La composición actual es insuficiente para pérdidas de20–27,5% sobre cientos de plantas sanas: hay que estudiar grupos mayores u oleadas manteniendo golpes nativos, geometría, animación y comportamiento. No se elige una nueva cifra hasta comprobar espacio de entrada, tráfico, daño efectivo y gastos físicos de murallas. La cota optimista no justifica por sí sola una configuración de hordas.'
 ].join('\n')+'\n');
 console.log(JSON.stringify({tiers:r.tiers,maxHits:r.maxHits,maxFreshCropKills:r.maxFreshCropKills,night100400:r.references.find(v=>v.night===100&&v.plants===400)}));
}
