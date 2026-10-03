import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,extname,dirname,relative} from 'node:path';
const root=resolve('dist'),manifest=JSON.parse(await readFile('content/manifests/web-assets.json','utf8'));let files=0,bytes=0,links=0;
const inventory=new Set();
async function collect(dir){for(const name of await readdir(dir)){const path=resolve(dir,name);if((await stat(path)).isDirectory())await collect(path);else inventory.add(relative(root,path).replaceAll('\\','/'));}}
await collect(root);
async function exists(file){return inventory.has(relative(root,file).replaceAll('\\','/'));}
for(const item of manifest.records){assert(!await exists(resolve(root,item.source)),'Original GLB duplicated in dist');assert(await exists(resolve(root,item.runtime)),'Runtime GLB missing');}
async function walk(dir){for(const name of await readdir(dir)){const path=resolve(dir,name),info=await stat(path);if(info.isDirectory()){await walk(path);continue;}files++;bytes+=info.size;
 if(!['.html','.css','.json'].includes(extname(path)))continue;
 const text=await readFile(path,'utf8');assert(!/(?:src|href)=["']\/(?!\/)/.test(text),'Root HTML route in '+path);assert(!/url\(["']?\/(?!\/)/.test(text),'Root CSS route in '+path);
 const urls=extname(path)==='.html'?[...text.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(m=>m[1]):extname(path)==='.css'?[...text.matchAll(/url\(["']?([^\)"']+)/g)].map(m=>m[1]):[];
 const context=path.startsWith(resolve(root,'library')+ (process.platform==='win32'?'\\':'/'))?root:dirname(path);
 for(const url of urls){if(/^(?:https?:|data:|#|blob:)/.test(url))continue;assert(await exists(resolve(context,url.split(/[?#]/)[0])),'Missing relative resource '+url+' from '+path);links++;}
 if(extname(path)==='.json'&&path!==resolve(root,'content/web-assets.json')){
  async function values(value){if(typeof value==='string'&&/^(?:assets|library|content)\//.test(value)){assert(await exists(resolve(root,value)),'Missing JSON resource '+value+' from '+path);links++;}else if(value&&typeof value==='object')for(const item of Object.values(value))await values(item);}
  await values(JSON.parse(text));
 }
}}
await walk(root);assert(await exists(resolve(root,'index.html')));assert(await exists(resolve(root,'content/ground-materials.json')),'Native ground material profiles missing');
const biomeArchive=JSON.parse(await readFile('content/manifests/biome-lab-update.json','utf8'));
for(const url of biomeArchive.archiveOnly)assert(!await exists(resolve(root,url.slice(1))),'Demo village archive must not ship');

const groundBake=JSON.parse(await readFile('content/manifests/mangrove-ground-bake.json','utf8'));
for(const url of groundBake.archiveOnly)assert(!await exists(resolve(root,url.slice(1))),'Original mangrove texture duplicated in package');
for(const item of Object.values(groundBake.maps))assert(await exists(resolve(root,item.url.slice(1))),'Baked mangrove texture missing');

console.log(`PASS: ${files} files / ${bytes} bytes, ${links} relative links, 20 runtime GLBs, no original GLBs, demo village or superseded ground duplicates`);
