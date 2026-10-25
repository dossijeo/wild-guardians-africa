import {readFile,writeFile,copyFile,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readGlb} from './glb-container.mjs';
const input=process.argv[2];if(!input)throw Error('Pass repaired Blender GLB');
const bytes=await readFile(input),sha=createHash('sha256').update(bytes).digest('hex'),url='/assets/'+sha+'.glb',root=new URL('../',import.meta.url),{json}=readGlb(bytes);
await copyFile(input,new URL('public'+url,root));
const manifest=JSON.parse(await readFile(new URL('content/manifests/assets.json',root),'utf8'));
const model=manifest.models.find(m=>m.source.includes('Facoquero'));
const previous=model.geometrySource?model.url:null;
model.url=url;model.animations=json.animations.map(a=>({name:a.name,channels:a.channels.length}));
model.geometrySource='Wild Guardians New/animales/facóquero.glb';
model.replacement={repair:'tools/prepare_warthog.py',report:'docs/qa/warthog-replacement/repair.json',animationSourceSha256:'cb7a23479fb9210b6cda1ab13cbddd85b3ebce10cad863f1dd8ae1d9d66e4869'};
if(!manifest.resources.some(r=>r.url===url))manifest.resources.push({url,bytes:bytes.length,sha256:sha,mime:'application/octet-stream',origins:['Wild Guardians New/animales/facóquero.glb#repaired-retargeted']});
if(previous&&previous!==url){
 if(!/^\/assets\/[a-f0-9]{64}\.glb$/.test(previous))throw Error('Unexpected previous replacement path');
 const prior=await readFile(new URL('public'+previous,root));
 if(createHash('sha256').update(prior).digest('hex')!==previous.slice(8,-4))throw Error('Previous replacement hash mismatch');
 manifest.resources=manifest.resources.filter(r=>r.url!==previous);
 for(const file of ['web-assets.json','web-assets-verification.json']){
  const path=new URL('content/manifests/'+file,root),data=JSON.parse(await readFile(path,'utf8'));
  data.records=data.records.filter(r=>r.source!==previous.slice(1));await writeFile(path,JSON.stringify(data,null,2)+'\n');
 }
 // Remove only our superseded generated files, keeping the original donor.
 for(const path of ['public'+previous,'public/assets/web/'+previous.split('/').at(-1)]){
  try{await unlink(new URL(path,root));}catch(error){if(error.code!=='ENOENT')throw error;}
 }
}
model.nodes=json.nodes.length;model.meshes=json.meshes.length;model.extras={replacement:model.replacement};
await writeFile(new URL('content/manifests/assets.json',root),(JSON.stringify(manifest,null,2)+'\n').replaceAll('\n','\r\n'));
// The public catalogue contains newer crop/worker overrides than the source
// inventory. Replace only this species, preserving every other descriptor.
const models=JSON.parse(await readFile(new URL('public/content/models.json',root),'utf8'));
Object.assign(models.find(m=>m.source.includes('Facoquero')),model);
await writeFile(new URL('public/content/models.json',root),JSON.stringify(models)+'\n');
console.log(sha+'.glb');
