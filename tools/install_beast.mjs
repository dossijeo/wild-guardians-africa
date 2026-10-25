import {readFile,writeFile,copyFile,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {readGlb} from './glb-container.mjs';
const species=process.argv[2],input=process.argv[3];
const recipes={rhino:{fragment:'Rinoceronte',file:'rinoceronte',donor:'b396fba7b2c500770a3770222fc6a3b5b9a17fce66933ad53d569ae349affc82'},lion:{fragment:'Leon',file:'león',donor:'5ac817bcc5a8147c69f0e9876d2e37a94228272b14b85be1d1ecbfd6e2d0527b'},buffalo:{fragment:'Bufalo',file:'búfalo',donor:'88552fdb555a88e55f8e392bfe381cbad0c6af861e993213a4ebc42cd0996d2b'},warthog:{fragment:'Facoquero',file:'facóquero',donor:'cb7a23479fb9210b6cda1ab13cbddd85b3ebce10cad863f1dd8ae1d9d66e4869'},hyena:{fragment:'Hiena',file:'hiena',donor:'7de8ad72063cfeeb74f5d334069b77a3ac5c06c39a6c674a75b21ff51a210c25'}};
const recipe=recipes[species];if(!recipe||!input)throw Error('Pass warthog|hyena|buffalo|lion|rhino and repaired GLB');
const bytes=await readFile(input),sha=createHash('sha256').update(bytes).digest('hex'),url='/assets/'+sha+'.glb',root=new URL('../',import.meta.url),{json}=readGlb(bytes);
await copyFile(input,new URL('public'+url,root));
const manifest=JSON.parse(await readFile(new URL('content/manifests/assets.json',root),'utf8'));
const model=manifest.models.find(m=>m.source.includes(recipe.fragment));
const previous=model.geometrySource?model.url:null;
model.url=url;model.animations=json.animations.map(a=>({name:a.name,channels:a.channels.length}));
model.geometrySource=`Wild Guardians New/animales/${recipe.file}.glb`;
model.replacement={repair:`tools/prepare_${species}.py`,report:`docs/qa/${species}-replacement/repair.json`,animationSourceSha256:recipe.donor};
if(json.asset.extras?.wildHeadPosture){
 const previousActions=JSON.parse(await readFile(new URL('content/manifests/animal-actions.json',root),'utf8'));
 model.replacement.headPosture={...json.asset.extras.wildHeadPosture,minimumFootprintRadius:previousActions.animals[species].presentation.footprint.radius};
}
if(!manifest.resources.some(r=>r.url===url))manifest.resources.push({url,bytes:bytes.length,sha256:sha,mime:'application/octet-stream',origins:[`${model.geometrySource}#repaired-retargeted`]});
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
Object.assign(models.find(m=>m.source.includes(recipe.fragment)),model);
await writeFile(new URL('public/content/models.json',root),JSON.stringify(models)+'\n');
console.log(sha+'.glb');
