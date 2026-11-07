import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
const dir=process.argv[2];if(!dir)throw Error('Usage: node run_webgpu_on_demand_matrix.mjs OUTPUT_DIRECTORY');
await mkdir(dir,{recursive:true});
const cases=[['webgl','direct'],['webgpu','async'],['webgl','async'],['webgpu','direct'],['webgpu','direct'],['webgl','async'],['webgpu','async'],['webgl','direct'],['webgl','async'],['webgpu','direct'],['webgl','direct'],['webgpu','async']];
for(const [index,[backend,mode]] of cases.entries()){
 const output=join(dir,`wg-full-${index}-${backend}-${mode}.json`);
 console.log(`${index+1}/${cases.length}: ${backend} ${mode}`);
 const env={...process.env,WG_SOURCE:'full',WG_TRACE:'0',WG_CPU_PROFILE:'0',WG_QUEUE_FENCE:'0',WG_TARGET:'separate',WG_BACKEND:backend,WG_MODE:mode,WG_OUTPUT:output};
 delete env.WG_SCREENSHOT;
 const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,['tools/experiments/audit_webgpu_on_demand.mjs'],{env,stdio:'inherit'});child.once('error',reject);child.once('exit',resolve);});
 if(code!==0)throw Error(`Run ${index} failed with exit code ${code}`);
}
