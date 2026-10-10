// Deterministic accounting recurrence, not a replay of the native simulation.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {nightlyExpectation} from './project-campaign-accounting.mjs';
export function seedQuote(baseCost,livingPlants,{plantsPerStep=200,slope=1,freePlants=100}={}) {
 if(!Number.isSafeInteger(baseCost)||baseCost<=0||!Number.isSafeInteger(livingPlants)||livingPlants<0||!Number.isFinite(plantsPerStep)||plantsPerStep<=0||!Number.isFinite(slope)||slope<0||!Number.isSafeInteger(freePlants)||freePlants<0)throw Error('Invalid scarcity parameters');
 return Math.ceil(baseCost*(1+slope*Math.max(0,livingPlants-freePlants)/plantsPerStep));
}
export function seedPurchaseReserve(livingPlants,policy=null) {
 if(!Number.isSafeInteger(livingPlants)||livingPlants<0)throw Error('Invalid living plant count');
 return livingPlants===0?0:policy?Math.max(30,Math.ceil((livingPlants+1)/6)*30*policy.reserveDays):30;
}
export function estimate(input,{days=100,scale=.475,wallCost=3,exposure=.1,defend=true,scarcity=null,policy=null,onHarvest=null,onSeedPurchase=null,onCropLoss=null,maintenance=false,postgame=null}={}) {
 if(policy&&(!Number.isFinite(policy.reserveDays)||policy.reserveDays<0||!['fixed-budget','perimeter-budget'].includes(policy.walls)))throw Error('Invalid estimate policy');
 const B=structuredClone(input.referenceBalance),original=Object.fromEntries(B.crops.map(c=>[c.id,c.base_harvest_value]));
 for(const c of B.crops)c.base_harvest_value=Math.ceil(c.base_harvest_value*scale);
 const cohorts=[{species:'mijo',count:1,readyDay:2}],rows=[];
 let cash=1500-800-5,walls=0,seedIndex=0,deliveryCarry=0,lossCarry=0,peakStock=1;
 let wallPool=[],replacementDebt=0,postgamePlantTarget=null;
 const wallHP=B.walls.find(w=>w.id==='zarzas').hp;
 const stock=()=>cohorts.reduce((n,c)=>n+c.count,0);
 for(let day=1;day<=days;day++) {
  const isPostgame=postgame&&day>=postgame.fromDay;
  if(isPostgame&&postgamePlantTarget===null)postgamePlantTarget=postgame.holdField?stock():Infinity;
  const before=cash,openingPlants=stock(),recoveryMinimum=openingPlants?30:35;
  if(cash<recoveryMinimum) {
   rows.push({day,cash,plants:openingPlants,walls,status:'below simplified recovery minimum; not native defeat',animals:null,force:null});
   continue;
  }
  // Pay wages from opening cash. Keep seed liquidity when the field is empty.
  const staff=Math.min(day===1?7:Math.max(1,Math.ceil(openingPlants/6)),Math.floor((cash-(openingPlants?0:5))/30));
  const wages=staff*30;cash-=wages;
  // No sale of today's seedlings. Only explicitly age-eligible cohorts deliver.
  const deliveryRate=policy?.deliveryBand==='calendar'&&day>=10?input.calibration.late.deliveriesPerWorker:input.calibration.early.deliveriesPerWorker;
  const throughput=staff*deliveryRate+deliveryCarry;
  let remaining=Math.floor(throughput),harvested=0,income=0;
  const mature=cohorts.filter(c=>c.readyDay<=day).reduce((n,c)=>n+c.count,0);
  deliveryCarry=mature>remaining?throughput-remaining:0;
  for(const cohort of cohorts)if(cohort.readyDay<=day&&remaining>0) {
   const count=Math.min(cohort.count,remaining),crop=B.crops.find(c=>c.id===cohort.species);
   cohort.count-=count;remaining-=count;harvested+=count;income+=count*crop.base_harvest_value;
   if(count)onHarvest?.({day,species:crop.id,count,unitPayout:crop.base_harvest_value,income:count*crop.base_harvest_value});
  }
  cash+=income;
  let repairs=0;
  if(maintenance&&defend)for(const wall of wallPool)if(wall.hp<wallHP) {
   const price=Math.ceil(wallCost*(wallHP-wall.hp)/wallHP);
   const reserve=Math.max(35,Math.ceil(stock()/6)*30*(policy?.reserveDays??1));
   if(cash-price>=reserve){cash-=price;repairs+=price;wall.hp=wallHP;}
  }
  // Budgeted partial construction; wall count does not prove enclosure/protection.
  peakStock=Math.max(peakStock,stock());
  const perimeterTarget=Math.ceil(8*Math.ceil((Math.sqrt(peakStock*2.25)/2+3)/6)*6/2.18);
  const wallLimit=policy?.walls==='perimeter-budget'?Math.max(0,perimeterTarget-walls):32;
  const wallReserve=policy?Math.max(35,Math.ceil(stock()/6)*30*policy.reserveDays):35;
  const newWalls=defend&&day>=2?Math.min(32,wallLimit,Math.floor(Math.max(0,cash-wallReserve)*(policy?.wallFraction??.2)/wallCost)):0;
  const wallSpend=newWalls*wallCost;cash-=wallSpend;walls+=newWalls;
  const replacements=maintenance?Math.min(newWalls,replacementDebt):0;replacementDebt-=replacements;
  if(maintenance)for(let i=0;i<newWalls;i++)wallPool.push({hp:wallHP});
  let planted=0,seeds=0;
  // Millet through day 9, then fixed species sequence in both strategies.
  while(planted<(day===1?116:280)&&(!isPostgame||stock()<postgamePlantTarget)) {
   const crop=day<=9?B.crops.find(c=>c.id==='mijo'):B.crops[seedIndex%B.crops.length];
   const reserve=seedPurchaseReserve(stock(),policy);
   const seedCost=scarcity?seedQuote(crop.plant_cost,stock(),scarcity):crop.plant_cost;
   if(cash-seedCost<reserve)break;
   onSeedPurchase?.({day,species:crop.id,baseSeed:crop.plant_cost,unitQuote:seedCost,unitPayout:crop.base_harvest_value,livingBeforePurchase:stock()});
   cash-=seedCost;seeds+=seedCost;planted++;if(day>=10)seedIndex++;
   const readyDay=day+Math.max(1,Math.ceil(crop.growth_seconds/B.clock.day_seconds));
   const previous=cohorts.find(c=>c.species===crop.id&&c.readyDay===readyDay);
   if(previous)previous.count++;else cohorts.push({species:crop.id,count:1,readyDay});
  }
  peakStock=Math.max(peakStock,stock());
  const preRaid=stock(),value=cohorts.reduce((n,c)=>n+c.count*original[c.species],0),raid=isPostgame?{animals:0,min:0,max:0,hits:0,damage:0}:nightlyExpectation(B,day,value);
  const targets=day<=5?1:Math.floor(1+7*value/(value+10000)),force=day<=5||value<60000?1:2;
  const wallQuota=Math.ceil(8*Math.ceil((Math.sqrt(preRaid*2.25)/2+3)/6)*6/2.18);
  const effectiveExposure=maintenance?(defend&&wallPool.length>=wallQuota?exposure:.9):(defend&&walls===0?.9:exposure);
  const expected=raid.hits*.9*effectiveExposure*.85*targets*force/2+lossCarry;
  const killed=Math.min(preRaid,Math.floor(expected),day<=5?Math.max(0,Math.min(preRaid-1,Math.ceil(preRaid*.2))):Infinity);
  lossCarry=preRaid>killed?expected%1:0;
  // Approximate species selection: oldest cohorts first. No individual hit proof.
  let lost=killed;for(const c of cohorts){const n=Math.min(c.count,lost);c.count-=n;lost-=n;if(n)onCropLoss?.({day,species:c.species,count:n});}
  let wallsDestroyed=0;
  const wallDamage=maintenance?raid.damage*.9*(1-effectiveExposure)*.85:0;
  if(maintenance){
   let damage=wallDamage;
   for(const wall of wallPool){if(damage<=0)break;const applied=Math.min(damage,Math.max(0,wall.hp-wallHP*.2));wall.hp-=applied;damage-=applied;if(wall.hp<=wallHP*.2+1e-9){wall.hp=0;wallsDestroyed++;}}
   wallPool=wallPool.filter(w=>w.hp>0);walls=wallPool.length;replacementDebt+=wallsDestroyed;
  }
  rows.push({day,status:'estimate',cash,plants:stock(),walls,newWalls,animals:raid.animals,animalMin:raid.min,animalMax:raid.max,force,targets,value,openingPlants,staff,wages,income,harvested,planted,seeds,wallSpend,killed,effectiveExposure,...(maintenance?{repairs,replacements,wallsDestroyed,wallDamage,wallQuota,wallHPRemaining:wallPool.reduce((n,w)=>n+w.hp,0),replacementDebt}:{}),...(postgame?{postgame:!!isPostgame,postgamePlantTarget:Number.isFinite(postgamePlantTarget)?postgamePlantTarget:null}: {})});
  if(cash!==before-wages+income-seeds-wallSpend-repairs||stock()!==openingPlants+planted-harvested-killed)throw Error('Accounting conservation failed');
 }
 return rows;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
 const raw=readFileSync(process.argv[2]),input=JSON.parse(raw),out=process.argv[3];mkdirSync(out,{recursive:true});
 const scenarios={conditionalDefense:estimate(input),unprotected:estimate(input,{defend:false,exposure:.9}),full100Hypothesis:estimate(input,{scale:.6})};
 const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
 writeFileSync(out+'/cohort-estimate.json',JSON.stringify({scope:'100-day deterministic accounting, no native simulation or production changes',inputSHA256:hash(raw),sourceSHA256:hash(readFileSync(new URL('./campaign-cohort-estimate.mjs',import.meta.url))),scenarios},null,2)+'\n');
 const table=rows=>['| Día | Dinero | Plantas | Murallas acumuladas | Animales media [rango] | Fuerza |','|---:|---:|---:|---:|---:|---:|',...rows.map(r=>r.status!=='estimate'?`| ${r.day} | — | — | — | — | — |`:`| ${r.day} | ${r.cash} | ${r.plants} | ${r.walls} | ${r.animals.toFixed(2)} [${r.animalMin}–${r.animalMax}] | ×${r.force} |`)].join('\n');
 writeFileSync(out+'/cohort-estimate.md',['# Estimación contable revisada: 100 días','',
 'No es una simulación ni una candidata aprobada. Centro800, inicio1500, jornales30/40. La cuenta utiliza ancianos30. Ganancias de la referencia histórica×0,475 redondeadas hacia arriba; zarzas3. No cambia producción.', '',
 'Dinero y plantas al cerrar cada noche. Animales: esperanza y rango de composiciones legales; no son cantidades fraccionarias en una partida. Fuerza por cultivo; daño a edificios×1. Presión según puntos originales por especie, propuesta aún no implementada.', '',
 'Con esta política conservadora, la cuenta deja de poder reinvertir el día44 con defensa supuesta (9 monedas) y el día18 sin defensa (5 monedas). No demuestra derrota nativa ni inviabilidad de otra política. Las filas posteriores quedan desconocidas; el JSON conserva el estado al detenerse, sin seguir gastando ni inventar incursiones.', '',
 '## Supuestos explícitos', '',
 '- Mijo hasta día9; desde día10 las ocho especies en secuencia fija idéntica en ambas estrategias. Costes enteros reales. Se contrata con caja disponible. Las cosechas cobradas preceden a las nuevas compras, sin anticipar ingresos de esos brotes.',
 '- Una cohorte madura como pronto el día siguiente, o tras ceil(crecimiento/300) jornadas. Se supone riego completo y sólo crecimiento diurno; no se modelan FIFO, checkpoints ni recorridos. Es una convención conservadora de edad, no una medición de productividad.',
 '- Entregas limitadas por productividad histórica temprana por trabajador. Se cobra el precio de la especie entregada, sin mezcla ficticia ni bonos de magia/eventos.',
 '- Reserva opcional30; una finca vacía puede reinvertir sin reservar100 adicionales. Si no puede pagar jornal+semilla, se conserva el estado y se marca insuficiencia; no se siguen cobrando jornales sin trabajo.',
 '- Defensa destina20% del excedente sobre35 a hasta32 piezas/día; construcción parcial. Antes de la primera pieza, exposición90%; después10% es una hipótesis externa, NO se deduce del número de muros. No se modela cierre, puertas, deterioro ni reparación: no acredita estrategia responsable. El gasto continuado tampoco constituye una política óptima de construcción.',
 '- Sin defensa: exposición90%. Pérdidas agregadas estimadas a partir de golpes; distribución sobre cohortes antiguas primero. No acredita dos golpes físicos sobre la misma planta ni incidencia real del escudo.',
 '- No estima inactividad, agua, pérdida del centro ni probabilidad de victoria. El resultado depende de los supuestos, especialmente protección, madurez y productividad.', '',
 '## Defensa condicional (protección no demostrada)', '',table(scenarios.conditionalDefense),'',
 '## Sin defensa', '',table(scenarios.unprotected),'',
 'Las cifras sustituyen la interpretación del borrador v2, cuya falsa insolvencia y anticipación de ingresos quedan documentadas en review.md. No se acepta el balance ni se inicia una campaña con estas cuentas.'].join('\n')+'\n');
 writeFileSync(out+'/full-100-day-hypothesis.md',['# Hipótesis matemática completa: días1–100','',
 '**Ilustración condicionada, no balance elegido ni prueba de victoria.** Misma recurrencia y limitaciones de [cohort-estimate.md](cohort-estimate.md), pero ganancias60% de la referencia histórica: mijo20, girasol65, sorgo24, maíz31, batata42, algodón321, yuca58, plátano481. Semillas originales; zarzas3, centro800, inicio1500, jornales30/40.', '',
 'Dinero: disponible después de gastos, entregas e incursión. Plantas: vivas después de la incursión. Murallas: piezas acumuladas, sin acreditar cierre o deterioro. Animales: media [mínimo–máximo], no un RNG concreto. Fuerza: daño por cultivo; edificios×1. Primeras5 noches: una nueva especie cada noche. Alcance crece con valor según floor(1+7V/(V+10000)); fuerza×2 desde60000 puntos.', '',
 table(scenarios.full100Hypothesis),'',
 'Se mantiene exposición de cultivos10% desde la primera pieza como hipótesis externa. El exceso de piezas compradas, la contratación irregular y la liquidez reducida muestran que esta política requiere revisión. No debe interpretarse como demostración de estrategia responsable. La versión sin defensa al60% se queda sin capacidad de recuperación en esta cuenta el día16 con34 monedas; esa diferencia tampoco acredita derrota nativa ni robustez frente a otras políticas.', '',
 'No se ha simulado el motor, modificado precios de producción ni estimado tiempo de inactividad. Se registra una trayectoria matemática completa para revisar coherencia antes de campañas, con los supuestos a la vista.'].join('\n')+'\n');
 console.log(JSON.stringify(Object.fromEntries(Object.entries(scenarios).map(([k,r])=>[k,{first:r[0],last:r.at(-1),firstInsufficient:r.find(d=>d.status!=='estimate')??null}]))));
}
