import {spawn} from 'node:child_process';
const run=(file,env={})=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,[`tools/filament-evaluation/${file}`],{stdio:'inherit',env:{...process.env,...env}});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(`${file} exited ${code}`)))});
const protocol={WG_FILAMENT_ORDER:'three,filament,three,filament',WG_FILAMENT_FRAMES:'300',WG_FILAMENT_WARMUP:'120',WG_FILAMENT_SAMPLES:'60',WG_FILAMENT_CONTINUE:'0'};
await run('benchmark-run.mjs',{...protocol,WG_FILAMENT_SCENARIOS:'A,B,C',WG_FILAMENT_NATIVE:'1',WG_FILAMENT_OPTIMIZED:'0',WG_FILAMENT_OUT:'docs/qa/filament-evaluation/results-native'});
try{await run('benchmark-run.mjs',{...protocol,WG_FILAMENT_SCENARIOS:'A,B',WG_FILAMENT_NATIVE:'1',WG_FILAMENT_OPTIMIZED:'1',WG_FILAMENT_OUT:'docs/qa/filament-evaluation/results-optimized'});}catch(error){console.error('Optimized control failed; preserve its failure evidence separately:',error.message);await run('automatic-smoke.mjs');}
await run('benchmark-run.mjs',{...protocol,WG_FILAMENT_SCENARIOS:'C',WG_FILAMENT_DENSITIES:'1',WG_FILAMENT_NATIVE:'0',WG_FILAMENT_OPTIMIZED:'0',WG_FILAMENT_OUT:'docs/qa/filament-evaluation/results-expanded'});
await run('resource-run.mjs');
const analysis=spawn(process.execPath,['tools/filament-evaluation/analyze.mjs','docs/qa/filament-evaluation/results-native','docs/qa/filament-evaluation/results-expanded'],{stdio:'inherit'});
analysis.on('exit',code=>{process.exitCode=code});
