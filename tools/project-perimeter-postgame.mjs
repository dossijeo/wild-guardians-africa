// QA-only accounting. No native campaign, save, or production balance is modified.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {estimate} from './campaign-cohort-estimate.mjs';

export function projectPerimeter(input) {
 const options={days:180,scale:.6,wallCost:3,exposure:.1,defend:true,maintenance:true,policy:{reserveDays:1,walls:'perimeter-budget',deliveryBand:'calendar',wallFraction:1}};
 const scarcity={freePlants:100,plantsPerStep:200,slope:1};
 const cases={};
 for(const [name,markup] of [['base',null],['scarcity',scarcity]])for(const holdField of [false,true]) {
  const rows=estimate(input,{...options,scarcity:markup,postgame:{fromDay:101,holdField}});
  cases[name+(holdField?'Hold':'Expand')]=rows;
 }
 const summarize=rows=>{
  const sum=k=>rows.reduce((n,r)=>n+(r[k]??0),0);
  const last=rows.at(-1),expenses=805+sum('wages')+sum('seeds')+sum('wallSpend')+sum('repairs');
  return {day:last.day,cash:last.cash,plants:last.plants,walls:last.walls,receipts:sum('income'),expenses,netCashFlow:sum('income')-expenses,wallSpend:sum('wallSpend'),repairs:sum('repairs'),replacements:sum('replacements'),destroyed:sum('wallsDestroyed'),firstInsufficient:rows.find(r=>r.status!=='estimate')?.day??null};
 };
 const campaign=Object.fromEntries(['base','scarcity'].map(k=>[k,summarize(cases[k+'Hold'].slice(0,100))]));
 const postgame=Object.fromEntries(Object.entries(cases).map(([k,rows])=>[k,{...summarize(rows),affordability:[5000,10000,20000,50000,75000].map(price=>({price,firstDay:rows.find(r=>r.day>=101&&r.status==='estimate'&&r.cash-Math.ceil(r.plants/6)*30>=price)?.day??null}))}]));
 return {scope:'Conditional accounting projection, not native survival or activity evidence; no production changes',options,scarcity,cases,campaign,postgame};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
 const raw=readFileSync(process.argv[2]),out=process.argv[3],r=projectPerimeter(JSON.parse(raw));
 mkdirSync(out,{recursive:true});const hash=b=>createHash('sha256').update(b).digest('hex');
 r.inputSHA256=hash(raw);r.sourceHashes=Object.fromEntries(['project-perimeter-postgame.mjs','campaign-cohort-estimate.mjs','project-campaign-accounting.mjs'].map(n=>[n,hash(readFileSync(new URL(n,import.meta.url)))]));
 writeFileSync(out+'/projection.json',JSON.stringify(r,null,2)+'\n');
 const table=rows=>['| Día | Caja | Plantas | Muros vivos | Comprados (reposición) | Destruidos | Ingresos | Brotes | Jornales | Muros | Reparación | Neto acumulado |','|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',...rows.map(d=>`| ${d.day} | ${d.cash} | ${d.plants} | ${d.walls} | ${d.newWalls} (${d.replacements}) | ${d.wallsDestroyed} | ${d.income} | ${d.seeds} | ${d.wages} | ${d.wallSpend} | ${d.repairs} | ${d.cash-1500} |`)].join('\n');
 const s=r.campaign;
 writeFileSync(out+'/projection.md',[
 '# Perímetro finito, reposición y ahorro postgame','',
 '**Proyección matemática condicionada. No se modifica producción ni se ejecuta una campaña nativa.** Caja al cerrar la noche; las plantas no vendidas no son dinero. Neto acumulado = cobros menos todos los pagos, incluidos centro800 y primer brote5; es flujo de caja, no beneficio patrimonial.', '',
 '## Por qué las tablas anteriores eran distintas', '',
 '| Referencia | Compra de muros | Reserva | Productividad | Caja sin/con recargo al100 |',
 '|:---|:---|:---|:---|---:|',
 '| 0e13f056, repetida en54db92e6 | 20% de excedente cada día sin límite de perímetro, sin deterioro | 30 | temprana para todas las especies | 90 / 117 |',
 '| 3373fcc3 | hasta cuota de perímetro, 20% de excedente, sin deterioro | siguiente plantilla | temprana hasta9, mixta desde10 | 1418923 / 2024 |',
 `| Esta revisión | sólo déficit de perímetro y reposiciones; reparación de supervivientes | siguiente plantilla | temprana hasta9, mixta desde10 | ${s.base.cash} / ${s.scarcity.cash} |`, '',
 'No se atribuye toda diferencia a las semillas: entre referencias cambiaron política de gastos, reserva, productividad y ahora mantenimiento. Dentro de cada pareja esos parámetros son idénticos: sólo cambia el recargo.', '',
 '## Parámetros y orden de operaciones', '',
 '- Inicio1500; centro800; ancianos30 (jóvenes40 no usados). Cosecha fija60% de referencia: mijo20, girasol65, sorgo24, maíz31, batata42, algodón321, yuca58, plátano481. Estos valores son propuestas contables, no precios vigentes.',
 '- Recargo sólo para nuevas semillas: ceil(precio_base × (1 + max(0, plantas_vivas −100)/200)). Ninguna cosecha usa el precio aumentado. Sin tope artificial de plantación: hasta116 compras el primer día y280 en los siguientes, sujetas a liquidez y reserva.',
 '- Mijo días1–9; las ocho especies en secuencia fija desde10. Un trabajador por6 plantas, según caja inicial; productividad3,238 entregas/anciano al principio y1,878 desde10. Madurez por cohortes tras ceil(crecimiento/300) días, nunca el día de compra. Riego completo supuesto; sin simular FIFO ni desplazamientos.',
 '- Orden: pagar jornales, cobrar cosechas maduras, reparar, completar cuota/reponer, comprar brotes, aplicar daño nocturno. La construcción precede a los brotes de ese día: la expansión puede dejar déficit de cobertura hasta la jornada siguiente.',
 '- Perímetro estimado de una parcela compacta con2,25m²/planta y margen3m, semilado redondeado en bandas6m. Se retiene la extensión máxima ya ocupada: cosechar no implica vender muros. Cuota = ceil(8 × semilado /2,18). No se paga por encima de esa cuota; máximo32 piezas/día. Se usa todo el excedente tras reserva para completar el déficit, en lugar del antiguo20%.',
 '- Zarzas3, HP100. Daño esperado agregado de especies originales; colapso al20%HP. Se reponen piezas destruidas y se reparan supervivientes cobrando ceil(3 × fracción dañada). No se cobra daño a una pieza destruida dos veces. El saldo de reposiciones pendientes se conserva.',
 '- Cobertura sólo es una hipótesis contable: exposición10% si se alcanza la cuota actual,90% si no. No se deduce una puerta o cierre real del número de piezas. Escudo supuesto reduce daño15%; utilización de golpes90%. Cultivos soportan2 golpes; alcance=floor(1+7V/(V+10000)); fuerza×2 desde60000 puntos, salvo introducciones iniciales. No se añade fuerza×2 al daño estructural.',
 '- Las pruebas nativas aisladas documentaron que una entrada dependiente de cámara puede aparecer dentro de un recinto cerrado (docs/qa/retained-raid-entry-audit). Por tanto, esta eficacia defensiva requiere corregirse/verificarse en el motor antes de aceptar balance o victoria. No se mide inactividad con esta cuenta.', '',
 '## Resultado de100 días', '',
 '| Métrica | Sin recargo | Con recargo |','|:---|---:|---:|',
 ...['cash','plants','walls','receipts','expenses','netCashFlow','wallSpend','repairs','replacements','destroyed'].map(k=>`| ${{cash:'Caja',plants:'Plantas',walls:'Muros vivos',receipts:'Cobros',expenses:'Gastos totales',netCashFlow:'Flujo neto acumulado',wallSpend:'Compra de muros',repairs:'Reparaciones',replacements:'Piezas repuestas',destroyed:'Piezas destruidas'}[k]} | ${s.base[k]} | ${s.scarcity[k]} |`), '',
 'La escasez sí reduce fuertemente la acumulación con una política comparable y defensa finita. Eso no garantiza diversión ni supervivencia real. El recargo lineal también puede hacer antieconómicas algunas especies; conservar tamaño para ahorrar cambia la política de reinversión, no el ingreso por cosecha.', '',
 '## Sin recargo: evolución diaria', '',table(r.cases.baseHold.slice(0,100)),'',
 '## Con recargo: evolución diaria', '',table(r.cases.scarcityHold.slice(0,100)),'',
 '## Postgame: mantener tamaño frente a reinvertir', '',
 'El juego actual permite continuar tras ganar y no genera nuevas incursiones en postgame. La proyección conserva esa regla desde101. Mantener tamaño repone hasta el número vivo al terminar100, sin expansión. Ambas estrategias tienen exactamente los mismos primeros100 días; la única diferencia posterior es el objetivo de siembra. No se compra ningún poblado en la cuenta: se mide cuándo sería asequible conservando ceil(plantas/6)×30 para el siguiente jornal.', '',
 '| Caso | Caja180 | Plantas180 | 5000 | 10000 | 20000 | 50000 | 75000 |','|:---|---:|---:|---:|---:|---:|---:|---:|',
 ...Object.entries(r.postgame).map(([k,v])=>`| ${k} | ${v.cash} | ${v.plants} | ${v.affordability.map(a=>a.firstDay??'no antes de180').join(' | ')} |`),'',
 'El segundo poblado actual cuesta50000, el tercero75000 (aumentan25000 por ordinal). Los precios5000/10000/20000 son alternativas fijas evaluadas, no cambios aprobados. Mantener tamaño permite ahorrar sin exigir abaratar; reinvertir hasta agotar liquidez puede impedir ahorrar incluso sin ataques. No se deben atribuir estos resultados a una imposibilidad general del postgame.', '',
 '## Postgame con recargo, tamaño mantenido', '',table(r.cases.scarcityHold.slice(100)),'',
 '## Postgame con recargo, reinversión continuada', '',table(r.cases.scarcityExpand.slice(100)),'',
 'Los80 días posteriores constituyen una ventana de observación, no un límite del juego. Tasas agregadas, distribución de daños y huella compacta pueden distorsionar el ahorro; antes de fijar precios se necesita validar defensa y servicio real de trabajadores. Se mantienen las tablas anteriores como referencias independientes.'
 ].join('\n')+'\n');
 console.log(JSON.stringify({campaign:r.campaign,postgame:r.postgame}));
}
