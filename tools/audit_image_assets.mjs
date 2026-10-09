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
// HQ backdrop colors are tied to pinned encoder bytes and atlas UV/alpha
// contracts. Classify their actual consumer without enabling generic aliases.
export function mountainProfileImageReferences(text){
 const match=text.match(/const atlases=(\{[\s\S]*?\});\r?\nexport function mountainBackdropProfile/);
 if(!match)throw Error('Mountain atlas dictionary requires review');
 const profiles=JSON.parse(match[1]),biomes=['savanna','grand_river','mangrove','volcanoes','canyons','desert'];
 if(Object.keys(profiles).length!==biomes.length)throw Error('Mountain atlas biomes require review');
 return biomes.map(biome=>{
  const p=profiles[biome],path=`assets/far-vegetation/${biome}-hq-backdrop.webp`;
  if(p?.atlas!==path||!Number.isSafeInteger(p.bytes)||p.bytes<=0||!/^[0-9a-f]{64}$/.test(p.sha256)||p.dimensions?.length!==2||p.dimensions[0]!==2048||p.dimensions[1]!==512)throw Error('Mountain atlas contract requires review');
  return {path,reference:{catalog:'src/rendering/mountain-backdrop-profile.js',field:biome+'.atlas',role:'color-atlas',encodedContract:true,sha256:p.sha256,bytes:p.bytes}};
 });
}
export function requireUnpinnedImageAlias(references){
 if(references?.some(r=>r.encodedContract||r.requiresAtlasExport))throw Error('Pinned atlas alias requires regenerated export contract');
}
export function farAtlasImageReferences(manifest,consumerText){
 const biomes=['savanna','grand_river','mangrove','volcanoes','canyons','desert'];
 if(Object.keys(manifest.biomes??{}).sort().join()!==[...biomes].sort().join()||manifest.views!==8||manifest.orientations!==8)throw Error('Far atlas manifest requires review');
 if(!consumerText.includes('load(metadata.day,')||!consumerText.includes('load(metadata.night,')||!consumerText.includes("'assets/far-vegetation/'+world.nav.config.biome+'-backdrop.webp'"))throw Error('Far atlas consumer requires review');
 const refs=[];
 for(const biome of biomes){
  const entries=manifest.biomes[biome];if(!Array.isArray(entries)||!entries.length)throw Error('Far atlas species require review');
  const slots=new Set();
  for(const entry of entries){
   if(!Number.isSafeInteger(entry.slot)||entry.slot<0||slots.has(entry.slot))throw Error('Far atlas slot requires review');slots.add(entry.slot);
   for(const phase of ['day','night']){
    const path=entry[phase]?.replace(/^\.\//,'');
    if(path!==`assets/far-vegetation/${biome}-${entry.slot}-${phase}.webp`)throw Error('Far atlas path requires review');
    refs.push({path,reference:{catalog:'content/far-vegetation.json',field:`biomes.${biome}[${entry.slot}].${phase}`,consumer:'src/rendering/far-vegetation.js',role:'color-atlas',requiresAtlasExport:true}});
   }
  }
  refs.push({path:`assets/far-vegetation/${biome}-backdrop.webp`,reference:{catalog:'src/rendering/far-vegetation.js',field:'backdropPath.fallback.'+biome,role:'color-atlas',requiresAtlasExport:true}});
 }
 return refs;
}
export function loadingOrnamentImageReferences(text){
 const match=text.match(/image\.src=assetUrl\((["'])(\/assets\/ui\/loading-ornament-v2\.webp)\1\)/);
 if(!match)throw Error('Loading ornament consumer requires review');
 return [{path:match[2].slice(1),reference:{catalog:'src/ui/loading-ornament-loader.js',field:'image.src',role:'color'}}];
}
export function nativeCatalogImageReferences({villages=[],walls={},vfx={},menuHtml=''}={}){
 const refs=[];
 const add=(source,catalog,field,role)=>{if(typeof source==='string'&&/^\/?assets\//.test(source)&&imageExtension.test(source))refs.push({path:source.replace(/^\//,''),reference:{catalog,field,role}});};
 for(const [i,village] of villages.entries()){
  for(const [key,url] of Object.entries(village.textures??{}))add(url,'content/villages.json','['+i+'].textures.'+key,({color:'color',normal:'normal',rough:'data'})[key]??'unclassified');
  add(village.photo,'content/villages.json','['+i+'].photo','color');
 }
 add(walls.texture,'content/walls.json','texture','color');
 for(const [key,url] of Object.entries(walls.icons??{}))add(url,'content/walls.json','icons.'+key,'color');
 // Sprite-atlas channels remain conservative data until a separate visual policy.
 add(vfx.atlas,'content/vfx.json','atlas','data');
 for(const [i,item] of (vfx.resources??[]).entries())add(item.thumb,'content/vfx.json','resources['+i+'].thumb','color');
 for(const [id,role] of Object.entries({backgrounddata:'color',skydata:'color',cleandata:'color',terrainmaskdata:'data'})){
  const match=menuHtml.match(new RegExp('<script[^>]*id=[\"\']'+id+'[\"\'][^>]*>([\\s\\S]*?)</script>','i'));
  if(match)add(match[1].trim(),'menu/index.html','#'+id,role);
 }
 return refs;
}
// Only explicit display consumers are classified; arbitrary asset URLs in scripts
// can be shader data and must remain unknown until their semantic use is reviewed.
export function displayImageReferences({markup='',catalog='',handsText='',guardianText='',destructionText='',supportProbeText=''}={}){
 const refs=[];
 const add=(path,source,field)=>{if(typeof path==='string'&&/^\/?assets\//.test(path)&&imageExtension.test(path))refs.push({path:path.replace(/^\//,''),reference:{catalog:source,field,role:'color'}});};
 const displayMarkup=markup.replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,part=>' '.repeat(part.length));
 for(const tag of displayMarkup.matchAll(/<img\b[^>]*>/gi)){
  const src=tag[0].match(/\ssrc\s*=\s*(["'])(.*?)\1/i);if(src)add(src[2],catalog,'img.src@'+tag.index);
 }
 if(handsText){
  const dictionary=handsText.match(/export const HAND_ASSETS\s*=\s*(\{[^\n]+?\});/);
  if(!dictionary)throw Error('Native hand art dictionary requires review');
  for(const [kind,path] of Object.entries(JSON.parse(dictionary[1])))add(path,'src/rendering/hands-native.js','HAND_ASSETS.'+kind);
 }
 if(guardianText){
  const sprite=guardianText.match(/export const GUARDIAN_SPRITE\s*=\s*(["'])(.*?)\1/);
  if(!sprite)throw Error('Native guardian sprite requires review');
  add(sprite[2],'src/ui/guardian-native.js','GUARDIAN_SPRITE');
 }
 if(destructionText){
  const previews=[...destructionText.matchAll(/\bpreview\s*:\s*(["'])(\/?assets\/[^"']+)\1\s*,\s*previewKind\s*:\s*(["'])reference\3/g)];
  if(!previews.length)throw Error('Destruction reference preview catalog requires review');
  for(const preview of previews)add(preview[2],'library/destruction/script-5.js','BUILDINGS.preview@'+preview.index);
 }
 if(supportProbeText){
  const probe=supportProbeText.match(/detectSupport\(\)\{[^}]{0,250}?image\.src\s*=\s*(["'])(\/?assets\/[^"']+)\1;[^\n]{0,300}?image\.height===1/);
  if(!probe)throw Error('WebP capability probe requires review');
  const path=probe[2];if(imageExtension.test(path))refs.push({path:path.replace(/^\//,''),reference:{catalog:'library/crops/script-3.js',field:'GLTFTextureWebPExtension.detectSupport',role:'data'}});
 }
 return refs;
}
export async function auditImageAssets(){
 const publicFiles=await walk(resolve(root,'public')),ground=JSON.parse(await readFile(resolve(root,'public/content/ground-materials.json'),'utf8'));
 const knownRoles=groundImageReferences(ground);
 for(const {path,reference} of [
  ...farAtlasImageReferences(JSON.parse(await readFile(resolve(root,'public/content/far-vegetation.json'),'utf8')),await readFile(resolve(root,'src/rendering/far-vegetation.js'),'utf8')),
  ...loadingOrnamentImageReferences(await readFile(resolve(root,'src/ui/loading-ornament-loader.js'),'utf8')),
 ]){const refs=knownRoles.get(path)??[];refs.push(reference);knownRoles.set(path,refs);}
 const mountainPath=resolve(root,'src/rendering/mountain-backdrop-profile.js');
 if(await exists(mountainPath))for(const {path,reference} of mountainProfileImageReferences(await readFile(mountainPath,'utf8'))){const refs=knownRoles.get(path)??[];refs.push(reference);knownRoles.set(path,refs);}
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
 const nativeCatalogs={};
 for(const name of ['villages','walls','vfx'])nativeCatalogs[name]=JSON.parse(await readFile(resolve(root,'public/content/'+name+'.json'),'utf8'));
 nativeCatalogs.menuHtml=await readFile(resolve(root,'public/menu/index.html'),'utf8');
 for(const {path,reference} of nativeCatalogImageReferences(nativeCatalogs)){const refs=knownRoles.get(path)??[];refs.push(reference);knownRoles.set(path,refs);}
 const displayRefs=displayImageReferences({handsText:await readFile(resolve(root,'src/rendering/hands-native.js'),'utf8'),guardianText:await readFile(resolve(root,'src/ui/guardian-native.js'),'utf8'),destructionText:await readFile(resolve(root,'public/library/destruction/script-5.js'),'utf8'),supportProbeText:await readFile(resolve(root,'public/library/crops/script-3.js'),'utf8')});
 for(const file of publicFiles.filter(file=>extname(file).toLowerCase()==='.html'))displayRefs.push(...displayImageReferences({markup:await readFile(file,'utf8'),catalog:publicPath(file)}));
 for(const {path,reference} of displayRefs){const refs=knownRoles.get(path)??[];refs.push(reference);knownRoles.set(path,refs);}
 const imageVariants=JSON.parse(await readFile(resolve(root,'content/manifests/image-runtime.json'),'utf8'));
 for(const record of imageVariants.records){const refs=knownRoles.get(record.source);requireUnpinnedImageAlias(refs);if(!refs?.length||refs.some(r=>r.role==='unclassified')||refs.some(r=>r.role!=='color')&&!(record.kind==='data-image'&&record.encoding==='lossless-webp'&&record.rawPixelsEqual===true))throw Error('Image runtime alias requires reviewed color or exact data source');knownRoles.set(record.runtime,refs.map(r=>({...r,source:record.source})));}
 const standalone=[],embedded=[],inline=[],unparsedInline=[],errors=[];
 const distributed=path=>exists(resolve(root,'dist',path));
 for(const file of publicFiles){
  const path=publicPath(file),suffix=extname(path).toLowerCase();
  if(imageExtension.test(path)){
   try{const references=knownRoles.get(path)??[],roles=[...new Set(references.map(r=>r.role))].sort(),description=await describe(await readFile(file));for(const ref of references.filter(r=>r.encodedContract))if(ref.sha256!==description.sha256||ref.bytes!==description.bytes||description.width!==2048||description.height!==512||!description.alpha)throw Error('Pinned mountain atlas bytes or metadata differ');standalone.push({path,distributed:await distributed(path),...description,roles:roles.length?roles:['unclassified'],origins:origins.get(path)??[],references,requiresExactPixels:!roles.length||roles.some(r=>r!=='color')});}
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
