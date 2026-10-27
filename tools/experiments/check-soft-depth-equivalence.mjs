import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const source=fs.readFileSync('tools/experiments/check-spatial-thread-game.mjs','utf8'),anchor=' await writeFile(process.env.WG_THREAD_REPORT';
if(source.split(anchor).length!==2)throw Error('Report anchor');
const body=source.replace(anchor,` result.softDepth=await page.evaluate(async()=>{const w=qaThreadWorld;const {compareSoftDepthRegion}=await import('/tools/experiments/qa-soft-depth-equivalence.js');const previous=w.state.time,rows=[];try{for(const time of [150,350]){w.state.time=time;w.render(0);rows.push({time,...compareSoftDepthRegion(w)});}return rows;}finally{w.state.time=previous;}});\n`+anchor);
const temp='tools/experiments/.soft-depth-equivalence-generated.mjs';fs.writeFileSync(temp,body);
const out=process.argv[2]??'docs/qa/residual-spikes-20261027/soft-depth-equivalence';fs.mkdirSync(out,{recursive:true});
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('WG_')));Object.assign(env,{WG_THREAD_PORT:'5220',WG_THREAD_BIOME:'manglares',WG_THREAD_QUALITY:'media',WG_PRODUCTION_VISUALS:'1',WG_THREAD_DEFAULT_STREAMING:'1',WG_THREAD_REPORT:out+'/report.json'});
try{const r=spawnSync(process.execPath,[temp],{env,encoding:'utf8',maxBuffer:16*1024*1024});fs.writeFileSync(out+'/execution.log',(r.stdout??'')+(r.stderr??''));if(r.status!==0)throw Error('Depth comparison failed '+r.status);}finally{fs.unlinkSync(temp);}
