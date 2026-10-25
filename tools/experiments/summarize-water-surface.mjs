import {readFile,writeFile} from 'node:fs/promises';
const study=process.env.WG_MATERIAL_STUDY??'water-surface',root='docs/qa/global-visual-lab/'+study;
const {records}=JSON.parse(await readFile(root+'/paired-water.json'));
const cases=[...new Set(records.map(r=>r.sceneCase))];
let md='# Coste en vistas centradas en el agua\n\nABBA en la misma página, 180 frames por muestra y calentamiento previo, semilla 712, calidad media, 1280×720. Base: global-lighting; candidato QA: '+study+'. No se modificó el código cargado ni se ejecutaron otras capturas o procesos gráficos durante la medición.\n\n| Escena | GPU base → candidato | Δ GPU | CPU envío base → candidato |\n|---|---:|---:|---:|\n';
for(const c of cases)for(const phase of ['day','night']){
 const avg=(v,k)=>{const rs=records.filter(r=>r.sceneCase===c&&r.phase===phase&&r.variant===v);if(rs.length!==2)throw Error('Incomplete ABBA group');return rs.reduce((n,r)=>n+r.report[k].mean,0)/rs.length};
 const a=avg(0,'gpuElapsedMs'),b=avg(1,'gpuElapsedMs');
 md+=`| ${{1:'Sabana',6:'Gran Río',11:'Manglares',21:'Cañón'}[c]} ${phase} | ${a.toFixed(3)} → ${b.toFixed(3)} ms | ${(b-a).toFixed(3)} ms | ${avg(0,'cpuSubmissionMs').toFixed(3)} → ${avg(1,'cpuSubmissionMs').toFixed(3)} ms |\n`;
 const rs=records.filter(r=>r.sceneCase===c&&r.phase===phase);if(!rs.every(r=>r.report.simulationUnchanged&&JSON.stringify(r.camera)===JSON.stringify(rs[0].camera)))throw Error('State/camera differs');
}
md+='\nTodas las muestras conservaron el estado de simulación y las cámaras por fase. La escena acuática de Sabana es un río del mapa, no solo la charca de la cámara de juego. No se midió VRAM ni latencia de carga. Los valores negativos no prueban aceleración; consultar las repeticiones crudas y su deriva.\n';
await writeFile(root+'/PERFORMANCE.md',md);console.log(md);
