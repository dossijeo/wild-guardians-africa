import {readFileSync,readdirSync,statSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {resolve,extname,relative,sep} from 'node:path';
// Original GLBs used only by the four unlinked worker reference labs. Gameplay
// loads the separate optimized worker rigs listed in content/worker-actions.json.
export const UNUSED_WORKER_LAB_MODELS=new Set([
  'assets/b27ce08a5f860912783d5978cec8a012b28d7a55e2c7a69cc992f91f8bbd5a76.glb',
  'assets/9cb17849416e2d2578eb5806c4874fc496fdf9a1aa421d3a10fe3a346933674e.glb',
  'assets/a748ca0cea0d4d0d4abd95071577a8457e63f22433e618be77934c079f4cf89c.glb',
  'assets/db01314e4e0a03f4e1aaa31e8207cee85a42294edffb003633282bb574ef28cd.glb'
]);
// Superseded crop lab payload; both gameplay and the linked Library lab use
// the repaired 40-state crop GLB from crops-v4.json.
export const UNUSED_CROP_LAB_MODEL='assets/be4bb7e7eab2149516c1ecc0c364d77c4a62f116c4847cf0ef6f3308dc6180ef.glb';
// Retained as retargeting provenance, superseded by repaired replacements.
export const UNUSED_ANIMAL_LAB_MODELS=new Set(['assets/b396fba7b2c500770a3770222fc6a3b5b9a17fce66933ad53d569ae349affc82.glb','assets/5ac817bcc5a8147c69f0e9876d2e37a94228272b14b85be1d1ecbfd6e2d0527b.glb','assets/88552fdb555a88e55f8e392bfe381cbad0c6af861e993213a4ebc42cd0996d2b.glb','assets/cb7a23479fb9210b6cda1ab13cbddd85b3ebce10cad863f1dd8ae1d9d66e4869.glb','assets/7de8ad72063cfeeb74f5d334069b77a3ac5c06c39a6c674a75b21ff51a210c25.glb']);
const UNUSED_LAB_MODELS=new Set([...UNUSED_WORKER_LAB_MODELS,UNUSED_CROP_LAB_MODEL,...UNUSED_ANIMAL_LAB_MODELS]);
// The layered sanctuary no longer samples the photographic background, sky or
// relief mask. Retain authoring originals, but exclude both original and mapped
// runtime encodings from the two release distributions.
export const RETIRED_MENU_ASSETS=new Set([
 'assets/edf8ac071ae8c889ef6bd95014334535b1144fdf7278d8a7af72415c38e42e90.jpg',
 'assets/a1458a9c5a3eee9dc6a0dde33da7790a12ed8a6514039305ab0006cda5357d5d.webp',
 'assets/c082908e08a10d89823c6d12be53e56cd96b67013b0845993f21aad264351926.png'
]);
export const QA_ONLY_GROUND_FILES=['grass-arched.glb','grass-broad.glb','grass-cushion.glb','grass-dense.glb','grass-island.glb','grass-mixed.glb','savanna-ph-compact.glb','savanna-ph-structured.glb','savanna-polyhaven-crossed.glb','savanna-polyhaven-dry-atlas.png','savanna-polyhaven-grass-card.png','grass-fine.glb','grass-fine-lite.glb','kenney-dry-grass.glb','grass-clumps.glb','grass-lod.glb'];
export const QA_ONLY_VILLAGE_FILES=[
 'mapungubwe-shared-art.bin','mapungubwe-shared-art.webp',
 'mapungubwe-color-detail.webp','mapungubwe-normal-enhanced.webp',
 'musgum-color-detail.webp','musgum-normal-enhanced.webp',
 'mapu-0-art.bin','mapu-0-finish.bin','mapu-0-repacked.bin','mapu-0-surface.bin',
 'mapu-0-color-art.webp','mapu-0-color-details.webp','mapu-0-color-finish.webp',
 'mapu-0-color-repacked.webp','mapu-0-color-surface.webp'
];
// Assets referenced only by tools/experiments QA routes, never the shipped app.
// Keep originals in public for reproducible development experiments.
export const QA_ONLY_VISUAL_DIRECTORIES=[
 'mangrove-leaf-cover-20261021','mangrove-leaf-folded-20261022','mangrove-leaf-varied-20261021',
 'ground-fiber-bake','ground-pom','moss-composite','fern-composite-lod-20261023',
 'holly-fern-cards-20261023','mangrove-leaf-cards-20261023',
 'continuous-grass-cards','continuous-grass-flow',
 'tree-candidates-20261026','tree-candidates-20261026-lod'
];
export function publicText(text,path,manifest){
  if(path==='content/models.json'){
    const models=JSON.parse(text);
    if(Array.isArray(models))text=JSON.stringify(models.filter(model=>!UNUSED_LAB_MODELS.has(model.url.replace(/^\//,''))).map(model=>model.facialEdit?.editable?.startsWith('content/source/')?{...model,facialEdit:{...model.facialEdit,editable:'repository:'+model.facialEdit.editable}}:model));
  }
  for(const item of manifest.records)text=text.replaceAll('/'+item.source,'/'+item.runtime);
  if(path==='library.html')text=text.replace("const get=", "import {decodeWebGlb} from './runtime/glb-legacy.js';\nconst get=").replace('return response[type]();',"const result=await response[type]();return type==='arrayBuffer'&&url.endsWith('.glb')?decodeWebGlb(result):result;");
  if(path==='menu/native.js')text=text.replace('return await (await fetch(el.textContent.trim())).arrayBuffer();','return await window.decodeWebGlb(await (await fetch(el.textContent.trim())).arrayBuffer());');
  if(path==='library/destruction/script-5.js')text=text.replaceAll('json.textures[index].source','(json.textures[index].extensions?.EXT_texture_webp?.source??json.textures[index].source)');
  if(path==='menu/index.html')text=text.replace('<script src="/menu/native.js"></script>',`<script type="module">import {decodeWebGlb} from '/runtime/glb-legacy.js';window.decodeWebGlb=decodeWebGlb;const script=document.createElement('script');script.src='/menu/native.js';document.body.append(script);</script>`);
  // JSON and injected library scripts resolve from the game/library document.
  // Stylesheets and nested menu/selector pages resolve from their own directory.
  const prefix=path.endsWith('.css')?'../'.repeat(path.split('/').length-1):path.startsWith('menu/')||path.startsWith('selector/')?'../':'';
  return text.replace(/(?<![.\w/:+-])\/(assets|content|library|menu|selector|runtime|i18n)(?=\/|\.html)/g,prefix+'$1');
}
export function webPackagePlugin(){
  let config;const manifest=()=>{const geometry=JSON.parse(readFileSync(resolve(config.root,'content/manifests/web-assets.json'),'utf8'));const audio=JSON.parse(readFileSync(resolve(config.root,'content/manifests/audio-runtime.json'),'utf8'));const sfx=JSON.parse(readFileSync(resolve(config.root,'content/manifests/sfx-runtime.json'),'utf8'));const images=JSON.parse(readFileSync(resolve(config.root,'content/manifests/image-runtime.json'),'utf8'));return {...geometry,audioCodec:audio.codec,records:[...geometry.records,...audio.records,...sfx.records,...images.records]};};
  return {name:'itch-web-package',configResolved(value){config=value;},
    configureServer(server){server.middlewares.use((req,res,next)=>{try{const path=decodeURIComponent((req.url??'').split('?')[0]).replace(/^\//,'').replace(config.base.replace(/^\//,''),'');const file=resolve(config.root,'public',path);if(!file.startsWith(resolve(config.root,'public')+sep)||!['.html','.js','.json','.css'].includes(extname(file)))return next();const text=publicText(readFileSync(file,'utf8'),path,manifest());res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css'})[extname(file)]);res.end(text);}catch{next();}});},
    closeBundle(){const dist=resolve(config.root,config.build.outDir),mapping=manifest();
      const originals=readdirSync(resolve(config.root,'public/assets')).filter(name=>name.endsWith('.glb')).sort(),covered=mapping.records.filter(item=>item.source.endsWith('.glb')).map(item=>item.source.slice('assets/'.length)).sort();
      if(JSON.stringify(originals)!==JSON.stringify(covered))throw Error('GLB inventory changed: run npm run assets:compress before building');
      function walk(dir){for(const name of readdirSync(dir)){const file=resolve(dir,name);if(statSync(file).isDirectory())walk(file);else if(['.html','.js','.json','.css'].includes(extname(file))&&!relative(dist,file).replaceAll('\\','/').startsWith('assets/')){const path=relative(dist,file).replaceAll('\\','/');writeFileSync(file,publicText(readFileSync(file,'utf8'),path,mapping));}}}
      // Offline authoring keeps separate records for all voice manifests. Release fetches one bank.
      const cueDir=resolve(dist,'content/guardian/lipsync');
      if(existsSync(cueDir)){
        const records={};
        for(const name of readdirSync(cueDir).filter(n=>n.endsWith('.json')&&n!=='bank.json').sort()){
          const file=resolve(cueDir,name);if(!file.startsWith(cueDir+sep))throw Error('Cue path escapes package');
          const record=JSON.parse(readFileSync(file,'utf8'));if(record.id!==name.slice(0,-5))throw Error('Cue identity mismatch');
          records[record.id]=record;rmSync(file);
        }
        writeFileSync(resolve(cueDir,'bank.json'),JSON.stringify({version:1,records}));
        // This selector belongs only to development QA pages, not the game.
        rmSync(resolve(dist,'content/guardian/voices.json'),{force:true});
      }
      walk(dist);for(const item of mapping.records)rmSync(resolve(dist,item.source));
      for(const item of mapping.records.filter(item=>UNUSED_LAB_MODELS.has(item.source))){
        const target=resolve(dist,item.runtime);
        if(!target.startsWith(resolve(dist,'assets')+sep))throw Error('Unused lab model path escapes package');
        rmSync(target,{force:true});
      }
      for(const name of QA_ONLY_VISUAL_DIRECTORIES){
        const parent=resolve(dist,'assets/visual-lab'),target=resolve(parent,name);
        if(!target.startsWith(parent+sep))throw Error('QA archive path escapes visual assets');
        rmSync(target,{recursive:true,force:true});
      }
      for(const name of [...QA_ONLY_VILLAGE_FILES,...QA_ONLY_GROUND_FILES]){
        const parent=resolve(dist,'assets/visual-lab'),target=resolve(parent,name);
        if(!target.startsWith(parent+sep))throw Error('Village archive path escapes package');
        rmSync(target,{force:true});
      }
      for(const source of RETIRED_MENU_ASSETS){
        for(const path of [source,...mapping.records.filter(item=>item.source===source).map(item=>item.runtime)]){
          const target=resolve(dist,path);
          if(!target.startsWith(resolve(dist,'assets')+sep))throw Error('Retired menu path escapes package');
          rmSync(target,{force:true});
        }
      }
      writeFileSync(resolve(dist,'content/web-assets.json'),JSON.stringify({...mapping,records:mapping.records.filter(item=>!UNUSED_LAB_MODELS.has(item.source)&&!RETIRED_MENU_ASSETS.has(item.source))},null,2)+'\n');
      // The four worker reference labs are retained in source but have no menu entry.
      // Exclude them from both the itch.io ZIP and the Tauri frontend bundle.
      for(const name of ['worker-older-male','worker-older-female','worker-young-male','worker-young-female']){
        const target=resolve(dist,'library',name);
        if(!target.startsWith(resolve(dist,'library')+sep))throw Error('Worker lab path escapes package');
        rmSync(target,{recursive:true,force:true});
      }
      // Keep demo village and superseded combined ground maps in the source
      // archive. Ship native cultures and the three final baked maps only.
      for(const archive of ['biome-lab-update.json','mangrove-ground-bake.json','retired-biome-geometry.json']){
        const manifestFile=resolve(config.root,'content/manifests',archive);
        if(existsSync(manifestFile))for(const url of JSON.parse(readFileSync(manifestFile,'utf8')).archiveOnly){
          if(!/^\/assets\/[a-f0-9]{64}\.(?:bin|png|jpg|webp)$/.test(url))throw Error('Invalid source archive path');
          const target=resolve(dist,url.slice(1));
          if(!target.startsWith(resolve(dist,'assets')+sep))throw Error('Source archive path escapes package');
          rmSync(target,{force:true});
        }
      }
    }
  };
}
