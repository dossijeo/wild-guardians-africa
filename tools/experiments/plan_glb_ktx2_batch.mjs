// Extract embedded source images once, preserving originals and glTF usage.
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join,dirname} from 'node:path';
import {assetUrl} from '../../src/rendering/asset-url.js';
const inventoryPath=process.argv[2]??'.cache/ktx2-fixture/inventory.json',output=process.argv[3]??'.cache/ktx2-fixture/glb-batch.json',inventory=JSON.parse(await readFile(inventoryPath,'utf8')),sourceDir='.cache/ktx2-native/glb-sources',items=new Map(),unresolved=[];await mkdir(sourceDir,{recursive:true});
let excludedSourceAliases=0;
for(const model of inventory.models??[]){
 if(assetUrl('/'+model.path)!=='/'+model.path){excludedSourceAliases++;continue;}
 const glb=await readFile(join('public',model.path));if(glb.toString('ascii',0,4)!=='glTF'||glb.readUInt32LE(4)!==2)throw Error('Invalid GLB: '+model.path);const jsonBytes=glb.readUInt32LE(12),json=JSON.parse(glb.subarray(20,20+jsonBytes).toString('utf8').trim()),binHeader=20+jsonBytes;if(glb.readUInt32LE(binHeader+4)!==0x004e4942)throw Error('Missing binary chunk: '+model.path);const binOffset=binHeader+8,binLength=glb.readUInt32LE(binHeader);
 for(const image of model.images){
  const definition=json.images?.[image.index],view=json.bufferViews?.[definition?.bufferView],mime=definition?.mimeType,extension={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[mime];if(!view||view.buffer!==0||!extension||!Number.isSafeInteger(view.byteLength)||view.byteLength<=0||(view.byteOffset??0)+view.byteLength>binLength){unresolved.push({model:model.path,index:image.index,reason:'external or unsupported image'});continue;}
  const known=image.roles.filter(role=>['baseColor','emissive','normal','occlusion','metallicRoughness'].includes(role)),unknown=image.roles.filter(role=>!known.includes(role));if(!known.length||unknown.length){unresolved.push({model:model.path,index:image.index,roles:image.roles,reason:'unknown or extension usage'});continue;}
  const kinds=new Set(known.map(role=>['baseColor','emissive'].includes(role)?'color':role==='normal'?'normal':'data')),start=binOffset+(view.byteOffset??0),bytes=glb.subarray(start,start+view.byteLength),sha=createHash('sha256').update(bytes).digest('hex'),source=join(sourceDir,`${sha}.${extension}`).replaceAll('\\','/');try{await access(source);}catch{await writeFile(source,bytes);}
  for(const kind of kinds){const key=sha+'|'+kind,entry=items.get(key)??{source,kind,uses:[]};entry.uses.push({model:model.path,imageIndex:image.index,roles:known.filter(role=>(['baseColor','emissive'].includes(role)?'color':role==='normal'?'normal':'data')===kind)});items.set(key,entry);}
 }
}
const records=[...items.values()].sort((a,b)=>a.source.localeCompare(b.source)||a.kind.localeCompare(b.kind));await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify({records,unresolved,excludedSourceAliases,scope:'Deduplicated embedded GLB images with core material roles. Source aliases redirected to web versions are excluded. Extension-only, unused, external or ambiguous images are reported separately; no GLBs are changed.'},null,2));console.log(JSON.stringify({output,records:records.length,uses:records.reduce((n,r)=>n+r.uses.length,0),unresolved:unresolved.length,excludedSourceAliases,roles:Object.fromEntries(['color','normal','data'].map(kind=>[kind,records.filter(x=>x.kind===kind).length]))}));
