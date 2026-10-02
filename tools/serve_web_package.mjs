import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {build} from 'vite';
import {webPackagePlugin} from './web-package.mjs';
await build({configFile:false,base:'./',plugins:[webPackagePlugin()],build:{target:'esnext',outDir:'.cache/web-assets-qa',rollupOptions:{input:{assets:resolve('tests/browser/web-assets.html'),vfx:resolve('tests/browser/vfx.html'),work:resolve('tests/browser/work-vfx.html')}}}});
createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),prefix=url.pathname.startsWith('/nested/itch/game/')?'/nested/itch/game/':url.pathname.startsWith('/qa/')?'/qa/':null;if(!prefix){res.writeHead(404);res.end('No root fallback');return;}
 const dir=prefix==='/qa/'?resolve('.cache/web-assets-qa'):resolve('dist'),file=resolve(dir,decodeURIComponent(url.pathname.slice(prefix.length))||'index.html');if(!file.startsWith(dir))throw Error('Outside root');
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.glb':'model/gltf-binary','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.mp3':'audio/mpeg'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));
 }catch{res.writeHead(404);res.end('Not found');}}).listen(4175,'127.0.0.1',()=>console.log('Nested game: http://127.0.0.1:4175/nested/itch/game/\n20-model fixture: http://127.0.0.1:4175/qa/tests/browser/web-assets.html\nVFX: http://127.0.0.1:4175/qa/tests/browser/vfx.html\nWork: http://127.0.0.1:4175/qa/tests/browser/work-vfx.html'));
