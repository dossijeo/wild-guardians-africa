// Mathematical alternatives only. Does not import game.js or tick workers.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {projectAffordable as project} from './campaign-accounting-v2.mjs';
export function screen(input){
 const rows=[];
 for(const pressureMode of ['current-price','original-species-points'])for(const scale of [1,.75,.6,.575,.55,.525,.5,.475,.45,.425,.4,.3])for(const wallCost of [10,5,3]){
  const B=structuredClone(input.referenceBalance);
  for(const crop of B.crops)crop.base_harvest_value=Math.ceil(crop.base_harvest_value*scale);
  B.walls.find(w=>w.id==='zarzas').cost=wallCost;
  const arms={};
  for(const arm of ['responsible','neglect']){
   const pressurePrices=pressureMode==='original-species-points'?Object.fromEntries(input.referenceBalance.crops.map(c=>[c.id,c.base_harvest_value])):null;
   const days=project(B,input.calibration,{arm,pressurePrices});const last=days.at(-1);
   arms[arm]={days:last.day,completed100:days.length===100&&last.status==='proyección',cash:last.cash,plants:last.plants,walls:last.walls,lateDailyNet:last.ledgerDelta??null,minCash:Math.min(...days.map(d=>d.cash)),totalHarvested:days.reduce((n,d)=>n+(d.harvested??0),0),zeroPlantingDays:days.filter(d=>d.planted===0).length,terminalStatus:last.status};
  }
  rows.push({pressureMode,scale,wallCost,prices:Object.fromEntries(B.crops.map(c=>[c.id,c.base_harvest_value])),...arms,conditionalOppositeLateMargins:arms.responsible.completed100&&arms.responsible.lateDailyNet>0&&arms.neglect.lateDailyNet<0,conditionalCashSeparation:arms.responsible.completed100&&!arms.neglect.completed100,scope:'Opposite margins or cash separation are not native survival/defeat or activity acceptance; assumed protection remains unverified.'});
 }
 return rows;
}
export function conditionalDraft(input,{exposure=.1,productivity=1}={}){
 const B=structuredClone(input.referenceBalance),calibration=structuredClone(input.calibration);
 for(const c of B.crops)c.base_harvest_value=Math.ceil(c.base_harvest_value*.475);
 B.walls.find(w=>w.id==='zarzas').cost=3;
 for(const band of ['early','late']){calibration[band].harvestFraction*=productivity;calibration[band].deliveriesPerWorker*=productivity;}
 const pressurePrices=Object.fromEntries(input.referenceBalance.crops.map(c=>[c.id,c.base_harvest_value]));
 return {prices:Object.fromEntries(B.crops.map(c=>[c.id,c.base_harvest_value])),wallCost:3,pressurePrices,exposure,productivity,responsible:project(B,calibration,{pressurePrices,cropExposure:exposure}),neglect:project(B,calibration,{arm:'neglect',pressurePrices})};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const source=process.argv[2],output=process.argv[3],raw=readFileSync(source),input=JSON.parse(raw),rows=screen(input);
 const sourceHashes=Object.fromEntries(['campaign-accounting-v2.mjs','project-campaign-accounting.mjs','screen-campaign-accounting.mjs'].map(name=>[name,createHash('sha256').update(readFileSync(new URL(name,import.meta.url))).digest('hex')]));
 mkdirSync(output,{recursive:true});writeFileSync(output+'/screen.json',JSON.stringify({sourceSHA256:createHash('sha256').update(raw).digest('hex'),sourceHashes,modelVersion:'aggregate-accounting-v2-affordable-crew-fractional-carry',rows,scope:`${rows.length} mathematical parameter alternatives; no new game simulation, no production changes`},null,2)+'\n');
 const md=['# Cribado matemático de ganancias y zarzas','', 'Centro800, inicial1500 y jornales30/40. Semillas, hordas y curva de área sin cambios. Precios de cosecha enteros=ceil(original×factor). Zarzas3/5/10 por pieza. Eficacia de defensa supuesta90%; no acreditada.','', '| Presión | Factor cosechas | Zarzas | Caja final responsable (día) | Caja final sin defensa (día) | Neto tardío responsable | Neto tardío sin defensa | Márgenes opuestos |','|:---|---:|---:|---:|---:|---:|---:|:---:|',...rows.map(r=>`| ${r.pressureMode==='current-price'?'precio actual':'puntos originales'} | ${r.scale} | ${r.wallCost} | ${r.responsible.cash} (día${r.responsible.days}) | ${r.neglect.cash} (día${r.neglect.days}) | ${r.responsible.lateDailyNet??'—'} | ${r.neglect.lateDailyNet??'—'} | ${r.conditionalOppositeLateMargins?'sí, condicional':'no'} |`),'','El modelo paga sólo trabajadores asequibles, reduce las siembras según sus reservas y cambia a mijo si cae por debajo de1000. No considera derrota necesitar menos trabajadores de los deseados. Los días sin siembra no equivalen al porcentaje de inactividad del juego. Las fracciones de cosecha/daño esperado se acumulan entre días; no son fracciones de moneda en el juego.','', 'Las tablas anteriores de c9a38ac1 se conservan. Cambiar precios también cambia la presión en el modo precio actual. El modo puntos originales propone separar amenaza y dinero: todavía no existe en producción.','', 'No se selecciona una candidata sólo por márgenes: faltan costes intradía, rutas, FIFO, agua, biomas, daños al centro, protección real y evidencia de100 noches.'].join('\n');
 writeFileSync(output+'/screen.md',md+'\n');
 const draft=conditionalDraft(input),sensitivity=[];
 for(const exposure of [.1,.2,.3,.5,.9])for(const productivity of [.8,1,1.2]){
  const r=conditionalDraft(input,{exposure,productivity});sensitivity.push({exposure,productivity,responsible:r.responsible.at(-1),neglect:r.neglect.at(-1)});
 }
 writeFileSync(output+'/conditional-draft.json',JSON.stringify({scope:'Illustrative conditional mathematical draft, not selected production balance or native acceptance',sourceHashes,...draft,sensitivity},null,2)+'\n');
 const table=values=>{
  const byDay=new Map(values.map(r=>[r.day,r]));
  return ['| Día | Dinero | Plantas vivas | Murallas (nuevas) | Animales media [rango] | Fuerza | Plantas máx./golpe |','|---:|---:|---:|---:|---:|---:|---:|',...Array.from({length:100},(_,i)=>{
   const r=byDay.get(i+1);return r?`| ${r.day} | ${r.cash} | ${r.plants} | ${r.walls} (${r.newWalls??0}) | ${r.animals?.toFixed(2)??'—'}${r.animalMin!==undefined?' ['+r.animalMin+'–'+r.animalMax+']':''} | ${r.force===null?'—':'×'+r.force} | ${r.targets??'—'} |`:`| ${i+1} | — | — | — | — | — | — |`;
  })].join('\n');
 };
 writeFileSync(output+'/conditional-draft.md',['# Borrador matemático condicional de100 días','', '**No es una candidata aprobada.** Ganancias47,5% redondeadas hacia arriba: '+JSON.stringify(draft.prices)+'. Zarzas3; otros materiales originales. Centro800, inicial1500, jornales30/40. Presión basada en puntos originales por especie, separada del dinero, con la misma curva área12/hordas. Esta separación todavía no existe en producción.','', 'Defensa supone90% de intercepción. No se ha acreditado: el piloto corto previo no registró impactos en sus murallas. No se usa esta hipótesis como hecho. Celdas— tras la interrupción del modelo no predicen dinero ni derrota en el juego.','', '## Defensas cuidadas','',table(draft.responsible),'', '## Defensas descuidadas','',table(draft.neglect),'', '## Sensibilidad','', '| Exposición cultivos | Productividad relativa | Último día responsable / caja | Último día sin defensa / caja |','|---:|---:|---:|---:|',...sensitivity.map(r=>`| ${r.exposure} | ${r.productivity} | ${r.responsible.day} / ${r.responsible.cash} | ${r.neglect.day} / ${r.neglect.cash} |`),'', 'No se estima inactividad, ni se verifica FIFO, agua, rutas, costes intradía, caja pendiente de entrega o pérdida del centro. Interrupción por menos de30 monedas es una señal contable, no un GameOver nativo.'].join('\n')+'\n');
 console.log(JSON.stringify({alternatives:rows.length,conditionalSeparation:rows.filter(r=>r.conditionalCashSeparation),draft:{responsible:draft.responsible.at(-1),neglect:draft.neglect.at(-1)},sensitivity},null,2));
}

