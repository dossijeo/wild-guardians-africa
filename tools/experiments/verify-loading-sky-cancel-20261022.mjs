import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.env.WG_LOADING_FLOW_OUT??'docs/qa/global-visual-lab/loading-diffuse-flow-20261022';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
try{for(const mode of ['cancel']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.route('**/src/rendering/loading-diorama.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const anchor='finally{world.renderer.shadowMap.enabled=shadow;world.renderer.autoClear=autoClear;}';if(!body.includes(anchor))throw Error('Loading render observation anchor missing');
  body=body.replace('this.world=world;','globalThis.qaObservedDiorama=this;this.world=world;');
  body=body.replace(anchor,anchor+`if(this.interactive){const frames=globalThis.qaActualLoadingFrames??=[];const label=frames.length===0?'initial':progress>=.9&&!frames.some(f=>f.label==='late')?'late':progress>=.5&&!frames.some(f=>f.label==='middle')?'middle':null;if(label)frames.push({label,progress,night:this.night,plants:this.plants.plants.length,png:world.canvas.toDataURL('image/png')});}`);
  await route.fulfill({response,body});
 });
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&qa-loading'+(mode==='original'?'':'&loadingBeam=diffuse'));
 await page.waitForSelector('#native-menu',{timeout:60000});const menu=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await menu.waitForLoadState('load');await menu.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await menu.evaluate(()=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome:'sabana',culture:'mapungubwe'},location.origin));
 if(mode==='cancel'){
  await page.locator('#loading-cancel').waitFor({state:'visible',timeout:120000});await page.click('#loading-cancel');await page.waitForSelector('#native-menu',{timeout:120000});
 }else await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]'),null,{timeout:180000});
 const state=await page.evaluate(()=>({dioramaDisposed:window.qaObservedDiorama?.disposed===true,stageBusy:document.querySelector('#stage')?.getAttribute('aria-busy')??null,menu:!!document.querySelector('#native-menu'),loadingOverlay:!!document.querySelector('#world-loading'),frames:window.qaActualLoadingFrames??[]}));
 for(const f of state.frames){await writeFile(`${out}/${mode}-${f.label}.png`,Buffer.from(f.png.split(',')[1],'base64'));delete f.png;}
 await page.screenshot({path:`${out}/${mode}-end.png`});
 if(!state.dioramaDisposed||state.loadingOverlay||errors.length)throw Error(JSON.stringify({mode,state,errors}));
 results.push({mode,...state,errors});await writeFile(`${out}/flow.json`,JSON.stringify({note:'Actual menu-to-load-to-game and cancellation. Read-only PNG observation adds overhead; not a timing benchmark or pixel-equivalent A/B.',results},null,2)+'\n');console.log(mode,'verified');await page.close();
}}finally{await browser.close()}
