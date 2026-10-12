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
export function publicText(text,path,manifest){
  if(path==='content/models.json'){
    const models=JSON.parse(text);
    if(Array.isArray(models))text=JSON.stringify(models.filter(model=>!UNUSED_WORKER_LAB_MODELS.has(model.url.replace(/^\//,''))));
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
      walk(dist);for(const item of mapping.records)rmSync(resolve(dist,item.source));
      for(const item of mapping.records.filter(item=>UNUSED_WORKER_LAB_MODELS.has(item.source))){
        const target=resolve(dist,item.runtime);
        if(!target.startsWith(resolve(dist,'assets')+sep))throw Error('Worker model path escapes package');
        rmSync(target,{force:true});
      }
      writeFileSync(resolve(dist,'content/web-assets.json'),JSON.stringify({...mapping,records:mapping.records.filter(item=>!UNUSED_WORKER_LAB_MODELS.has(item.source))},null,2)+'\n');
      // The four worker reference labs are retained in source but have no menu entry.
      // Exclude them from both the itch.io ZIP and the Tauri frontend bundle.
      for(const name of ['worker-older-male','worker-older-female','worker-young-male','worker-young-female']){
        const target=resolve(dist,'library',name);
        if(!target.startsWith(resolve(dist,'library')+sep))throw Error('Worker lab path escapes package');
        rmSync(target,{recursive:true,force:true});
      }
      // Keep demo village and superseded combined ground maps in the source
      // archive. Ship native cultures and the three final baked maps only.
      for(const archive of ['biome-lab-update.json','mangrove-ground-bake.json']){
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
