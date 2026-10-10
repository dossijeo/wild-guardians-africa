import {readFileSync,readdirSync,statSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {resolve,extname,relative,sep} from 'node:path';
import {runtimeGeometryManifest,cropRuntimeDescriptor} from '../src/rendering/crop-runtime.js';
export function publicText(text,path,manifest){
  for(const record of cropRuntimeDescriptor.replaced){const collection=cropRuntimeDescriptor.collections[record.kind];text=text.replaceAll('/'+record.source,collection).replaceAll('/'+record.runtime,collection);}
  for(const item of manifest.records)text=text.replaceAll('/'+item.source,'/'+item.runtime);
  if(path==='library.html')text=text.replace("const get=", "import {decodeWebGlb} from './runtime/glb-legacy.js';\nconst get=").replace('return response[type]();',"const result=await response[type]();return type==='arrayBuffer'&&url.endsWith('.glb')?decodeWebGlb(result):result;");
  if(path==='menu/native.js')text=text.replace('return await (await fetch(el.textContent.trim())).arrayBuffer();','return await window.decodeWebGlb(await (await fetch(el.textContent.trim())).arrayBuffer());');
  if(path.startsWith('library/worker-'))text=text.replaceAll('j.textures[slot.index].source','(j.textures[slot.index].extensions?.EXT_texture_webp?.source??j.textures[slot.index].source)');
  if(path==='library/destruction/script-5.js')text=text.replaceAll('json.textures[index].source','(json.textures[index].extensions?.EXT_texture_webp?.source??json.textures[index].source)');
  if(path==='menu/index.html')text=text.replace('<script src="/menu/native.js"></script>',`<script type="module">import {decodeWebGlb} from '/runtime/glb-legacy.js';window.decodeWebGlb=decodeWebGlb;const script=document.createElement('script');script.src='/menu/native.js';document.body.append(script);</script>`);
  // JSON and injected library scripts resolve from the game/library document.
  // Stylesheets and nested menu/selector pages resolve from their own directory.
  const prefix=path.endsWith('.css')?'../'.repeat(path.split('/').length-1):path.startsWith('menu/')||path.startsWith('selector/')?'../':'';
  return text.replace(/(?<![.\w/:+-])\/(assets|content|library|menu|selector|runtime|i18n)(?=\/|\.html)/g,prefix+'$1');
}
export function webPackagePlugin(){
  let config;const manifest=()=>{const geometry=runtimeGeometryManifest(JSON.parse(readFileSync(resolve(config.root,'content/manifests/web-assets.json'),'utf8')));const audio=JSON.parse(readFileSync(resolve(config.root,'content/manifests/audio-runtime.json'),'utf8'));const sfx=JSON.parse(readFileSync(resolve(config.root,'content/manifests/sfx-runtime.json'),'utf8'));const images=JSON.parse(readFileSync(resolve(config.root,'content/manifests/image-runtime.json'),'utf8'));return {...geometry,audioCodec:audio.codec,records:[...geometry.records,...audio.records,...sfx.records,...images.records]};};
  return {name:'itch-web-package',configResolved(value){config=value;},
    configureServer(server){server.middlewares.use((req,res,next)=>{try{const path=decodeURIComponent((req.url??'').split('?')[0]).replace(/^\//,'').replace(config.base.replace(/^\//,''),'');const file=resolve(config.root,'public',path);if(!file.startsWith(resolve(config.root,'public')+sep)||!['.html','.js','.json','.css'].includes(extname(file)))return next();const text=publicText(readFileSync(file,'utf8'),path,manifest());res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css'})[extname(file)]);res.end(text);}catch{next();}});},
    closeBundle(){const dist=resolve(config.root,config.build.outDir),mapping=manifest();
      const originals=readdirSync(resolve(config.root,'public/assets')).filter(name=>name.endsWith('.glb')).sort(),covered=JSON.parse(readFileSync(resolve(config.root,'content/manifests/web-assets.json'),'utf8')).records.filter(item=>item.source.endsWith('.glb')).map(item=>item.source.slice('assets/'.length)).sort();
      if(JSON.stringify(originals)!==JSON.stringify(covered))throw Error('GLB inventory changed: run npm run assets:compress before building');
      function walk(dir){for(const name of readdirSync(dir)){const file=resolve(dir,name);if(statSync(file).isDirectory())walk(file);else if(['.html','.js','.json','.css'].includes(extname(file))&&!relative(dist,file).replaceAll('\\','/').startsWith('assets/')){const path=relative(dist,file).replaceAll('\\','/');writeFileSync(file,publicText(readFileSync(file,'utf8'),path,mapping));}}}
      walk(dist);for(const item of mapping.records)if(!item.partition)rmSync(resolve(dist,item.source));
      // Preserve the historical authored/compressed files in source, not in
      // the runtime archive. The replacement manifest lists actual four GLBs.
      for(const item of cropRuntimeDescriptor.replaced)for(const file of [item.source,item.runtime])rmSync(resolve(dist,file),{force:true});
      writeFileSync(resolve(dist,'content/web-assets.json'),JSON.stringify(mapping,null,2)+'\n');
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
