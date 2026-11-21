// QA-only native BC7 glTF variant. Originals remain the fallback and authority.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {readGlb,writeGlb} from '../glb-container.mjs';

const model=process.argv[2]??'content/character-lod/hyena.glb';
const output=process.argv[3]??'public/qa/ktx2-fixture/hyena-native.glb';
const report=JSON.parse(await readFile('.cache/ktx2-native/glb/report.json','utf8'));
const {json,bin}=readGlb(await readFile('public/'+model));
if(json.buffers?.length!==1||json.buffers[0].uri||!bin)throw Error('Expected one embedded buffer');
if(JSON.stringify(json).includes('EXT_meshopt_compression'))throw Error('Meshopt buffer offsets require a separate repacker');
const replacements=new Map();
for(let i=0;i<(json.images?.length??0);i++){
  const image=json.images[i], matches=report.records.filter(r=>r.uses.some(u=>u.model===model&&u.imageIndex===i));
  if(matches.length!==1||image.bufferView===undefined)throw Error(`Image ${i} has no unique converted source`);
  if(replacements.has(image.bufferView))throw Error('Images share a buffer view');
  replacements.set(image.bufferView,await readFile(matches[0].output));
  image.mimeType='image/ktx2';
}
// A replaced image view must not also be geometry, animation, or extension data.
function scan(value,path=[]){
  if(!value||typeof value!=='object')return;
  for(const [key,child] of Object.entries(value)){
    if(key==='bufferView'&&replacements.has(child)&&path[0]!=='images')throw Error('Image buffer view also referenced at '+path.join('.'));
    scan(child,[...path,key]);
  }
}
scan(json);
const chunks=[];let offset=0;
for(let i=0;i<json.bufferViews.length;i++){
  const view=json.bufferViews[i];if(view.buffer!==0)throw Error('Unexpected external buffer view');
  const bytes=replacements.get(i)??bin.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength);
  if(!bytes.length)throw Error('Empty buffer view');
  const padding=(4-offset%4)%4;if(padding){chunks.push(Buffer.alloc(padding));offset+=padding;}
  view.byteOffset=offset;view.byteLength=bytes.length;chunks.push(bytes);offset+=bytes.length;
}
for(const texture of json.textures??[]){
  if(texture.source===undefined||texture.extensions?.EXT_texture_webp||texture.extensions?.KHR_texture_basisu)throw Error('Unexpected texture source');
  texture.extensions={...texture.extensions,WG_native_ktx2:{source:texture.source}};delete texture.source;
}
json.extensionsUsed=[...new Set([...(json.extensionsUsed??[]),'WG_native_ktx2'])];
json.extensionsRequired=[...new Set([...(json.extensionsRequired??[]),'WG_native_ktx2'])];
json.buffers[0].byteLength=offset;
const out=writeGlb(json,Buffer.concat(chunks));await mkdir(dirname(output),{recursive:true});await writeFile(output,out);
console.log(JSON.stringify({model,output,originalBytes:(await readFile('public/'+model)).length,nativeBytes:out.length,images:replacements.size}));
