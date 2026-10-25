import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
const root=resolve('dist'),prefix='/nested/itch/game/',requests=[],errors=[],workers=[];
const isolation=process.env.WG_PACKAGE_UI_ISOLATION!=='0';
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.glb':'model/gltf-binary','.ogg':'audio/ogg','.opus':'audio/ogg','.mp3':'audio/mpeg','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
 try{
  if(!url.pathname.startsWith(prefix))throw Error('Outside package prefix');
  const path=resolve(root,decodeURIComponent(url.pathname.slice(prefix.length))||'index.html');
  if(!path.startsWith(root+sep))throw Error('Outside package');
  const bytes=await readFile(path);
  res.writeHead(200,{'Content-Type':types[extname(path)]??'application/octet-stream',...(isolation?{'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'}:{})});res.end(bytes);
 }catch(error){requests.push({url:url.pathname,status:404,message:error.message});res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720}});
page.on('worker',worker=>workers.push(worker.url()));
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const report=process.env.WG_PACKAGE_UI_REPORT??'docs/qa/production-integration-20261025/package-ui.json';
let result={};
try{
 const url=`http://127.0.0.1:${server.address().port}${prefix}`;
 await page.goto(url,{timeout:90000});await page.waitForSelector('#native-menu',{timeout:60000});
 const menu=page.frameLocator('#native-menu');
 await menu.getByText('JUEGO NUEVO',{exact:false}).first().waitFor({timeout:60000});
 result={url,isolated:await page.evaluate(()=>crossOriginIsolated),menuButtons:await menu.locator('button,[role=button]').allTextContents(),menuText:(await menu.locator('body').innerText()).slice(-3000)};
 if(process.env.WG_PACKAGE_UI_START==='1'){
  await menu.getByRole('button',{name:'Juego nuevo',exact:true}).click();
  // The selector is rendered during the camera journey but its parent stays inert.
  await menu.locator('#panelstage:not([inert])').waitFor({state:'visible',timeout:60000});
  const selector=menu.frameLocator('iframe.production-section');
  const biome=process.env.WG_PACKAGE_UI_BIOME??'manglares';
  await selector.locator('[data-biome="'+biome+'"]').click({timeout:60000});
  await selector.locator('#confirmButton').click();
  await selector.locator('[data-culture="mapungubwe"]').click();
  await selector.locator('#confirmButton').click();
  await page.waitForSelector('#stage[aria-busy="true"]',{timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#stage')?.getAttribute('aria-busy')==='false'||document.body.innerText.includes('No se ha podido preparar tu mundo.'),null,{timeout:180000});
  if(await page.locator('#stage').getAttribute('aria-busy')!=='false')throw Error('World loading failed: '+(await page.locator('body').innerText()).slice(-1000));
  result.gameText=(await page.locator('body').innerText()).slice(-2500);
  result.workers=workers;result.biome=biome;
  if(process.env.WG_PACKAGE_UI_LIFECYCLE==='1'){
   await page.locator('#menuButton').click();
   await page.locator('#save').click();
   await page.locator('#exit').click();
   await page.waitForSelector('#native-menu',{timeout:60000});
   await menu.getByRole('button',{name:'Continuar',exact:true}).click({timeout:60000});
   const saved=menu.locator('[data-production-save]').first();
   await saved.waitFor({state:'visible',timeout:60000});
   result.savedSlot=await saved.getAttribute('data-production-save');
   await saved.click();
   await page.waitForSelector('#stage[aria-busy="true"]',{timeout:60000});
   await page.waitForFunction(()=>document.querySelector('#stage')?.getAttribute('aria-busy')==='false',null,{timeout:180000});
   result.reloadedGameText=(await page.locator('body').innerText()).slice(-2500);
   result.lifecycle='save, exit to menu, continue saved slot, HUD restored';
  }

 }
 await page.screenshot({path:report.replace(/\.json$/,'.png')});
 console.log(JSON.stringify(result));
}catch(e){result.failure=String(e);process.exitCode=1;console.error(e);await page.screenshot({path:report.replace(/\.json$/,'-failure.png')}).catch(()=>{});}
finally{await writeFile(report,JSON.stringify({scope:'Built package at nested path, no URL flags, route interception or source injection.',result,errors,requests,workers},null,2)+'\n');await browser.close();await new Promise(resolve=>server.close(resolve));}
