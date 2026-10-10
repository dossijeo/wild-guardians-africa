// Aggregate accounting equations, not a game simulation or seeded raid replay.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const money=x=>Number(x.n)/Number(x.d);
const read=p=>JSON.parse(gunzipSync(readFileSync(p)));
export function compositionExpectation(B,budget,unlocked,stage){
 const species=B.animals.filter(a=>unlocked.includes(a.id)),rows=[];
 function visit(i,cost,count,hits,damage){
  if(i===species.length){if(count>=stage.min_animals&&cost>=Math.ceil(.75*budget)&&cost<=budget)rows.push({count,hits,damage});return;}
  const a=species[i],cap=stage.species_caps[B.animals.indexOf(a)];
  for(let n=0;n<=cap&&count+n<=stage.max_animals&&cost+n*a.threat_cost<=budget;n++)visit(i+1,cost+n*a.threat_cost,count+n,hits+n*(a.hit_budget_min+a.hit_budget_max)/2,damage+n*(a.hit_budget_min+a.hit_budget_max)/2*a.structure_hit_damage);
 }
 visit(0,0,0,0,0);
 if(!rows.length&&stage.min_animals>1)return compositionExpectation(B,budget,unlocked,{...stage,min_animals:1});
 if(!rows.length)throw Error('No legal arithmetic composition');
 return {animals:rows.reduce((n,r)=>n+r.count,0)/rows.length,hits:rows.reduce((n,r)=>n+r.hits,0)/rows.length,min:Math.min(...rows.map(r=>r.count)),max:Math.max(...rows.map(r=>r.count)),damage:rows.reduce((n,r)=>n+r.damage,0)/rows.length};
}
export function nightlyExpectation(B,day,value){
 if(day<=5){const a=B.animals[day-1];return {animals:1,min:1,max:1,hits:a.hit_budget_min,damage:a.hit_budget_min*a.structure_hit_damage};}
 const tier=B.threat_tiers.find(t=>value>=t.attraction_min&&(t.attraction_max_exclusive===null||value<t.attraction_max_exclusive));
 const stage=B.raids.night_horde_stages.find(s=>day>=s.first&&day<=s.last),rows=[];
 for(let raw=tier.threat_min;raw<=tier.threat_max;raw++)rows.push(compositionExpectation(B,Math.ceil(raw*stage.budget_scale),tier.unlocked_species,stage));
 return {animals:rows.reduce((n,r)=>n+r.animals,0)/rows.length,hits:rows.reduce((n,r)=>n+r.hits,0)/rows.length,min:Math.min(...rows.map(r=>r.min)),max:Math.max(...rows.map(r=>r.max)),damage:rows.reduce((n,r)=>n+r.damage,0)/rows.length};
}
export function calibrate(report,state){
 let previousMoney=700,previousPlants=1;
 const rows=report.daily.map(d=>{
  const commands=report.commands.filter(c=>c.day===d.day);
  const paid=kind=>commands.filter(c=>c.kind===kind).reduce((n,c)=>n-money(state.ledger.entries[c.id]??{n:0,d:1}),0);
  const seeds=paid('plant'),wages=paid('hire'),income=d.money-previousMoney+seeds+wages;
  const row={day:d.day,harvest:d.delivered,exposureStock:previousPlants+.5*d.planted,staff:d.staff,seeds,income};
  previousMoney=d.money;previousPlants=d.living;return row;
 });
 const sum=(items,key)=>items.reduce((n,r)=>n+r[key],0);
 const band=(first,last)=>{const a=rows.filter(r=>r.day>=first&&r.day<=last);return {first,last,harvestFraction:sum(a,'harvest')/sum(a,'exposureStock'),deliveriesPerWorker:sum(a,'harvest')/sum(a,'staff'),realizedPayout:sum(a,'income')/sum(a,'harvest')};};
 const crateTotal=state.crates.filter(c=>c.delivered).reduce((n,c)=>n+money(c.value),0),reconstructed=sum(rows,'income');
 if(Math.abs(crateTotal-reconstructed)>1e-6)throw Error('Reference income does not reconcile with delivered crates');
 return {early:band(2,9),late:band(13,20),incomeReconciliation:{reconstructed,crateTotal},opening:report.daily[0],scope:'Calibration from earlier original 20-night neglect run; no new native simulation. Travel, queues, magic and events are aggregated, not re-created.'};
}
export function project(B,calibration,{arm='responsible',cropExposure=.1,days=100}={}){
 const rows=[],wall=B.walls.find(w=>w.id==='zarzas');
 let cash=1500-800,plants=1,meanBase=33,meanPayout=33,peak=1,halfSpan=0,walls=0;
 const mixSeed=B.crops.reduce((n,c)=>n+c.plant_cost,0)/8,mixBase=B.crops.reduce((n,c)=>n+c.base_harvest_value,0)/8;
 for(let day=1;day<=days;day++){
  const before=cash,startPlants=plants;
  const staff=day===1?7:Math.max(1,Math.ceil(plants/6)),wages=staff*30;
  if(cash<wages){rows.push({day,arm,status:'sin dinero para el jornal estimado',cash,plants,walls,animals:null,force:null});break;}
  const mixed=day>=10&&cash>1000,seed=mixed?mixSeed:5,base=mixed?mixBase:33;
  const q=mixed?calibration.late.harvestFraction:calibration.early.harvestFraction;
  const capacity=staff*(mixed?calibration.late.deliveriesPerWorker:calibration.early.deliveriesPerWorker);
  let chosen=null;
  // Close each daily ledger and preserve next-day wages; no negative credit.
  for(let planted=day===1?116:280;planted>=0;planted--){
   if(day===1&&planted!==116)continue;
   const stock=plants+planted,newMean=(plants*meanBase+planted*base)/stock;
   const payout=(plants*meanPayout+planted*(mixed?calibration.late.realizedPayout:33))/stock;
   const harvested=day===1?25:Math.min(stock,Math.floor(Math.min(capacity,q*(plants+.5*planted))));
   const preRaid=stock-harvested,desiredSpan=Math.ceil((Math.sqrt(Math.max(peak,preRaid)*2.25)/2+3)/6)*6;
   const newWalls=arm==='responsible'&&day>=2&&desiredSpan>halfSpan?Math.ceil(8*desiredSpan/2.18):0;
   const income=Math.floor(harvested*payout),seedCost=Math.ceil(planted*seed)+(day===1?5:0),wallCost=newWalls*wall.cost;
   const after=cash-wages+income-seedCost-wallCost,reserve=Math.ceil(preRaid/6)*30+100;
   if(after>=reserve||day===1){chosen={planted,harvested,preRaid,newMean,payout,desiredSpan,newWalls,income,seedCost,wallCost,after};break;}
  }
  if(!chosen)chosen={planted:0,harvested:Math.min(plants,Math.floor(Math.min(capacity,q*plants))),preRaid:plants,newMean:meanBase,payout:meanPayout,desiredSpan:halfSpan,newWalls:0,income:0,seedCost:0,wallCost:0,after:cash-wages};
  // A zero-investment fallback still delivers its calculated mature fraction.
  if(chosen.harvested&&chosen.income===0){chosen.preRaid-=chosen.harvested;chosen.income=Math.floor(chosen.harvested*meanPayout);chosen.after+=chosen.income;}
  peak=Math.max(peak,chosen.preRaid);walls+=chosen.newWalls;if(chosen.newWalls)halfSpan=chosen.desiredSpan;
  const value=chosen.preRaid*chosen.newMean,raid=nightlyExpectation(B,day,value);
  const targets=day<=5?1:Math.floor(1+7*value/(value+10000)),force=day<=5||value<60000?1:2;
  const enclosed=arm==='responsible'&&halfSpan>=chosen.desiredSpan&&walls>0;
  const exposure=enclosed?cropExposure:.9;
  const killed=Math.min(chosen.preRaid,Math.floor(raid.hits*.9*exposure*.85*targets*force/2),day<=5?Math.max(0,Math.min(chosen.preRaid-1,Math.ceil(chosen.preRaid*.2))):Infinity);
  // Amortized repair estimate, not per-worker native receipt timing.
  const repairWanted=enclosed?Math.ceil(raid.damage*.9*(1-exposure)*.85/wall.hp*wall.cost):0;
  const repair=Math.min(Math.max(0,chosen.after-30),repairWanted);
  cash=chosen.after-repair;plants=chosen.preRaid-killed;meanBase=chosen.newMean;meanPayout=chosen.payout;
  rows.push({day,arm,status:'proyección',cash,plants,walls,newWalls:chosen.newWalls,animals:raid.animals,animalMin:raid.min,animalMax:raid.max,force,targets,value,planted:chosen.planted,harvested:chosen.harvested,killed,staff,wages,income:chosen.income,seeds:chosen.seedCost,wallCost:chosen.wallCost,repairs:repair,unfundedRepair:repairWanted-repair,cropExposure:exposure,ledgerDelta:cash-before});
 }
 return rows;
}
export function generate(reference,output){
 const frozen=read(join(reference,'frozen-source-files.json.gz'));
 const text=Buffer.from(frozen.files['src/simulation/balance.js'].base64,'base64').toString('utf8');
 const B=JSON.parse(text.split('export const BALANCE = ')[1].trim().replace(/;\s*$/,''));
 const reportPath=join(reference,'native-original/neglect/native-report.json.gz'),statePath=join(reference,'native-original/neglect/native-state.json.gz');
 const calibration=calibrate(read(reportPath),read(statePath));
 const responsible=project(B,calibration),neglect=project(B,calibration,{arm:'neglect'});
 const sensitivity=[.1,.3,.5,.9].map(exposure=>{const r=project(B,calibration,{cropExposure:exposure});return {cropExposure:exposure,day100:r.at(-1),scope:'Assumed defense exposure, not measured interception probability'};});
 const terminalNeglect=neglect.at(-1),netPerDelivery=calibration.late.realizedPayout-30/calibration.late.deliveriesPerWorker;
 const breakEven={scope:'Stationary late accounting approximation, not a forecast of death probability',lateNetPerDeliveryAfterLabour:netPerDelivery,mixedSeedCost:B.crops.reduce((n,c)=>n+c.plant_cost,0)/8,requiredKillsAt280SeedsPerDay:280-280*(B.crops.reduce((n,c)=>n+c.plant_cost,0)/8)/netPerDelivery,currentProjectedKills:terminalNeglect.killed,currentProjectedDailyNet:terminalNeglect.ledgerDelta};
 const data={scope:'Mathematical aggregate 100-day forecast, not native simulation or survival probability',reference,hashes:Object.fromEntries([reportPath,statePath].map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),balanceSourceSHA256:createHash('sha256').update(text).digest('hex'),referenceBalance:B,calibration,fixed:{start:1500,center:800,elder:30,young:40},responsible,neglect,sensitivity,breakEven};
 mkdirSync(output,{recursive:true});writeFileSync(join(output,'projection.json'),JSON.stringify(data,null,2)+'\n');
 const table=rows=>['| Día | Dinero al cierre | Plantas vivas tras incursión | Murallas acumuladas (nuevas) | Animales nocturnos: media [rango] | Fuerza por planta | Plantas máx./golpe |','|---:|---:|---:|---:|---:|---:|---:|',...rows.map(r=>`| ${r.day} | ${r.cash} | ${r.plants} | ${r.walls} (${r.newWalls??0}) | ${r.animals===null?'—':r.animals.toFixed(2)+' ['+r.animalMin+'–'+r.animalMax+']'} | ${r.force===null?'—':'×'+r.force} | ${r.targets??'—'} |`)].join('\n');
 const md=`# Proyección matemática de 100 días\n\n**Estimación contable, no resultado de una simulación del juego.** Candidata área12 sobre economía e040: mijo33, centro800, dinero inicial1500, jornales30/40. No describe los precios actuales de main. Dinero y plantas se muestran al terminar la incursión nocturna. Murallas incluye todas las construidas, también los perímetros interiores retenidos. La fuerza es el incremento de daño a cada planta (necesita2); el daño a edificios permanece×1.\n\n## Supuestos y ecuaciones\n\n- Día1:117 brotes iniciales/totales,25 entregas,7 jornales; 1500−800−210−585+825=730. Es ancla del piloto original ya disponible, no una nueva simulación.\n- Hasta día9 mijo; desde día10 mezcla uniforme de ocho especies si hay más de1000 monedas. Máximo280 nuevas siembras/día, un trabajador por6 plantas de inicio y reserva del siguiente jornal+100.\n- Entregas estimadas=min(stock, capacidad medida por trabajador, q×(stock inicial+0,5×nuevas siembras)). q y valor realizado proceden del piloto original: días2–9 y13–20. No se modelan individualmente crecimiento, FIFO, viaje, agua o selección de magia. La mezcla se aproxima proporcionalmente; no se inventan cosechas sin reflejar la reducción del stock.\n- Caja final=caja inicial−jornales−semillas−murallas−reparaciones+entregas. Cada día se escoge la mayor plantación que cubra su reserva contable. Esto no prueba que los cobros intradía lleguen a tiempo.\n- Murallas: perímetro cuadrado estimado con1,5m entre cultivos, margen3m, cuantización6m, módulo2,18m y zarzas10. Cada ampliación paga un nuevo anillo completo; no se reutiliza ni reembolsa el anterior. No comprueba terreno, huecos o puertas.\n- Hordas: media exacta de las composiciones legales uniformes y del presupuesto entero uniforme del tier; primeras5 noches una especie nueva con golpes mínimos. El número real de una partida será entero y dependerá del RNG.\n- Alcance por golpe=floor(1+7V/(V+10000)), V=valor base de plantas vivas antes de la incursión; fuerza1 hasta V60000 y2 después, siempre1/una planta en primeras5 noches.\n- Muertes estimadas=floor(golpes×0,9 uso×exposición×0,85 tras escudo×alcance×fuerza/2), limitado al stock y al máximo introductorio. Es una aproximación de hits acumulados, no garantiza que dos golpes coincidan en una planta.\n- Buena defensa supone exposición0,1 sólo si financia el perímetro; descuido0,9. **Esta eficacia no está demostrada.** Reparación amortizada proporcional a golpes interceptados y daño; puede subestimar redondeos por pieza y no modela colapso.\n- No se incluyen incursiones diurnas, eventos agrícolas aleatorios, destrucción del centro, accidentes ni daños heterogéneos por especie a cultivos. No estima inactividad ni acredita victoria/derrota.\n\n## Defensas cuidadas\n\n${table(responsible)}\n\n## Defensas descuidadas\n\n${table(neglect)}\n\n## Sensibilidad de la hipótesis de protección\n\n${sensitivity.map(s=>`- Exposición ${Math.round(s.cropExposure*100)}%: día ${s.day100.day}, dinero ${s.day100.cash}, plantas ${s.day100.plants}.`).join('\n')}\n\nTodos los flujos, calibraciones y hashes originales están en projection.json. Una caja creciente en el escenario descuidado rechaza esta proyección como fórmula suficiente para inducir derrota económica; no debe corregirse el modelo para forzar el resultado deseado.\n`;
 writeFileSync(join(output,'projection.md'),md);return data;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const r=generate(process.argv[2],process.argv[3]);console.log(JSON.stringify({calibration:r.calibration,responsible:r.responsible.filter(r=>[1,5,10,20,40,60,80,100].includes(r.day)),neglect:r.neglect.filter(r=>[1,5,10,20,40,60,80,100].includes(r.day))},null,2));}
