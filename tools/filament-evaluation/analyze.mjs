import {readFile,writeFile} from 'node:fs/promises';
const roots=process.argv.slice(2);if(!roots.length)roots.push('docs/qa/filament-evaluation/results-native');
const all=[];
for(const root of roots){const index=JSON.parse(await readFile(`${root}/index.json`,'utf8'));for(const row of index.records)all.push({...row,root})}
const groups=new Map();
for(const row of all){if(row.errors.length)throw Error(`Invalid run ${row.root}/${row.scenario}/${row.backend}`);const kind=row.optimized?'solutions':row.scenario==='C'?(row.nativeInstancing?'native':'expanded'):'standard';const key=[kind,row.scenario,row.density,row.night].join('/');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row)}
const range=values=>`${Math.min(...values).toFixed(2)}–${Math.max(...values).toFixed(2)}`;
const mean=values=>values.reduce((a,b)=>a+b,0)/values.length;
const summary=[];
for(const [key,rows]of groups){const a=rows.filter(r=>r.backend==='three'),b=rows.filter(r=>r.backend==='filament');if(!a.length||!b.length)throw Error(`Missing comparison ${key}`);const metric=(r,k)=>r.map(x=>x.summary[k].mean);const aTime=mean(metric(a,'frametime')),bTime=mean(metric(b,'frametime'));const item={key,three:{frametimeMs:metric(a,'frametime'),fps:a.map(x=>x.summary.fps),p95:a.map(x=>x.summary.frametime.p95),p99:a.map(x=>x.summary.frametime.p99),cpuUpdateMs:metric(a,'cpuUpdate'),cpuSubmitMs:metric(a,'cpuSubmit'),gpuMs:metric(a,'gpu'),drawCalls:metric(a,'drawCalls'),triangles:metric(a,'triangles')},filament:{frametimeMs:metric(b,'frametime'),fps:b.map(x=>x.summary.fps),p95:b.map(x=>x.summary.frametime.p95),p99:b.map(x=>x.summary.frametime.p99),cpuUpdateMs:metric(b,'cpuUpdate'),cpuSubmitMs:metric(b,'cpuSubmit'),gpuMs:metric(b,'gpu'),drawCalls:metric(b,'drawCalls'),triangles:metric(b,'triangles'),skipped:b.map(x=>x.summary.skippedFrames)},frametimeReductionPercent:100*(aTime-bTime)/aTime,triangleRatio:mean(metric(b,'triangles'))/mean(metric(a,'triangles'))};summary.push(item)}
const favorable=summary.filter(x=>x.frametimeReductionPercent>=15);
const result={generated:new Date().toISOString(),decision:favorable.length===summary.length?'REQUIERE VALIDACIÓN DE FIDELIDAD Y CAMPAÑAS; NO AUTORIZA MIGRACIÓN':'CONSERVAR THREE.JS + WEBGL2',blocks:all.length,favorable:favorable.length,groups:summary};
const dest='docs/qa/filament-evaluation';await writeFile(`${dest}/summary.json`,JSON.stringify(result,null,2)+'\n');
let md='| Comparación / escenario / densidad / noche | Three ms | Filament ms | Reducción frametime | Three FPS | Filament FPS |\n|---|---:|---:|---:|---:|---:|\n';
for(const row of summary)md+=`| ${row.key} | ${range(row.three.frametimeMs)} | ${range(row.filament.frametimeMs)} | ${row.frametimeReductionPercent.toFixed(1)}% | ${range(row.three.fps)} | ${range(row.filament.fps)} |\n`;
await writeFile(`${dest}/RESULTS.md`,`# Resultados medidos\n\n${result.decision}\n\n${all.length} bloques. Los intervalos Filament cuentan frames enviados, no callbacks RAF omitidos. GPU tiene alcance diferente entre APIs; no se suma a CPU.\n\n${md}\nDatos y percentiles completos: summary.json y registros crudos por ejecución.\n`);console.log(JSON.stringify(result,null,2));
