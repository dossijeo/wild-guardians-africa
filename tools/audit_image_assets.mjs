// Read-only inventory: no conversion, network calls or credentials.
import {readFile,readdir,stat,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,relative,extname} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {readGlb} from './glb-container.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const imageExtension=/\.(?:png|jpe?g|webp|avif|gif|svg)$/i;
const publicPath=path=>relative(resolve(root,'public'),path).replaceAll('\\','/');
async function walk(directory){
 const result=[];for(const entry of (await readdir(directory,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
  const path=resolve(directory,entry.name);if(entry.isDirectory())result.push(...await walk(path));else if(entry.isFile())result.push(path);
 }return result;
}
const exists=async path=>{try{return (await stat(path)).isFile();}catch(error){if(error.code==='ENOENT')return false;throw error;}};
async function describe(bytes){
 const m=await sharp(bytes,{animated:true}).metadata();
 return {sha256:hash(bytes),bytes:bytes.length,format:m.format,width:m.width,height:m.height,pageHeight:m.pageHeight??null,pages:m.pages??1,alpha:m.hasAlpha,channels:m.channels,space:m.space,orientation:m.orientation??null,icc:!!m.icc};
}
export function gltfImageRoles(json,imageIndex){
 const textureIds=new Set((json.textures??[]).flatMap((t,i)=>(t.extensions?.EXT_texture_webp?.source??t.source)===imageIndex?[i]:[]));
 const references=[];
 const visit=(value,path)=>{
  if(!value||typeof value!=='object')return;
  for(const [key,next] of Object.entries(value)){
   const location=path+'.'+key;
   if(/Texture$/.test(key)&&textureIds.has(next?.index))references.push({path:location,role:/baseColor|emissive|diffuse|specularColor|sheenColor/.test(key)?'color':key==='normalTexture'||/NormalTexture$/.test(key)?'normal':'data'});
   else visit(next,location);
  }
 };
 for(const [i,material] of (json.materials??[]).entries())visit(material,'materials['+i+']');
 const roles=[...new Set(references.map(r=>r.role))].sort();
 return {roles:roles.length?roles:['unclassified'],references,requiresExactPixels:roles.some(role=>role!=='color')||!roles.length};
}
export function groundImageReferences(ground){
 const roles=new Map();
 const visit=(value,field)=>{
  if(!value||typeof value!=='object')return;
  for(const [key,next] of Object.entries(value)){
   const path=field?field+'.'+key:key;
   if(['base','normal','arh'].includes(key)&&typeof next==='string'&&imageExtension.test(next)){
    const source=next.replace(/^\//,''),references=roles.get(source)??[];
    references.push({field:path,role:key==='base'?'color':key==='normal'?'normal':'data'});roles.set(source,references);
   }else visit(next,path);
  }
 };
 visit(ground,'');return roles;
}
export function biomeTextureReferences(payload,catalog){
 return (payload.textures??[]).flatMap((texture,index)=>{
  const source=texture.base64?.url;if(typeof source!=='string'||!imageExtension.test(source))return [];
  return [{path:source.replace(/^\//,''),reference:{catalog,field:'textures['+index+']',declaredRole:texture.role,role:['baseColor','emissive'].includes(texture.role)?'color':texture.role==='normal'?'normal':'data'}}];
 });
}
export async function auditImageAssets(){
 const publicFiles=await walk(resolve(root,'public')),ground=JSON.parse(await readFile(resolve(root,'public/content/ground-materials.json'),'utf8'));
 const knownRoles=groundImageReferences(ground);
 const hudText=await readFile(resolve(root,'src/ui/native-hud.js'),'utf8');
 const hudMatch=hudText.match(/const ASSETS=(\{[^\n]+?\});/);
 if(!hudMatch)throw Error('Native HUD art dictionary requires review');
 for(const [key,asset] of Object.entries(JSON.parse(hudMatch[1]))){
  const path=asset.src?.replace(/^\//,'');if(!path||!imageExtension.test(path))continue;
  const refs=knownRoles.get(path)??[];refs.push({catalog:'src/ui/native-hud.js',field:'ASSETS.'+key,role:'color'});knownRoles.set(path,refs);
 }
 const resources=JSON.parse(await readFile(resolve(root,'content/manifests/assets.json'),'utf8')).resources;
 const origins=new Map(resources.map(r=>[r.url.replace(/^\//,''),r.origins??[]]));
 for(const file of publicFiles.filter(p=>/biome-[^\\/]+\.json$/.test(p))){
  const payload=JSON.parse(await readFile(file,'utf8'));
  for(const {path,reference} of biomeTextureReferences(payload,publicPath(file))){const refs=knownRoles.get(path)??[];refs.push(reference);knownRoles.set(path,refs);}
 }
 // These catalogs describe visual UI/sky/crop pictures, never data textures.
 for(const catalog of ['crop-thumbnails','menu','selector','skies']){
  const visit=(value,field)=>{
   if(typeof value==='string'&&/^\/?assets\//.test(value)&&imageExtension.test(value)){
    const path=value.replace(/^\//,''),refs=knownRoles.get(path)??[];refs.push({catalog,field,role:'color'});knownRoles.set(path,refs);
   }else if(value&&typeof value==='object')for(const [key,next] of Object.entries(value))visit(next,field?field+'.'+key:key);
  };
  visit(JSON.parse(await readFile(resolve(root,'public/content/'+catalog+'.json'),'utf8')),'');
 }
 const standalone=[],embedded=[],inline=[],unparsedInline=[],errors=[];
 const distributed=path=>exists(resolve(root,'dist',path));
 for(const file of publicFiles){
  const path=publicPath(file),suffix=extname(path).toLowerCase();
  if(imageExtension.test(path)){
   try{const references=knownRoles.get(path)??[],roles=[...new Set(references.map(r=>r.role))].sort();standalone.push({path,distributed:await distributed(path),...await describe(await readFile(file)),roles:roles.length?roles:['unclassified'],origins:origins.get(path)??[],references,requiresExactPixels:!roles.length||roles.some(r=>r!=='color')});}
   catch(error){errors.push({path,error:error.message});}
  }else if(suffix==='.glb'){
   const {json,bin}=readGlb(await readFile(file));
   for(const [index,image] of (json.images??[]).entries()){
    const view=json.bufferViews?.[image.bufferView];
    if(!view){errors.push({path,index,error:'Image without embedded bufferView requires URI review'});continue;}
    try{const bytes=bin.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength);embedded.push({path,index,distributed:await distributed(path),mimeType:image.mimeType,...await describe(bytes),...gltfImageRoles(json,index)});}
    catch(error){errors.push({path,index,error:error.message});}
   }
  }else if(['.html','.js','.json','.css'].includes(suffix)){
   const text=await readFile(file,'utf8');
   for(const match of text.matchAll(/data:image\/(png|jpeg|webp|gif|avif|svg\+xml);base64,([A-Za-z0-9+/=\r\n]+)/g)){
    try{inline.push({path,offset:match.index,distributed:await distributed(path),...await describe(Buffer.from(match[2],'base64')),roles:['unclassified'],requiresExactPixels:true});}
    catch(error){errors.push({path,offset:match.index,error:error.message});}
   }
   for(const match of text.matchAll(/data:image\/(?![\w+.-]+;base64,)[^"'\s)]+/g))unparsedInline.push({path,offset:match.index,distributed:await distributed(path),reason:'Non-base64 image URI requires manual review'});
  }
 }
 const summary=rows=>({count:rows.length,bytes:rows.reduce((n,r)=>n+r.bytes,0),formats:Object.fromEntries([...new Set(rows.map(r=>r.format))].sort().map(format=>[format,rows.filter(r=>r.format===format).length])),exactPixels:rows.filter(r=>r.requiresExactPixels).length,unclassified:rows.filter(r=>r.roles.includes('unclassified')).length,uniqueHashes:new Set(rows.map(r=>r.sha256)).size});
 const rows=[...standalone,...embedded,...inline],shipped=rows.filter(r=>r.distributed);
 return {schema:'wg-image-inventory-1',standalone,embedded,inline,unparsedInline,errors,summary:{all:summary(rows),distributed:summary(shipped),standalone:summary(standalone.filter(r=>r.distributed)),embedded:summary(embedded.filter(r=>r.distributed)),inline:summary(inline.filter(r=>r.distributed))},scope:'Current public originals/archive and runtime images with dist membership from the existing build. Encoded image bytes, not total GLB/container size or decoded GPU/RAM. Unclassified and non-base64 references require review; no images converted or uploaded.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const output=resolve(root,process.argv[2]??'.cache/image-inventory.json');const report=await auditImageAssets();await mkdir(resolve(output,'..'),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({summary:report.summary,errors:report.errors.length,unparsedInline:report.unparsedInline.length,output}));if(report.errors.length)process.exitCode=1;
}
