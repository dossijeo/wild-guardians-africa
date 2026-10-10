// Isolated QA only: load four immutable Git blobs while using the exact same
// common fixture/metrics. Never replaces files in the working tree.
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {relative,resolve} from 'node:path';
const ref=process.env.WG_RESERVATION_BASELINE_REF;
if(!/^[0-9a-f]{8,40}$/.test(ref??''))throw Error('Explicit immutable baseline revision required');
const root=fileURLToPath(new URL('../',import.meta.url));
const frozen=new Set(['src/simulation/raids.js','src/simulation/raid-contention.js','src/simulation/defensive-groups.js','src/world/navigation.js']);
export async function load(url,context,nextLoad){
 if(url.startsWith('file:')){
  const path=relative(root,fileURLToPath(url)).replaceAll('\\','/');
  if(frozen.has(path))return {format:'module',source:execFileSync('git',['show',`${ref}:${path}`],{cwd:resolve(root),encoding:'utf8'}),shortCircuit:true};
 }
 return nextLoad(url,context);
}
