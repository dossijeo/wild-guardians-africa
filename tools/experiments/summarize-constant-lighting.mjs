import {readFile,writeFile} from 'node:fs/promises';
const root='docs/qa/global-visual-lab/global-lighting-integrated';
const {records}=JSON.parse(await readFile(root+'/abba.json'));
let md='# Rendimiento de paletas constantes y carbón volcánico\n\nABBA por páginas nuevas, semilla 712, calidad media, 1280×720, 180 muestras tras calentamiento. Código congelado durante toda la medición; la posterior separación de claves de caché por bioma no cambia GLSL ni el caso de un bioma por renderer medido aquí. Las métricas completas están en abba.json.\n\n| Escena | GPU base → opción | Δ GPU | CPU envío base → opción |\n|---|---:|---:|---:|\n';
for(const sceneCase of [1,16,21])for(const phase of ['day','night']){
 const avg=(v,k)=>{const rs=records.filter(r=>r.sceneCase===sceneCase&&r.phase===phase&&r.variant===v);return rs.reduce((n,r)=>n+r[k],0)/rs.length};
 const a=avg('0','gpuFrameMs'),b=avg('global-lighting','gpuFrameMs');
 md+=`| ${{1:'Sabana',16:'Volcanes',21:'Cañón'}[sceneCase]} ${phase} | ${a.toFixed(3)} → ${b.toFixed(3)} ms | ${(b-a).toFixed(3)} ms | ${avg('0','cpuSubmissionMs').toFixed(3)} → ${avg('global-lighting','cpuSubmissionMs').toFixed(3)} ms |\n`;
}
md+='\nSabana supera +0,5 ms GPU en ambas fases en esta ronda. Cañón diurno también supera el umbral; su referencia nocturna deriva de 13,006 a 14,911 ms, por lo que la media negativa no demuestra aceleración. Volcanes no muestra regresión media superior al umbral. La opción sigue siendo experimental: esta ronda no aprueba un presupuesto global.\n\nLos draws y triángulos enviados por el pass de color permanecen iguales en cada bioma (87/1.267.266 Sabana, 89/744.270 Volcanes, 80/623.210 Cañón). Esto no anula el coste de actualizar sombras del terreno: el benchmark permite su caché y la medición conservadora sin caché está en ../terrain-shadow-volume/README.md. No se midieron VRAM ni latencia de carga. Gran Río, Manglares y Desierto no se midieron en esta ronda.\n';
await writeFile(root+'/CONSTANT-PERFORMANCE.md',md);console.log(md);
