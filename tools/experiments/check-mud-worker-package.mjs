import {createServer} from 'node:http';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const name=(await readdir('dist/assets')).filter(n=>/^mangrove-mud-edge-worker-.*\.js$/.test(n));if(name.length!==1)throw Error('Expected one emitted mud worker');
const bytes=await readFile('dist/assets/'+name[0]),prefix='/nested/game/';
const child=createServer((req,res)=>{
 res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');res.setHeader('Cross-Origin-Resource-Policy','cross-origin');
 if(req.url===prefix){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Packaged mud worker QA</title>');}
 else if(req.url===prefix+'assets/'+name[0]){res.setHeader('Content-Type','text/javascript');res.end(bytes);}
 else{res.writeHead(404);res.end();}
});
await new Promise(r=>child.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+child.address().port,url=origin+prefix;
const parent=createServer((req,res)=>{res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','require-corp');res.setHeader('Permissions-Policy',`cross-origin-isolated=(self "${origin}")`);res.setHeader('Content-Type','text/html');res.end(`<!doctype html><iframe allow="cross-origin-isolated" src="${url}"></iframe>`);});
await new Promise(r=>parent.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'chrome',headless:true});
const probe=frame=>frame.evaluate(async name=>{
 const worker=new Worker(new URL('./assets/'+name,location.href),{type:'module'});
 const attr=values=>({array:new Float32Array(values),count:values.length/3,stride:3,offset:0});
 const input={gp:attr([0,0,0,1,0,0,0,0,1,1,0,1]),gc:attr([0,0,0,1,0,0,0,1,0,1,1,0]),gn:attr([0,1,0,1,1,0,0,1,1,1,1,1]),p:attr([.25,0,.25,.75,0,.75]),origin:[0,0],outlines:[[[0,0],[1,0],[1,1],[0,1]]]};
 let timer;try{const response=await new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error('Packaged worker timeout')),10000);worker.onerror=e=>reject(Error(e.message));worker.onmessage=e=>resolve(e.data);worker.postMessage({id:7,input});});if(response.error)throw Error(response.error);if(response.id!==7||JSON.stringify([...response.result.colors])!==JSON.stringify([.25,.25,0,.75,.75,0])||JSON.stringify([...response.result.normals])!==JSON.stringify([.25,1,.25,.75,1,.75])||JSON.stringify([...response.result.edges])!==JSON.stringify([.25,.25]))throw Error('Packaged worker output mismatch');return {isolated:crossOriginIsolated,id:response.id,colors:[...response.result.colors],normals:[...response.result.normals],edges:[...response.result.edges],inputStillAttached:input.gp.array.byteLength===48};}finally{clearTimeout(timer);worker.terminate();}
},name[0]);
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);const nested=await probe(page);
 await page.goto('http://127.0.0.1:'+parent.address().port+'/');const frame=page.frames().find(f=>f.url()===url)??await page.waitForEvent('framenavigated',{predicate:f=>f.url()===url});await frame.waitForLoadState('load');const crossOriginIframe=await probe(frame);
 if(errors.length)throw Error(JSON.stringify(errors));const report={scope:'Actual emitted Vite worker in Chrome, nested URL and cross-origin iframe. Protocol/output/transfer smoke test only; not deployed itch.io, Tauri/WebView2 or full game validation.',artifact:{name:name[0],bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')},nested,crossOriginIframe,errors};await writeFile('docs/qa/wild-engine-pthreads/scheduler-mud-worker-package.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await browser.close();await Promise.all([child,parent].map(s=>new Promise(r=>s.close(r))));}
