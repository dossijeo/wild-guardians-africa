import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {chromium} from 'playwright';
const root=resolve(process.env.WG_PACKAGE_UI_ROOT??'dist'),prefix='/nested/itch/game/',requests=[],errors=[],workers=[],closedWorkers=[],runtimeOverrides={};
const isolation=process.env.WG_PACKAGE_UI_ISOLATION!=='0';
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.json':'application/json','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.glb':'model/gltf-binary','.ogg':'audio/ogg','.opus':'audio/ogg','.mp3':'audio/mpeg','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
 try{
  if(!url.pathname.startsWith(prefix))throw Error('Outside package prefix');
  const path=resolve(root,decodeURIComponent(url.pathname.slice(prefix.length))||'index.html');
  if(!path.startsWith(root+sep))throw Error('Outside package');
  const runtimeName=url.pathname.split('/').at(-1);
  const override=process.env.WG_PACKAGE_UI_RUNTIME_DIR&&url.pathname.startsWith(prefix+'wild-engine/')&&['spatial-threaded.mjs','spatial-threaded.wasm'].includes(runtimeName);
  const standalone=process.env.WG_PACKAGE_UI_STANDALONE_WASM&&url.pathname.startsWith(prefix+'assets/')&&/^spatial-savanna-[\w-]+\.wasm$/.test(runtimeName);
  const bytes=await readFile(standalone?resolve(process.env.WG_PACKAGE_UI_STANDALONE_WASM):override?resolve(process.env.WG_PACKAGE_UI_RUNTIME_DIR,runtimeName):path);
  if(override||standalone)runtimeOverrides[runtimeName]={sha256:createHash('sha256').update(bytes).digest('hex'),loads:(runtimeOverrides[runtimeName]?.loads??0)+1};
  res.writeHead(200,{'Content-Type':types[extname(path)]??'application/octet-stream',...(isolation?{'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'require-corp'}:{})});res.end(bytes);
 }catch(error){requests.push({url:url.pathname,status:404,message:error.message});res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({channel:'chrome',headless:true,...(process.env.WG_PACKAGE_UI_SOFTWARE==='1'?{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{})});
const page=await browser.newPage({viewport:{width:1280,height:720},...(process.env.WG_PACKAGE_UI_VIDEO==='1'?{recordVideo:{dir:'.codex-qa/package-flow-video',size:{width:1280,height:720}}}:{})});
page.on('worker',worker=>{workers.push(worker.url());worker.on('close',()=>closedWorkers.push(worker.url()));});
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const report=process.env.WG_PACKAGE_UI_REPORT??'docs/qa/production-integration-20261025/package-ui.json';
let result={};
if(process.env.WG_PACKAGE_UI_TRACE==='1')await page.addInitScript(()=>{globalThis.__desktopSmokeStarted=true;});
if(process.env.WG_PACKAGE_UI_QUALITY)await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,sfx:0,music:0})),process.env.WG_PACKAGE_UI_QUALITY);
try{
 const url=`http://127.0.0.1:${server.address().port}${prefix}`;
 await page.goto(url,{timeout:90000});await page.waitForSelector('#native-menu',{timeout:60000});
 const menu=page.frameLocator('#native-menu');
 await menu.getByText('JUEGO NUEVO',{exact:false}).first().waitFor({timeout:60000});
 await menu.locator('#loading').waitFor({state:'hidden',timeout:60000});
 result={url,isolated:await page.evaluate(()=>crossOriginIsolated),menuButtons:await menu.locator('button,[role=button]').allTextContents(),menuText:(await menu.locator('body').innerText()).slice(-3000)};
 if(process.env.WG_PACKAGE_UI_LIBRARY==='1'){
  await menu.getByRole('button',{name:'Biblioteca',exact:true}).click();
  result.library=[];
  for(const lab of ['crops','walls','destruction','sfx']){
   await menu.locator('[data-production-lab='+lab+']').click();
   const frame=menu.frameLocator('.production-lab-frame');await frame.locator('canvas').first().waitFor({timeout:60000});
   const checks={lab};
   if(lab==='crops'){await frame.locator('.crop-card').nth(1).click();await frame.locator('#demoBtn').click();checks.plants=await frame.locator('#countPlants').textContent();if(checks.plants!=='8')throw Error('Crop demo did not plant');}
   if(lab==='walls'){await frame.locator('[data-material=piedra]').click();checks.material=await frame.locator('[data-material=piedra]').getAttribute('aria-checked');if(checks.material!=='true')throw Error('Wall material did not change');}
   if(lab==='destruction'){await frame.locator('[data-stage="50"]').click({timeout:180000});await page.waitForTimeout(500);checks.damage=await frame.locator('#damageValue').textContent();if(checks.damage!=='50')throw Error('Damage demo failed');await frame.locator('#reset').click();}
   if(lab==='sfx'){await frame.locator('.item').first().waitFor({state:'visible',timeout:60000});await frame.locator('#search').fill('004');await frame.locator('.item').nth(1).waitFor({state:'detached',timeout:60000});await frame.locator('.item .num').filter({hasText:'004'}).waitFor({state:'visible',timeout:60000});checks.matches=await frame.locator('.item').count();if(!checks.matches)throw Error('Sound catalogue empty');await frame.locator('[data-action=play]').first().click();await page.waitForTimeout(700);checks.title=await frame.locator('#nowTitle').textContent();await frame.locator('#stop').click();}
   await page.screenshot({path:report.replace(/\.json$/,'-library-'+lab+'.png')});result.library.push(checks);await menu.locator('.production-lab-header button').first().click();
  }
 }
 if(process.env.WG_PACKAGE_UI_LIBRARY==='1')await menu.locator('#panel [data-back]').click();
 if(process.env.WG_PACKAGE_UI_OPTIONS==='1'){
  await menu.getByRole('button',{name:'Opciones',exact:true}).click();
  await menu.locator('#panelstage:not([inert])').waitFor({state:'visible',timeout:60000});
  result.options={quality:await menu.locator('#production-quality').inputValue(),resolution:await menu.locator('#production-resolution').inputValue()};
  await page.screenshot({path:report.replace(/\.json$/,'-options.png')});
  await menu.locator('#panel [data-back]').click();
 }
 if(process.env.WG_PACKAGE_UI_FIXTURE){
  const fixture=JSON.parse(await readFile(process.env.WG_PACKAGE_UI_FIXTURE,'utf8'));
  // Saved-world reproduction only: same legacy storage ingress as native smoke.
  await page.evaluate(f=>localStorage.setItem('wild-guardians:slot:'+f.slotId,f.snapshot),fixture);
  await menu.getByRole('button',{name:'Continuar',exact:true}).click();
  await menu.locator('[data-production-save="'+fixture.slotId+'"]').click({timeout:60000});
  const started=Date.now();
  await page.waitForSelector('#stage[aria-busy="true"]',{timeout:60000});
  await page.waitForFunction(()=>document.querySelector('#stage')?.getAttribute('aria-busy')==='false'||document.body.innerText.includes('No se ha podido preparar tu mundo.'),null,{timeout:90000});
  if(await page.locator('#stage').getAttribute('aria-busy')!=='false')throw Error('Saved world loading failed: '+(await page.locator('body').innerText()).slice(-1000));
  result.fixtureLoadMs=Date.now()-started;result.fixture=fixture.scope;
  result.gameText=(await page.locator('body').innerText()).slice(-2500);
 }
 if(process.env.WG_PACKAGE_UI_START==='1'){
  const biome=process.env.WG_PACKAGE_UI_BIOME??'manglares';
  const cancelFirst=process.env.WG_PACKAGE_UI_CANCEL==='1';
  for(let attempt=0;attempt<(cancelFirst?2:1);attempt++){
  await menu.getByRole('button',{name:'Juego nuevo',exact:true}).click();
  // The selector is rendered during the camera journey but its parent stays inert.
  await menu.locator('#panelstage:not([inert])').waitFor({state:'visible',timeout:60000});
  const selector=menu.frameLocator('iframe.production-section');
  await selector.locator('[data-biome="'+biome+'"]').click({timeout:60000});
  await selector.locator('#confirmButton').click();
  await selector.locator('[data-culture="mapungubwe"]').click();
  await selector.locator('#confirmButton').click();
  await page.waitForSelector('#stage[aria-busy="true"]',{timeout:60000});
  if(process.env.WG_PACKAGE_UI_PLANT==='1'){
   await page.locator('#loading-cancel').waitFor({state:'visible',timeout:60000});
   await page.waitForFunction(()=>Number(document.querySelector('#loading-progress')?.textContent?.match(/\d+/)?.[0])>=30,null,{timeout:120000});
   await page.screenshot({path:report.replace(/\.json$/,'-plant-before.png')});
   await page.mouse.click(850,450);
   await page.waitForTimeout(1200);
   await page.screenshot({path:report.replace(/\.json$/,'-plant-after.png')});
   result.plantInput={x:850,y:450,scope:'Real browser pointer input; inspect images/video for the plant response. No synthetic plantAt call.'};
  }
  if(cancelFirst&&attempt===0){
   await page.locator('#loading-cancel').waitFor({state:'visible',timeout:60000});
   await page.waitForFunction(()=>document.querySelector('#loading-progress')?.textContent?.match(/\d+/)?.[0]>=30,null,{timeout:120000});
   result.cancel={progress:await page.locator('#loading-progress').innerText(),workersCreated:workers.length};
   await page.screenshot({path:report.replace(/\.json$/,'-before-cancel.png')});
   await page.locator('#loading-cancel').click();
   await menu.getByRole('button',{name:'Juego nuevo',exact:true}).waitFor({state:'visible',timeout:60000});
   await page.waitForTimeout(1500);
   result.cancel.closedWorkersBeforeRestart=closedWorkers.slice();
   continue;
  }
  await page.waitForFunction(()=>document.querySelector('#stage')?.getAttribute('aria-busy')==='false'||document.body.innerText.includes('No se ha podido preparar tu mundo.'),null,{timeout:180000});
  if(await page.locator('#stage').getAttribute('aria-busy')!=='false')throw Error('World loading failed: '+(await page.locator('body').innerText()).slice(-1000));
  result.gameText=(await page.locator('body').innerText()).slice(-2500);
  result.workers=workers;result.biome=biome;
  }
  if(cancelFirst)result.cancel.restarted=true;
  if(process.env.WG_PACKAGE_UI_LIFECYCLE==='1'){
   await page.locator('#menuButton').click();
   await page.locator('#save').click();
   await page.locator('#exit').click();
   await page.waitForSelector('#native-menu',{timeout:60000});
   await menu.getByRole('button',{name:'Continuar',exact:true}).click({timeout:60000});
   const saved=menu.locator('[data-production-save]').first();
   await saved.waitFor({state:'visible',timeout:60000});
   result.savedSlot=await saved.getAttribute('data-production-save');
   // Keep the exact saved world alongside captures so visual findings can be
   // reproduced instead of comparing two different randomly seeded games.
   const savedSnapshot=await page.evaluate(slotId=>new Promise((resolve,reject)=>{
    const request=indexedDB.open('wild-guardians-saves',1);
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
     const db=request.result,tx=db.transaction('slots','readonly');
     const read=tx.objectStore('slots').get(slotId);let record;
     read.onsuccess=()=>{record=read.result;};
     tx.oncomplete=()=>{db.close();record?.primary?resolve(record.primary):reject(Error('Saved QA slot missing'));};
     tx.onabort=()=>{db.close();reject(tx.error);};
    };
   }),result.savedSlot);
   const fixturePath=report.replace(/\.json$/,'-fixture.json');
   await writeFile(fixturePath,JSON.stringify({slotId:result.savedSlot,snapshot:savedSnapshot,
    scope:'Exact normal-menu save before reload; companion to package flow captures.'}));
   result.reproductionFixture=fixturePath;
   await saved.click();
   await page.waitForSelector('#stage[aria-busy="true"]',{timeout:60000});
   await page.waitForFunction(()=>document.querySelector('#stage')?.getAttribute('aria-busy')==='false',null,{timeout:180000});
   result.reloadedGameText=(await page.locator('body').innerText()).slice(-2500);
   result.lifecycle='save, exit to menu, continue saved slot, HUD restored';
  }

 }
 if(process.env.WG_PACKAGE_UI_PAN==='1'){
  if(await page.locator('.tutorial-close:visible').count())await page.locator('.tutorial-close:visible').first().click();
  for(let i=0;i<4;i++){
   await page.mouse.move(600,220);await page.mouse.down();
   await page.mouse.move(600,510,{steps:25});await page.mouse.up();
   await page.waitForTimeout(700);
  }
  await page.waitForTimeout(3000);
  result.cameraInput='Four left-button vertical drags, normal OrbitControls pan';
 }
 if(process.env.WG_PACKAGE_UI_CONTEXT==='1'){
  await page.screenshot({path:report.replace(/\.json$/,'-before-loss.png')});
  result.context=await page.evaluate(async()=>{
   const canvas=document.querySelector('#world'),gl=canvas?.getContext('webgl2');
   const extension=gl?.getExtension('WEBGL_lose_context');
   if(!extension)throw Error('Context-loss extension unavailable');
   const events=[],began=performance.now();
   await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(Error('Context restoration timed out')),30000);
    canvas.addEventListener('webglcontextlost',()=>{events.push('lost');setTimeout(()=>extension.restoreContext(),250);},{once:true});
    canvas.addEventListener('webglcontextrestored',()=>{events.push('restored');clearTimeout(timeout);resolve();},{once:true});
    extension.loseContext();
   });
   return {events,elapsedMs:performance.now()-began};
  });
  await page.waitForTimeout(3000);
  result.context.stageBusy=await page.locator('#stage').getAttribute('aria-busy');
 }
 if(process.env.WG_PACKAGE_UI_TRACE==='1'){
  result.loadingTrace=await page.evaluate(()=>globalThis.__wildGuardiansNativeLoadingSnapshot?.());
  result.backend=await page.evaluate(()=>{const gl=document.querySelector('#world')?.getContext('webgl2'),debug=gl?.getExtension('WEBGL_debug_renderer_info');return debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null;});
  result.requestedQuality=process.env.WG_PACKAGE_UI_QUALITY??'default';
 }
 if(errors.length||requests.length)throw Error('Package run reported errors or missing resources: '+JSON.stringify({errors,requests}));
 await page.screenshot({path:report.replace(/\.json$/,'.png')});
 if(process.env.WG_PACKAGE_UI_SETTLE==='1'){
  await page.waitForTimeout(30000);
  await page.screenshot({path:report.replace(/\.json$/,'-settled.png')});
  result.settled={waitMs:30000,stageBusy:await page.locator('#stage').getAttribute('aria-busy')};
  if(errors.length||requests.length)throw Error('Errors during settled observation: '+JSON.stringify({errors,requests}));
 }
 console.log(JSON.stringify(result));
}catch(e){result.loadingTrace=await page.evaluate(()=>globalThis.__wildGuardiansNativeLoadingSnapshot?.()).catch(()=>null);result.failure=String(e);process.exitCode=1;console.error(e);await page.screenshot({path:report.replace(/\.json$/,'-failure.png')}).catch(()=>{});}
finally{await writeFile(report,JSON.stringify({diagnostics:{standaloneOverride:process.env.WG_PACKAGE_UI_STANDALONE_WASM??null,runtimeOverrideDirectory:process.env.WG_PACKAGE_UI_RUNTIME_DIR??null,runtimeOverrides,loadingTrace:process.env.WG_PACKAGE_UI_TRACE==='1',softwareRequested:process.env.WG_PACKAGE_UI_SOFTWARE==='1',initialQuality:process.env.WG_PACKAGE_UI_QUALITY??null},scope:process.env.WG_PACKAGE_UI_FIXTURE?'Built package at nested path; imported saved-world fixture via legacy storage and selected through normal menu. No route interception or source injection.':'Built package at nested path, no URL flags, route interception or source injection.',result,errors,requests,workers,closedWorkers},null,2)+'\n');await page.context().close();if(page.video())await page.video().saveAs(report.replace(/\.json$/,'.webm'));await browser.close();await new Promise(resolve=>server.close(resolve));}
