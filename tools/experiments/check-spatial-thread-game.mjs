import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import {globalClosureQuery} from './global-closure-recipe-20261022.mjs';
const fixture=JSON.parse(await readFile('docs/qa/global-visual-lab/manglares-populated-frozen-20261022/native-fixture.json','utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(text=>{localStorage.setItem('wild-guardians:slot:opening',text);localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',farVegetation:true}));},fixture.timing.navigationContext.state);
 await page.route('**/src/rendering/scene.js*',async route=>{const r=await route.fetch();const s=await r.text();if(!s.includes('this.raycaster=new'))throw Error('Missing world observation anchor');await route.fulfill({response:r,body:s.replace('this.raycaster=new','globalThis.qaThreadWorld=this;this.raycaster=new')});});
 await page.goto(`http://127.0.0.1:${process.env.WG_THREAD_PORT??5192}/?`+globalClosureQuery('manglares')+'&mangroveFerns=holly&groundCache=fixed512');
 await page.waitForSelector('#native-menu',{timeout:60000});
 const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(()=>parent.postMessage({type:'wild-guardians:menu',action:'load-slot',slotId:'opening'},location.origin));
 await page.waitForFunction(()=>globalThis.qaThreadWorld?.spatialSession?.runtime&&qaThreadWorld.chunks?.size>=9,{},{timeout:180000});
 const result=await page.evaluate(async()=>{const w=qaThreadWorld;await w.whenChunksReady();return {isolated:crossOriginIsolated,runtime:w.spatialSession.runtime,stream:w.chunkStream.summary(),native:w.spatialSession.core.metrics(),chunks:w.chunks.size,renderer:w.renderer.getContext().getParameter(w.renderer.getContext().RENDERER)};});
 if(result.runtime.backend!=='pthreads')throw Error(JSON.stringify(result));
 await writeFile('docs/qa/wild-engine-pthreads/thread-game.json',JSON.stringify({scope:'Loaded populated Mangroves game in Chrome, initial stream. Not ABAB performance acceptance.',result,errors},null,2)+'\n');
 console.log(JSON.stringify({result,errors}));
}finally{await browser.close();}
