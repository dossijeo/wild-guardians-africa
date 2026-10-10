// Exact replay of the last table presented to the user, plus an explicitly
// separate unscaled-harvest variant. No native game or production changes.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {estimate,seedQuote} from './campaign-cohort-estimate.mjs';
export function auditedCase(input,options,scarcity=null) {
 const payouts=Object.fromEntries(input.referenceBalance.crops.map(c=>[c.id,Math.ceil(c.base_harvest_value*options.scale)]));
 const seedBases=Object.fromEntries(input.referenceBalance.crops.map(c=>[c.id,c.plant_cost]));
 const living=Object.fromEntries(input.referenceBalance.crops.map(c=>[c.id,c.id==='mijo'?1:0]));
 const traces=Array.from({length:100},()=>({}));
 const entry=(day,species)=>traces[day-1][species]??=( {harvested:0,income:0,planted:0,seeds:0,killed:0,unitPayout:payouts[species],minSeedQuote:null,maxSeedQuote:null});
 const rows=estimate(input,{...options,scarcity,
  onHarvest:e=>{assert.equal(e.unitPayout,payouts[e.species]);assert.equal(e.income,e.count*payouts[e.species]);const t=entry(e.day,e.species);t.harvested+=e.count;t.income+=e.income;living[e.species]-=e.count;},
  onSeedPurchase:e=>{assert.equal(e.unitPayout,payouts[e.species]);assert.equal(e.baseSeed,seedBases[e.species]);assert.equal(e.unitQuote,scarcity?seedQuote(seedBases[e.species],e.livingBeforePurchase,scarcity):seedBases[e.species]);const t=entry(e.day,e.species);t.planted++;t.seeds+=e.unitQuote;t.minSeedQuote=Math.min(t.minSeedQuote??e.unitQuote,e.unitQuote);t.maxSeedQuote=Math.max(t.maxSeedQuote??e.unitQuote,e.unitQuote);living[e.species]++;},
  onCropLoss:e=>{entry(e.day,e.species).killed+=e.count;living[e.species]-=e.count;}
 });
 let netCumulative=0,incomeCumulative=0,expenseCumulative=0;
 const daily=rows.map((r,index)=>{
  assert.equal(r.status,'estimate');
  const center=index===0?800:0,seeds=r.seeds+(index===0?5:0),wages=r.wages,walls=r.wallSpend,repairs=0;
  const expenses=center+seeds+wages+walls+repairs,net=r.income-expenses;
  incomeCumulative+=r.income;expenseCumulative+=expenses;netCumulative+=net;
  assert.equal(r.cash,1500+netCumulative);
  const events=Object.values(traces[index]),sum=key=>events.reduce((n,e)=>n+e[key],0);
  assert.equal(sum('income'),r.income);assert.equal(sum('seeds'),r.seeds);assert.equal(sum('harvested'),r.harvested);assert.equal(sum('planted'),r.planted);assert.equal(sum('killed'),r.killed);
  return {...r,expenses:{center,seeds,wages,walls,repairs,total:expenses},netDaily:net,netCumulative,incomeCumulative,expenseCumulative,bySpecies:traces[index]};
 });
 assert.equal(Object.values(living).reduce((n,v)=>n+v,0),rows.at(-1).plants);
 const nominalStandingHarvestValue=Object.entries(living).reduce((n,[id,count])=>n+count*payouts[id],0);
 return {options:{...options,scarcity},payouts,seedBases,rows,daily,day100:{...daily.at(-1),livingBySpecies:living,nominalStandingHarvestValue,netCashReturnPercent:netCumulative/1500*100}};
}
export function auditSeparation(input,reference) {
 const options=structuredClone(reference.options),scarcity=structuredClone(reference.scarcity);
 assert.deepEqual(options,{days:100,scale:.6,wallCost:3,exposure:.1,defend:true});
 assert.deepEqual(scarcity,{freePlants:100,plantsPerStep:200,slope:1});
 const exact={without:auditedCase(input,options),with:auditedCase(input,options,scarcity)};
 assert.deepEqual(exact.without.rows,reference.baseline);assert.deepEqual(exact.with.rows,reference.inflated);
 const originalPayouts={without:auditedCase(input,{...options,scale:1}),with:auditedCase(input,{...options,scale:1},scarcity)};
 return {scope:'Pure mathematical audit, no native simulation or production changes',referenceCommit:'0e13f056',replayMatchesAll200OriginalRows:true,previouslySeparated:true,exact,originalPayouts};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
 const raw=readFileSync(process.argv[2]),out=process.argv[3],refRaw=readFileSync(out+'/reference-0e13f056.json'),result=auditSeparation(JSON.parse(raw),JSON.parse(refRaw));
 const hash=b=>createHash('sha256').update(b).digest('hex');mkdirSync(out,{recursive:true});
 result.inputSHA256=hash(raw);result.referenceSHA256=hash(refRaw);result.sourceHashes=Object.fromEntries(['audit-seed-income-separation.mjs','campaign-cohort-estimate.mjs','project-campaign-accounting.mjs'].map(name=>[name,hash(readFileSync(new URL(name,import.meta.url)))]));
 writeFileSync(out+'/audit.json',JSON.stringify(result,null,2)+'\n');
 const metrics=cases=>['| Métrica | Sin encarecimiento | Con encarecimiento |','|:---|---:|---:|',...['cash','plants','walls','incomeCumulative','expenseCumulative','netCumulative','nominalStandingHarvestValue'].map(k=>`| ${{cash:'Dinero día100',plants:'Plantas vivas día100',walls:'Murallas acumuladas',incomeCumulative:'Ingresos cobrados acumulados',expenseCumulative:'Todos los gastos acumulados',netCumulative:'Saldo neto acumulado de caja',nominalStandingHarvestValue:'Valor nominal de cosecha pendiente (sin cobrar)'}[k]} | ${cases.without.day100[k]} | ${cases.with.day100[k]} |`),`| Retorno de caja respecto a1500 (%) | ${cases.without.day100.netCashReturnPercent.toFixed(2)} | ${cases.with.day100.netCashReturnPercent.toFixed(2)} |`].join('\n');
 const totalsBySpecies=scenario=>Object.fromEntries(Object.keys(scenario.payouts).map(species=>[species,scenario.daily.reduce((s,r)=>{const e=r.bySpecies[species];return {harvested:s.harvested+(e?.harvested??0),income:s.income+(e?.income??0)};},{harvested:0,income:0})]));
 const withoutTotals=totalsBySpecies(result.exact.without),withTotals=totalsBySpecies(result.exact.with);
 const table=rows=>['| Día | Dinero | Plantas | Murallas | Ingresos | Semillas | Jornales | Muros | Centro | Gastos total | Neto día | Neto acumulado |','|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',...rows.map(r=>`| ${r.day} | ${r.cash} | ${r.plants} | ${r.walls} | ${r.income} | ${r.expenses.seeds} | ${r.expenses.wages} | ${r.expenses.walls} | ${r.expenses.center} | ${r.expenses.total} | ${r.netDaily} | ${r.netCumulative} |`)].join('\n');
 writeFileSync(out+'/audit.md',['# Repetición y auditoría de ingresos:100 días','',
 '**La separación ya existía.** En0e13f056 la compra usaba seedQuote(plant_cost, plantas vivas), mientras las entregas cobraban count×base_harvest_value. El encarecimiento no modificaba base_harvest_value ni el valor de cultivos existentes. La repetición coincide exactamente en las200 filas anteriores (100 por escenario); no se atribuye ninguna mejora o cambio a corregir algo que ya estaba separado.', '',
 '## Referencia exacta y condiciones', '',
 'Se repite la última tabla enviada al usuario:0e13f056, cajas90/117 al día100. **No se incorporan** las políticas alternativas de reservas y cuota de murallas investigadas posteriormente.', '',
 '- Inicial1500, centro800, semilla inicial de mijo5; siete ancianos el día1 y después contratación estimada/asequible; jornales30/40, se usan ancianos30.',
 '- Recargo sólo para nuevas compras: ceil(semilla_base×(1+max(0,plantas_vivas−100)/200)). Sin recargo, precio de semilla original. Se calcula antes de cada compra y no altera cosechas anteriores ni futuras.',
 '- Mijo días1–9; secuencia fija de las ocho especies desde10. Máximo116 compras día1 y280 después. Reserva opcional30.',
 '- Zarzas3, hasta32 piezas/día con20% de excedente sobre35; sin límite de perímetro. No se modelan reparaciones (gasto0). Exposición hipotética90% hasta primera pieza y10% después.',
 '- Riego supuesto completo, cohortes maduras como pronto día siguiente y tras ceil(crecimiento/300) jornadas.3,238 entregas/anciano/día para todas las especies: mismo supuesto optimista anterior.',
 '- Misma presión por pesos originales de especies, hordas legales esperadas, escudo hipotético15%, uso de golpes90%, pérdidas agregadas sobre cohortes antiguas; no heridas individuales.', '',
 '## Valores originales y factor histórico', '',
 'La tabla anterior usaba un factor de cosecha0,6 sobre la referencia histórica. Se mantiene para repetir exactamente sus condiciones. Para cubrir también la lectura literal de «precio base original», se incluye otra comparación con factor1: **ese cambio de factor es distinto de separar compra y cosecha**.', '',
 '| Cultivo | Semilla base | Cosecha original de referencia | Cosecha fija de la última tabla (60%) |','|:---|---:|---:|---:|',...JSON.parse(raw).referenceBalance.crops.map(c=>`| ${c.id} | ${c.plant_cost} | ${c.base_harvest_value} | ${Math.ceil(c.base_harvest_value*.6)} |`),'',
 'En cada comparación ambos brazos usan idénticos valores de cosecha; cada entrega auditada se comprueba por especie y cantidad. La subida de los ingresos totales puede provenir de distinta cantidad/composición de entregas, aunque el precio unitario nunca cambie.', '',
 '## Rentabilidad y saldo neto', '',
 '`neto acumulado = ingresos cobrados − todos los gastos pagados`, incluyendo centro800 y semilla inicial5. `dinero = 1500 + neto acumulado`. Es flujo neto de caja, **no beneficio patrimonial completo**: cultivos vivos y murallas no se liquidan. El valor nominal de cosecha pendiente se muestra aparte y no se suma a dinero ni beneficio; no garantiza madurez, riego, recolección o supervivencia.', '',
 '## Día100: repetición exacta (cosechas60%)', '',metrics(result.exact),'',
 '## Por qué cambian los ingresos totales sin cambiar el precio de cosecha', '',
 '| Cultivo | Precio fijo | Entregas sin recargo | Entregas con recargo | Cobros sin recargo | Cobros con recargo |','|:---|---:|---:|---:|---:|---:|',...Object.keys(result.exact.with.payouts).map(id=>`| ${id} | ${result.exact.with.payouts[id]} | ${withoutTotals[id].harvested} | ${withTotals[id].harvested} | ${withoutTotals[id].income} | ${withTotals[id].income} |`),'',
 'Por ejemplo, algodón pasa de63 a91 entregas y plátano de73 a105; siguen cobrando321 y481 por entrega respectivamente. La diferencia procede del flujo de compras/madurez/contratación de esta política, no de revalorizar cosechas.', '',
 '## Evolución diaria sin encarecimiento — mismas condiciones', '',table(result.exact.without.daily),'',
 '## Evolución diaria con encarecimiento — mismas condiciones', '',table(result.exact.with.daily),'',
 '## Día100: precios de cosecha originales al100%', '',metrics(result.originalPayouts),'',
 'Esta variante modifica únicamente el factor de cosecha de0,6 a1; conserva estrategia y demás reglas del modelo. No se debe confundir su diferencia con el efecto de separar precios.', '',
 '## Evolución diaria sin encarecimiento — cosechas originales', '',table(result.originalPayouts.without.daily),'',
 '## Evolución diaria con encarecimiento — cosechas originales', '',table(result.originalPayouts.with.daily),'',
 '## Factores que distorsionan la interpretación', '',
 '- Caja pequeña no demuestra excedente pequeño: la política reinvierte casi todo. Compra murallas indefinidamente y puede pagar demasiados trabajadores para la liquidez disponible; cambia el ritmo de cosecha/reinversión.',
 '- La secuencia de especies puede atascarse en una semilla cara. Encarecer compras cambia qué cohortes llegan a cosecharse y cuándo: puede aumentar los ingresos totales sin cambiar precios unitarios.',
 '- La capacidad temprana se aplica a cultivos tardíos; la calibración mixta daba1,878 entregas, frente3,238. Riego, FIFO, recorridos y madurez son idealizados.',
 '- Una sola pieza activa protección10% en esta cuenta. No acredita cobertura, puertas, deterioro ni reparaciones; no demuestra que buena defensa realmente funcione.',
 '- La presión usa pesos históricos separados de los pagos. El daño fraccionario agregado y su reparto sobre cohortes antiguas no reproducen impactos físicos ni heridas individuales.',
 '- Los valores originales al100% no son los del factor60% ni necesariamente los vigentes en producción. Todas las bases y opciones quedan congeladas y distinguidas en este informe.', '',
 'No se modifican archivos de producción ni se ejecuta una campaña nativa. Se conservan fuentes, referencia original, trazas diarias por especie y hashes en audit.json. Estos resultados no aceptan un balance ni prueban victoria, derrota o inactividad<25%.'].join('\n')+'\n');
 console.log(JSON.stringify({previouslySeparated:result.previouslySeparated,exactMatch:result.replayMatchesAll200OriginalRows,day100:Object.fromEntries(Object.entries({exact:result.exact,originalPayouts:result.originalPayouts}).map(([k,c])=>[k,Object.fromEntries(Object.entries(c).map(([arm,r])=>[arm,{cash:r.day100.cash,plants:r.day100.plants,walls:r.day100.walls,income:r.day100.incomeCumulative,expenses:r.day100.expenseCumulative,net:r.day100.netCumulative,standingValue:r.day100.nominalStandingHarvestValue}]))]))}));
}
