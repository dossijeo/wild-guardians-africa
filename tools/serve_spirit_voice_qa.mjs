import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {build} from 'vite';
import {webPackagePlugin} from './web-package.mjs';
const port=Number(process.env.WG_SPIRIT_QA_PORT??5196),root=resolve('.cache/spirit-voice-qa');
await build({configFile:false,base:'./',plugins:[webPackagePlugin()],build:{target:'esnext',outDir:root,rollupOptions:{input:resolve('tests/browser/spirit-voices-event-cards.html')}}});
createServer(async(req,res)=>{try{
 const prefix='/nested/itch/spirit/',path=new URL(req.url,'http://localhost').pathname;
 if(!path.startsWith(prefix))throw Error('No root fallback');
 const file=resolve(root,decodeURIComponent(path.slice(prefix.length)));if(!file.startsWith(root+sep))throw Error('Outside QA root');
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.ogg':'audio/ogg','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'})[extname(file)]??'application/octet-stream');res.end(await readFile(file));
}catch{res.writeHead(404);res.end('Not found');}}).listen(port,'127.0.0.1',()=>console.log(`http://127.0.0.1:${port}/nested/itch/spirit/tests/browser/spirit-voices-event-cards.html`));
