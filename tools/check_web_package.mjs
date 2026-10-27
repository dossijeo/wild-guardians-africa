import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {publicText,UNUSED_WORKER_LAB_MODELS,UNUSED_CROP_LAB_MODEL,UNUSED_ANIMAL_LAB_MODELS,QA_ONLY_VISUAL_DIRECTORIES,RETIRED_MENU_ASSETS,QA_ONLY_VILLAGE_FILES,QA_ONLY_GROUND_FILES} from './web-package.mjs';
import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,extname,dirname,relative} from 'node:path';
const root=resolve('dist'),manifest=JSON.parse(await readFile('content/manifests/web-assets.json','utf8'));let files=0,bytes=0,links=0;
const inventory=new Set();
async function collect(dir){for(const name of await readdir(dir)){const path=resolve(dir,name);if((await stat(path)).isDirectory())await collect(path);else inventory.add(relative(root,path).replaceAll('\\','/'));}}
await collect(root);
for(const path of inventory)if(['.js','.mjs','.json','.html','.css'].includes(extname(path))){const text=await readFile(resolve(root,path),'utf8');for(const name of QA_ONLY_VISUAL_DIRECTORIES)assert(!text.includes('assets/visual-lab/'+name+'/'),'Packaged code references excluded QA assets: '+path+' -> '+name);}
for(const name of QA_ONLY_VISUAL_DIRECTORIES)assert(![...inventory].some(path=>path.startsWith(`assets/visual-lab/${name}/`)),'QA-only visual assets must not ship: '+name);
for(const name of [...QA_ONLY_VILLAGE_FILES,...QA_ONLY_GROUND_FILES]){assert(!inventory.has('assets/visual-lab/'+name),'Workshop QA asset must not ship: '+name);for(const path of inventory)if(path.endsWith('.js'))assert(!(await readFile(resolve(root,path),'utf8')).includes(name),'Release code references workshop experiment: '+path+' -> '+name);}
const libraryManifest=JSON.parse(await readFile(resolve(root,'library/manifest.json'),'utf8'));
assert.deepEqual(Object.keys(libraryManifest).sort(),['crops','destruction','sfx','walls'],'Only linked Library labs should ship');
const gameplayCrop=JSON.parse(await readFile(resolve(root,'content/models.json'),'utf8')).find(model=>model.source.includes('Cultivos'));
assert(gameplayCrop,'Gameplay crop model missing');
assert.equal(libraryManifest.crops.payloads.find(payload=>payload.id==='assetData')?.url,gameplayCrop.url.replace(/^\//,''),'Library must use gameplay crop GLB');
const cropBridges=JSON.parse(await readFile(resolve(root,'content/crop-bridges.json'),'utf8'));
assert.equal(libraryManifest.crops.payloads.find(payload=>payload.id==='bakedBridges')?.url,cropBridges.bakedAsset.replace(/^\//,''),'Library must use gameplay bridge GLB');
assert.equal(libraryManifest.crops.payloads.find(payload=>payload.id==='bridgeData')?.path,'content/crop-bridges.json','Library must use gameplay bridge metadata');
assert(!inventory.has('library/crops/bridgeData.json'),'Superseded crop bridge metadata must not ship');
for(const name of ['worker-older-male','worker-older-female','worker-young-male','worker-young-female'])
 assert(![...inventory].some(path=>path.startsWith(`library/${name}/`)),`Unused ${name} lab must not ship`);
const spiritManifest=JSON.parse(await readFile('content/manifests/spirit-voices.json','utf8'));
assert.equal(spiritManifest.records.length,54);
for(const record of spiritManifest.records){
 const bytes=await readFile(resolve(root,record.path));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256,'Original Spirit clip changed in package: '+record.path);
}
async function exists(file){return inventory.has(relative(root,file).replaceAll('\\','/'));}
for(const item of manifest.records){
 assert(!await exists(resolve(root,item.source)),'Original GLB duplicated in dist');
 assert.equal(await exists(resolve(root,item.runtime)),!new Set([...UNUSED_WORKER_LAB_MODELS,UNUSED_CROP_LAB_MODEL,...UNUSED_ANIMAL_LAB_MODELS]).has(item.source),'Incorrect runtime GLB inventory: '+item.source);
}
const packagedModels=JSON.parse(await readFile(resolve(root,'content/models.json'),'utf8'));
const packagedAssets=JSON.parse(await readFile(resolve(root,'content/web-assets.json'),'utf8'));
for(const source of [...UNUSED_WORKER_LAB_MODELS,UNUSED_CROP_LAB_MODEL,...UNUSED_ANIMAL_LAB_MODELS]){
 assert(!packagedModels.some(model=>model.url.replace(/^\//,'')===source),'Unused worker lab model listed in runtime catalogue');
 assert(!packagedAssets.records.some(item=>item.source===source),'Unused worker lab model listed in runtime asset map');
}
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
 if(RETIRED_MENU_ASSETS.has(item.source)){assert(!await exists(resolve(root,item.runtime)),'Retired menu image still ships');continue;}
 const output=await readFile(resolve(root,item.runtime));assert.equal(sha(output),item.runtimeSha256,'Runtime image bytes changed');
 if(item.kind==='data-image'){const {compareDataPixels}=await import('./lossless-data-image.mjs');const comparison=await compareDataPixels(await readFile(resolve('public',item.source)),output);assert(comparison.rawPixelsEqual,'Shader data channels changed');assert.equal(comparison.runtimePixelSha256,item.runtimePixelSha256);}
 const info=await sharp(output).metadata();assert.equal(info.format,'webp');assert.equal(info.width,item.width);assert.equal(info.height,item.height);assert.equal(info.hasAlpha,item.hasAlpha);
}
const packagedManifest=JSON.parse(await readFile(resolve(root,'content/web-assets.json'),'utf8'));
for(const item of imageManifest.records)assert.equal(packagedManifest.records.some(r=>r.source===item.source&&r.runtime===item.runtime),!RETIRED_MENU_ASSETS.has(item.source),'Incorrect packaged image alias: '+item.source);
for(const source of RETIRED_MENU_ASSETS)assert(!await exists(resolve(root,source)),'Retired menu source still ships');
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

const retiredBiomes=JSON.parse(await readFile('content/manifests/retired-biome-geometry.json','utf8'));
for(const record of retiredBiomes.records){
 assert(!inventory.has(record.archive.slice(1)),'Retired biome geometry must not ship');
 assert(inventory.has(record.current.slice(1)),'Approved biome geometry missing');
 const pack=JSON.parse(await readFile(resolve(root,`content/biome-${record.biome}.json`),'utf8'));
 assert.equal(pack.binary.url.replace(/^(?:\.\.\/|\.\/|\/)+/,''),record.current.slice(1));
 for(const file of inventory)if(/\.(json|js|mjs|html|css)$/.test(file))assert(!(await readFile(resolve(root,file),'utf8')).includes(record.archive.split('/').at(-1)),'Packaged reference to retired geometry: '+file);
}
assert(files<=1000,'itch.io package exceeds 1000 files');
assert(bytes<=500_000_000,'itch.io package exceeds 500 MB');
console.log(`PASS: ${files} files / ${bytes} bytes, ${links} relative links, ${packagedAssets.records.filter(item=>item.runtime.endsWith('.glb')).length} runtime GLBs, no unused worker labs, original GLBs, demo village or superseded ground duplicates`);
