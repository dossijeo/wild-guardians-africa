import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {publicText} from './web-package.mjs';
import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,extname,dirname,relative} from 'node:path';
const root=resolve('dist'),manifest=JSON.parse(await readFile('content/manifests/web-assets.json','utf8'));let files=0,bytes=0,links=0;
const inventory=new Set();
async function collect(dir){for(const name of await readdir(dir)){const path=resolve(dir,name);if((await stat(path)).isDirectory())await collect(path);else inventory.add(relative(root,path).replaceAll('\\','/'));}}
await collect(root);
const spiritManifest=JSON.parse(await readFile('content/manifests/spirit-voices.json','utf8'));
assert.equal(spiritManifest.records.length,54);
for(const record of spiritManifest.records){
 const bytes=await readFile(resolve(root,record.path));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256,'Original Spirit clip changed in package: '+record.path);
}
async function exists(file){return inventory.has(relative(root,file).replaceAll('\\','/'));}
for(const item of manifest.records){assert(!await exists(resolve(root,item.source)),'Original GLB duplicated in dist');assert(await exists(resolve(root,item.runtime)),'Runtime GLB missing');}
const musicManifest=JSON.parse(await readFile('content/manifests/audio-runtime.json','utf8'));
const sfxManifest=JSON.parse(await readFile('content/manifests/sfx-runtime.json','utf8'));
const audioManifest={records:[...musicManifest.records,...sfxManifest.records]};
assert.equal(sfxManifest.records.filter(r=>r.kind==='sfx').length,126);
const sha=data=>createHash('sha256').update(data).digest('hex');
assert.equal(audioManifest.records.filter(r=>r.kind==='music').length,21);
assert.equal(audioManifest.records.filter(r=>r.kind==='music-index').length,2);
for(const item of audioManifest.records){
 assert(!await exists(resolve(root,item.source)),'Original audio resource duplicated: '+item.source);
 assert(await exists(resolve(root,item.runtime)),'Runtime audio resource missing: '+item.runtime);
 const packaged=await readFile(resolve(root,item.runtime));
 if(item.kind==='music'||item.kind==='sfx')assert.equal(sha(packaged),item.runtimeSha256,'Runtime audio bytes changed: '+item.runtime);
 else assert.equal(packaged.toString('utf8'),publicText(await readFile(resolve('public',item.runtime),'utf8'),item.runtime,audioManifest),'Audio metadata changed beyond relative routes');
}
const imageManifest=JSON.parse(await readFile('content/manifests/image-runtime.json','utf8'));
const {default:sharp}=await import('sharp');
for(const item of imageManifest.records){
 assert(!await exists(resolve(root,item.source)),'Original image duplicated: '+item.source);
 const output=await readFile(resolve(root,item.runtime));assert.equal(sha(output),item.runtimeSha256,'Runtime image bytes changed');
 if(item.kind==='data-image'){const {compareDataPixels}=await import('./lossless-data-image.mjs');const comparison=await compareDataPixels(await readFile(resolve('public',item.source)),output);assert(comparison.rawPixelsEqual,'Shader data channels changed');assert.equal(comparison.runtimePixelSha256,item.runtimePixelSha256);}
 const info=await sharp(output).metadata();assert.equal(info.format,'webp');assert.equal(info.width,item.width);assert.equal(info.height,item.height);assert.equal(info.hasAlpha,item.hasAlpha);
}
const packagedManifest=JSON.parse(await readFile(resolve(root,'content/web-assets.json'),'utf8'));
for(const item of imageManifest.records)assert(packagedManifest.records.some(r=>r.source===item.source&&r.runtime===item.runtime),'Missing packaged image alias');
for(const pack of ['a','b']){
 const index=JSON.parse(await readFile(resolve(root,`content/music-opus-windows-${pack}.json`),'utf8'));
 for(const track of index.tracks){
  assert.equal(track.url,track.fullUrl,'Windows and compatibility must share one resource');
  assert(!track.url.startsWith('/'),'Root musical route in web package');
  assert(await exists(resolve(root,track.url)),'Missing Opus window source');
 }
}
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
assert(await exists(resolve(root,'content/watering-emitters.json')),'Prepared watering paths missing');
assert.equal(await readFile(resolve(root,'content/watering-emitters.json'),'utf8'),await readFile('public/content/watering-emitters.json','utf8'),'Prepared watering paths changed in build');
const biomeArchive=JSON.parse(await readFile('content/manifests/biome-lab-update.json','utf8'));
for(const url of biomeArchive.archiveOnly)assert(!await exists(resolve(root,url.slice(1))),'Demo village archive must not ship');

const groundBake=JSON.parse(await readFile('content/manifests/mangrove-ground-bake.json','utf8'));
for(const url of groundBake.archiveOnly)assert(!await exists(resolve(root,url.slice(1))),'Original mangrove texture duplicated in package');
for(const item of Object.values({...groundBake.maps,...Object.fromEntries(Object.entries(groundBake.mudMaps??{}).map(([k,v])=>['mud-'+k,v]))}))assert(await exists(resolve(root,item.url.slice(1))),'Baked mangrove texture missing');

console.log(`PASS: ${files} files / ${bytes} bytes, ${links} relative links, 20 runtime GLBs, no original GLBs, demo village or superseded ground duplicates`);
