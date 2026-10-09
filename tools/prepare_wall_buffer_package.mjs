import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),hash=data=>createHash('sha256').update(data).digest('hex');
export function wallBufferReferences(pack){
 const rows=[];
 for(const [name,piece] of Object.entries(pack.pieces)){
  for(const key of ['p','n','uv','i','faceRegions'])rows.push({path:`pieces.${name}.${key}`,descriptor:piece[key],type:['i','faceRegions'].includes(key)?'u16':'f32'});
  for(const [dest,bridge] of Object.entries(piece.morph))for(const key of ['p','n'])rows.push({path:`pieces.${name}.morph.${dest}.${key}`,descriptor:bridge[key],type:'f32'});
 }
 return rows;
}
export async function prepareWallBufferPackage(){
 const pack=JSON.parse(await readFile(new URL('public/content/walls.json',root),'utf8')),rows=wallBufferReferences(pack),entries=[],chunks=[];let offset=0;
 const unique=new Set();
 for(const row of rows){
  const url=row.descriptor.url;if(!/^\/assets\/[a-f0-9]{64}\.bin$/.test(url)||unique.has(url))throw Error('Unexpected or repeated wall reference '+url);unique.add(url);
  const data=await readFile(new URL('public'+url,root)),alignment=row.type==='f32'?4:2;
  if(data.length%alignment)throw Error('Unaligned wall lane '+row.path);
  const padding=(4-offset%4)%4;if(padding){chunks.push(Buffer.alloc(padding));offset+=padding;}
  entries.push({url,path:row.path,type:row.type,offset,length:data.length,sha256:hash(data)});chunks.push(data);offset+=data.length;
 }
 const bytes=Buffer.concat(chunks),digest=hash(bytes),url=`/assets/wall-buffers-${digest}.bin`;
 const manifest={version:1,alignment:4,url,byteLength:bytes.length,sha256:digest,sourceDescriptorSha256:hash(await readFile(new URL('public/content/walls.json',root))),entries};
 await writeFile(new URL('public'+url,root),bytes);await mkdir(new URL('content/manifests/',root),{recursive:true});
 await writeFile(new URL('content/manifests/wall-buffer-package.json',root),JSON.stringify(manifest,null,2)+'\n');
 return manifest;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const manifest=await prepareWallBufferPackage();console.log(JSON.stringify({references:manifest.entries.length,payloadBytes:manifest.entries.reduce((n,e)=>n+e.length,0),packageBytes:manifest.byteLength,url:manifest.url,sha256:manifest.sha256}));}
