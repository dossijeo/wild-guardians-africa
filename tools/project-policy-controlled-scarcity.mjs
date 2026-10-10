// Pure accounting alternatives; does not initialize the native game or workers.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {estimate} from './campaign-cohort-estimate.mjs';
export function projectControlled(input) {
 const options={days:100,scale:.6,wallCost:3,exposure:.1,defend:true,policy:{reserveDays:1,walls:'perimeter-budget',deliveryBand:'calendar'}};
 const scarcity={freePlants:100,plantsPerStep:200,slope:1};
 const baseline=estimate(input,options),inflated=estimate(input,{...options,scarcity});
 const neglect=estimate(input,{...options,defend:false,exposure:.9,scarcity});
 const summarize=rows=>({cash:rows.at(-1).cash,plants:rows.at(-1).plants,walls:rows.at(-1).walls,maxPlants:Math.max(...rows.map(r=>r.plants)),minCash:Math.min(...rows.map(r=>r.cash)),receipts:rows.reduce((n,r)=>n+(r.income??0),0),seeds:rows.reduce((n,r)=>n+(r.seeds??0),0),wages:rows.reduce((n,r)=>n+(r.wages??0),0),wallSpend:rows.reduce((n,r)=>n+(r.wallSpend??0),0),firstInsufficient:rows.find(r=>r.status!=='estimate')?.day??null});
 const summary=Object.fromEntries(Object.entries({baseline,inflated,neglect}).map(([k,rows])=>{const s=summarize(rows);return [k,{...s,operatingSurplus:s.receipts-s.seeds-s.wages}];}));
 const sensitivity=[];
 for(const exposure of [.1,.2,.3,.5,.9])for(const reserveDays of [.5,1,2]) {
  const rows=estimate(input,{...options,exposure,defend:exposure!==.9,scarcity,policy:{...options.policy,reserveDays}});
  sensitivity.push({exposure,reserveDays,...summarize(rows)});
 }
 const productivity=[];
 for(const factor of [.8,1,1.2]) {
  const altered=structuredClone(input);for(const band of ['early','late'])altered.calibration[band].deliveriesPerWorker*=factor;
  productivity.push({factor,...summarize(estimate(altered,{...options,scarcity}))});
 }
 const earlyRateOnly=summarize(estimate(input,{...options,scarcity,policy:{...options.policy,deliveryBand:'early'}}));
 const seedBreakEven=input.referenceBalance.crops.map(c=>{const payout=Math.ceil(c.base_harvest_value*options.scale);return {species:c.id,seedBase:c.plant_cost,payout,firstUnprofitableLivingPlants:Math.floor(scarcity.freePlants+scarcity.plantsPerStep*(payout/c.plant_cost-1))+1};});
 return {scope:'Conditional mathematical accounting; no native simulation, no production changes, no accepted balance',options,scarcity,baseline,inflated,neglect,summary,sensitivity,productivity,earlyRateOnly,seedBreakEven};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
 const raw=readFileSync(process.argv[2]),out=process.argv[3],result=projectControlled(JSON.parse(raw)),hash=b=>createHash('sha256').update(b).digest('hex');
 mkdirSync(out,{recursive:true});result.inputSHA256=hash(raw);
 result.sourceHashes=Object.fromEntries(['project-policy-controlled-scarcity.mjs','campaign-cohort-estimate.mjs','project-campaign-accounting.mjs'].map(name=>[name,hash(readFileSync(new URL(name,import.meta.url)))]));
 writeFileSync(out+'/projection.json',JSON.stringify(result,null,2)+'\n');
 const table=rows=>['| Día | Dinero | Plantas | Murallas | Animales media [rango] | Fuerza | Factor semillas al cierre |','|---:|---:|---:|---:|---:|---:|---:|',...rows.map(r=>r.status==='estimate'?`| ${r.day} | ${r.cash} | ${r.plants} | ${r.walls} | ${r.animals.toFixed(2)} [${r.animalMin}–${r.animalMax}] | ×${r.force} | ×${(1+Math.max(0,r.plants-100)/200).toFixed(2)} |`:`| ${r.day} | — | — | — | — | — | — |`)].join('\n');
 const s=result.summary;
 writeFileSync(out+'/projection.md',['# Escasez con reservas y presupuesto de perímetro','',
 '**Estimación condicionada, no balance aprobado ni campaña del motor.** Se corrige la política de gastos para no ocultar beneficios pagando muros indefinidamente o dejando sin fondos la plantilla. Se conserva la comparación anterior en seed-scarcity-mathematical-projection; no se sobrescribe su interpretación.', '',
 '## Cambios de política', '',
 '- Antes de cada compra se conserva el siguiente jornal estimado: ceil(plantas tras compra/6)×30. Una finca vacía puede comprar su primer brote sin exigir prefondos para otro día; no se cobran jornadas indefinidamente al quedarse sin recursos.',
 '- Las murallas se presupuestan parcialmente hasta una cuota aproximada de perímetro: ceil(8×halfSpan/2,18), halfSpan=6×ceil((sqrt(pico de plantas×2,25)/2+3)/6). Como antes, hasta32 piezas/día y20% de caja excedente; ahora se respeta la reserva laboral.',
 '- La cuota NO acredita una muralla cerrada, reutilización real de piezas, puertas, cobertura, estado ni reparaciones. Es un límite de compra contable para aislar escasez frente a gasto inagotable. Exposición10% después de la primera pieza sigue siendo una hipótesis externa.', '',
 '## Parámetros comunes y recargo', '',
 '- Centro800, inicial1500, ancianos30/jóvenes40; se contratan ancianos. Semillas base originales. Cosechas constantes60% de referencia histórica:20/65/24/31/42/321/58/481 para mijo/girasol/sorgo/maíz/batata/algodón/yuca/plátano. Zarzas3. No son los valores actuales de producción.',
 '- `precio = ceil(base × (1 + max(0, plantas_vivas − 100) / 200))`: primeras100 sin subida; cada200 adicionales añade100% del precio base. Es el mismo recargo de la primera prueba, aplicado a la nueva política pareada. Recalculado por brote; cosecha/destrucción reduce precio.',
 '- Sin cambios en calendario fijo de especies (mijo días1–9, mezcla desde10), madurez por cohortes, capacidad histórica, protección supuesta, presión ni daño. No se cobra un brote el día de plantarlo.',
 '- Se supone riego completo y madurez tras ceil(crecimiento/300) jornadas, como pronto al día siguiente. No se modelan servicio de riego, FIFO ni recorridos. Capacidad por trabajador:3,238 entregas días1–9;1,878 desde10 (calibración mixta tardía). Son tasas agregadas históricas, no límites físicos demostrados para todo tamaño de finca.',
 '- Hordas: media de composiciones legales; primeras5 noches una especie nueva. Fuerza×1 hasta60000 puntos,×2 después; alcance=floor(1+7V/(V+10000)). Presión según puntos originales por especie, propuesta no implementada. Daño a edificios×1.', '',
 '## Comparación pareada', '',
 '| Métrica | Sin escasez | Con escasez |','|:---|---:|---:|',...['cash','plants','maxPlants','walls','receipts','seeds','wages','operatingSurplus'].map(k=>`| ${{cash:'Caja día100',plants:'Plantas día100',maxPlants:'Pico de plantas al final de noche',walls:'Murallas acumuladas',receipts:'Cobros acumulados',seeds:'Semillas acumuladas',wages:'Jornales acumulados',operatingSurplus:'Cobros menos semillas y jornales'}[k]} | ${s.baseline[k]} | ${s.inflated[k]} |`),'',
 'La misma política permite observar la acumulación sin recargo. La variante con recargo la reduce mucho y conserva100 filas calculables, bajo los supuestos indicados. No demuestra actividad<25%, protección física ni victoria. La cuota de muros y madurez idealizada pueden alterar el resultado.', '',
 '## 100 días con escasez', '',table(result.inflated),'',
 '## Sensibilidad de reserva y protección', '',
 '| Exposición | Jornales futuros reservados | Caja al100 | Plantas al100 | Primer día insuficiente |','|---:|---:|---:|---:|---:|',...result.sensitivity.map(r=>`| ${r.exposure} | ${r.reserveDays} | ${r.cash} | ${r.plants} | ${r.firstInsufficient??'—'} |`),'',
 '## Productividad de entregas', '',
 '| Capacidad relativa | Caja al100 | Plantas al100 | Primer día insuficiente |','|---:|---:|---:|---:|',...result.productivity.map(r=>`| ${r.factor} | ${r.cash} | ${r.plants} | ${r.firstInsufficient??'—'} |`),'',
 `Si se usa la tasa temprana para todas las especies, la misma política/recargo deja${result.earlyRateOnly.cash} monedas y${result.earlyRateOnly.plants} plantas. Ese caso optimista se conserva como diagnóstico, no se usa para aprobar productividad mixta.`, '',
 '## Umbrales de escasez por especie', '',
 'Primer número de plantas vivas al que comprar una semilla cuesta más que la cosecha base, antes de jornales, daños y defensa. No es un límite artificial de tamaño, sino un riesgo del recargo lineal sin tope.', '',
 '| Especie | Semilla base | Cosecha | Primera cantidad sin margen bruto |','|:---|---:|---:|---:|',...result.seedBreakEven.map(r=>`| ${r.species} | ${r.seedBase} | ${r.payout} | ${r.firstUnprofitableLivingPlants} |`),'',
 `Sin defensa: primer día de insuficiencia contable${s.neglect.firstInsufficient}, caja${s.neglect.cash}; no prueba de GameOver nativo.`, '',
 'Los días después de insuficiencia conservan el último estado en el JSON para diagnóstico, no representan incursiones resueltas. No se inicia una nueva campaña nativa por estos resultados. Primero debe acreditarse coste/eficacia de defensa, daño individual, riego y servicio de colas. La revisión de la matemática es independiente de los criterios físicos del juego.'].join('\n')+'\n');
 console.log(JSON.stringify({summary:result.summary,productivity:result.productivity,seedBreakEven:result.seedBreakEven}));
}
