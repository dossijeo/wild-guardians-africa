import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {build} from 'vite';
import {webPackagePlugin} from './web-package.mjs';
const port=Number(process.env.WG_QA_PORT??4175);
await build({configFile:false,base:'./',plugins:[webPackagePlugin()],build:{target:'esnext',outDir:'.cache/web-assets-qa',rollupOptions:{input:{sfx:resolve('tests/browser/sfx-runtime.html'),audio:resolve('tests/browser/audio-runtime.html'),assets:resolve('tests/browser/web-assets.html'),vfx:resolve('tests/browser/vfx.html'),work:resolve('tests/browser/work-vfx.html')}}}});
createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),prefix=url.pathname.startsWith('/nested/itch/game/')?'/nested/itch/game/':url.pathname.startsWith('/nested/itch/audio-qa/')?'/nested/itch/audio-qa/':url.pathname.startsWith('/qa/')?'/qa/':null;if(!prefix){res.writeHead(404);res.end('No root fallback');return;}
 const dir=prefix!=='/nested/itch/game/'?resolve('.cache/web-assets-qa'):resolve('dist'),file=resolve(dir,decodeURIComponent(url.pathname.slice(prefix.length))||'index.html');if(!file.startsWith(dir))throw Error('Outside root');
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.glb':'model/gltf-binary','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.mp3':'audio/mpeg','.opus':'audio/ogg'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));
 }catch{res.writeHead(404);res.end('Not found');}}).listen(port,'127.0.0.1',()=>console.log(`Nested game: http://127.0.0.1:${port}/nested/itch/game/\nAudio: http://127.0.0.1:${port}/nested/itch/audio-qa/tests/browser/audio-runtime.html\n20-model fixture: http://127.0.0.1:${port}/qa/tests/browser/web-assets.html\nVFX: http://127.0.0.1:${port}/qa/tests/browser/vfx.html\nWork: http://127.0.0.1:${port}/qa/tests/browser/work-vfx.html`));
