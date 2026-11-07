import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtemp,mkdir,readFile,writeFile,unlink,rmdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ANIMAL_ACTIONS} from '../../src/simulation/animal-actions-data.js';

// Rebuild the existing canonical-root authoring output. This does not certify
// visual parity, contacts or suitability for production playback.
const check=process.argv.includes('--check'),clip=process.argv.find(arg=>arg.startsWith('--clip='))?.slice(7)??'Walking';if(!['Walking','Running'].includes(clip))throw Error('Invalid animal bake clip');const root=await mkdtemp(join(tmpdir(),'wg-baked-walk-')),species=Object.keys(ANIMAL_ACTIONS.animals).sort(),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
try{
 for(const name of species){
  const temporary=join(root,name),destination=join('public','content',clip==='Running'?'gpu-animal-run':'gpu-walk',name);await mkdir(temporary);
  execFileSync(process.execPath,['tools/guardian/prototype_bake_gpu_walk.mjs'],{env:{...process.env,BAKE_SPECIES:name,BAKE_CLIP:clip,BAKE_FPS:'30',BAKE_OUTPUT:temporary},stdio:'inherit'});
  const meta=JSON.parse(await readFile(join(temporary,'walking.json'),'utf8')),bytes=await readFile(join(temporary,'walking.bin')),source=await readFile(meta.source);
  if(meta.species!==name||meta.clip!==clip||meta.byteLength!==bytes.length||meta.sha256!==sha(bytes)||meta.sourceSha256!==sha(source)||meta.validation?.exactMismatches!==0||meta.validation?.packedMismatches!==0)throw Error('Invalid baked walk: '+name);
  delete meta.bakeMs;const text=JSON.stringify(meta,null,2)+'\n';
  if(check){if((await readFile(join(destination,'walking.json'),'utf8')).replace(/\r\n/g,'\n')!==text||!bytes.equals(await readFile(join(destination,'walking.bin'))))throw Error('Baked walk differs: '+name);}
  else{await mkdir(destination,{recursive:true});await writeFile(join(destination,'walking.json'),text);await writeFile(join(destination,'walking.bin'),bytes);}
 }
}finally{
 for(const name of species){const directory=join(root,name);for(const file of ['walking.json','walking.bin'])await unlink(join(directory,file)).catch(()=>{});await rmdir(directory).catch(()=>{});}await rmdir(root).catch(()=>{});
}
