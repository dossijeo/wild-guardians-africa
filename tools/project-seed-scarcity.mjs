import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {estimate,seedQuote} from './campaign-cohort-estimate.mjs';
export function projectScarcity(input) {
 const options={days:100,scale:.6,wallCost:3,exposure:.1,defend:true};
 const scarcity={freePlants:100,plantsPerStep:200,slope:1};
 const summarize=rows=>({cash:rows.at(-1).cash,plants:rows.at(-1).plants,walls:rows.at(-1).walls,maxPlants:Math.max(...rows.map(r=>r.plants)),receipts:rows.reduce((n,r)=>n+(r.income??0),0),seeds:rows.reduce((n,r)=>n+(r.seeds??0),0),wages:rows.reduce((n,r)=>n+(r.wages??0),0),wallSpend:rows.reduce((n,r)=>n+(r.wallSpend??0),0),firstInsufficient:rows.find(r=>r.status!=='estimate')?.day??null});
 const baseline=estimate(input,options),inflated=estimate(input,{...options,scarcity});
 const sensitivity=[1000,500,200,100].map(plantsPerStep=>({plantsPerStep,...summarize(estimate(input,{...options,scarcity:{...scarcity,plantsPerStep}}))}));
 const neglect=estimate(input,{...options,defend:false,exposure:.9,scarcity});
 const summary={baseline:summarize(baseline),inflated:summarize(inflated),neglect:summarize(neglect)};
 for(const s of Object.values(summary))s.operatingSurplus=s.receipts-s.seeds-s.wages;
 return {scope:'Mathematical projection only, no native simulation or production changes',options,scarcity,baseline,inflated,neglect,summary,sensitivity,quoteExamples:[0,100,200,300,500,1000].map(plants=>({plants,multiplier:1+Math.max(0,plants-100)/200,mijo:seedQuote(5,plants,scarcity),maiz:seedQuote(8,plants,scarcity),algodon:seedQuote(100,plants,scarcity),platano:seedQuote(150,plants,scarcity)}))};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
 const raw=readFileSync(process.argv[2]),result=projectScarcity(JSON.parse(raw)),out=process.argv[3];mkdirSync(out,{recursive:true});
 const hash=b=>createHash('sha256').update(b).digest('hex');
 result.inputSHA256=hash(raw);result.sourceHashes=Object.fromEntries(['project-seed-scarcity.mjs','campaign-cohort-estimate.mjs','project-campaign-accounting.mjs'].map(name=>[name,hash(readFileSync(new URL(name,import.meta.url)))]));
 writeFileSync(out+'/projection.json',JSON.stringify(result,null,2)+'\n');
 const rows=result.inflated,summary=result.summary;
 writeFileSync(out+'/projection.md',['# Escasez de semillas: proyección matemática de100 días','',
 '**No se ejecuta el motor ni se modifican precios de producción.** Comparación contra la misma recurrencia por cohortes, mismos ingresos, defensa, calendario de especies y política de gastos. No compara directamente las cifras millonarias del borrador agregado v2, cuya interpretación se retiró por ingresos anticipados y falsas insolvencias.', '',
 '## Parámetros', '',
 '- Fórmula por compra: `precio = ceil(precio_base × (1 + max(0, plantas_vivas − 100) / 200))`.',
 '- Primeras100 plantas sin recargo. Cada200 plantas adicionales añaden+100% del precio base, linealmente y sin límite artificial. Se recalcula antes de cada brote, después de entregas y antes de incursión.',
 '- Se cuentan plantas vivas, maduras o inmaduras, de toda la finca. Cosechar o perder plantas reduce el precio; no depende del número histórico de siembras. La escasez sólo altera compras futuras, sin cambiar el valor de los cultivos existentes.',
 '- Centro800, inicio1500, ancianos30/jóvenes40. La política contrata ancianos. Semillas base mijo5, girasol18, sorgo6, maíz8, batata10, algodón100, yuca12, plátano150.',
 '- Ganancias constantes en ambas cuentas: mijo20, girasol65, sorgo24, maíz31, batata42, algodón321, yuca58, plátano481:60% redondeado hacia arriba de la referencia histórica. Zarzas3; compra hasta32 piezas/día con20% del excedente sobre35. No son los precios actuales de main.',
 '- Hasta día9 mijo; desde día10 secuencia fija de las ocho especies. Máximo116 compras el primer día y280 después. Reserva opcional30, recuperación sin reserva adicional100.',
 '- Cohorte madura no antes de día siguiente y tras ceil(crecimiento/300) jornadas; riego supuesto completo. Sólo se entregan cohortes maduras y se cobran antes de comprar más. Capacidad por trabajador tomada de la calibración temprana histórica.',
 '- Defensa: exposición90% antes de la primera pieza y10% después, hipótesis externa sin acreditar cierre ni intercepción. Sin defensa90%. Mismo descuento hipotético15% de daño por escudo,90% de uso de golpes. No modela reparaciones, colapso, rutas ni FIFO.',
 '- Hordas legales: primeras5 noches una nueva especie; después expectativa del tier. Presión según pesos originales de especie. Fuerza×1 hasta60000 puntos,×2 después; alcance=floor(1+7V/(V+10000)). Daño a edificios×1.', '',
 '## Ejemplos de precio', '',
 '| Plantas vivas | Factor | Mijo | Maíz | Algodón | Plátano |','|---:|---:|---:|---:|---:|---:|',...result.quoteExamples.map(r=>`| ${r.plants} | ×${r.multiplier} | ${r.mijo} | ${r.maiz} | ${r.algodon} | ${r.platano} |`),'',
 '## Comparación final (misma política)', '',
 '| Métrica | Sin escasez | Con escasez |','|:---|---:|---:|',...['cash','plants','maxPlants','walls','receipts','seeds','wages','operatingSurplus','wallSpend'].map(key=>`| ${{cash:'Caja día100',plants:'Plantas día100',maxPlants:'Máximo de plantas nocturno',walls:'Piezas de muralla acumuladas',receipts:'Cobros acumulados',seeds:'Gasto semillas acumulado',wages:'Jornales acumulados',operatingSurplus:'Cobros menos semillas y jornales',wallSpend:'Gasto murallas acumulado'}[key]} | ${summary.baseline[key]} | ${summary.inflated[key]} |`),'',
 '**Lectura:** la escasez limita algo el tamaño de la finca, pero aquí no reduce el excedente económico de forma monotónica. Los cobros aumentan al cambiar el flujo de especies y entregas; el margen cobros−semillas también aumenta. Tras jornales, el excedente antes de murallas baja sólo5278→5206 (−1,36%). No se considera resuelto el exceso de ganancias ni se acepta este balance por llegar al día100. La caja pequeña refleja reinversión agresiva, no equivale a beneficio pequeño.', '',
 '## Tabla completa con escasez', '',
 'Dinero y plantas al final de la noche. Animales=media [rango], no una secuencia aleatoria ni animales fraccionarios. El factor de semillas mostrado se calcula con el stock final; el JSON registra gasto efectivo de compras intradía.', '',
 '| Día | Dinero | Plantas | Murallas | Animales media [rango] | Fuerza | Factor semillas al cierre |','|---:|---:|---:|---:|---:|---:|---:|',...rows.map(r=>`| ${r.day} | ${r.cash} | ${r.plants} | ${r.walls} | ${r.animals.toFixed(2)} [${r.animalMin}–${r.animalMax}] | ×${r.force} | ×${(1+Math.max(0,r.plants-100)/200).toFixed(3)} |`),'',
 '## Sensibilidad matemática', '',
 '| Plantas adicionales para+100% | Caja día100 | Plantas día100 | Máximo plantas | Cobros | Semillas |','|---:|---:|---:|---:|---:|---:|',...result.sensitivity.map(r=>`| ${r.plantsPerStep} | ${r.cash} | ${r.plants} | ${r.maxPlants} | ${r.receipts} | ${r.seeds} |`),'',
 `Sin defensa, con esta política y recargo, la cuenta se queda sin capacidad simplificada de recuperación el día${summary.neglect.firstInsufficient}, con${summary.neglect.cash} monedas; no acredita GameOver nativo ni diferencia causal sólo por escasez.`, '',
 'No se estima inactividad, daño individual, deterioro de defensas ni probabilidad de victoria. Las diferencias de productividad son consecuencias de esta recurrencia/política, no mediciones nuevas del juego. Antes de simular, conviene evaluar una política de reservas/contratación que no gaste automáticamente todo y medir excedente después de reponer cultivos, salarios y defensa útil. Los supuestos de protección siguen pendientes.'].join('\n')+'\n');
 console.log(JSON.stringify({summary:result.summary,sensitivity:result.sensitivity}));
}
