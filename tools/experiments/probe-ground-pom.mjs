import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/ground-pom';await mkdir(out,{recursive:true});const records=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const biome of ['sabana'])for(const variant of ['base']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 await page.addInitScript(()=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',farVegetation:false})));
 await page.goto('http://127.0.0.1:5190/?qa-seed=712');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'qa-visual');w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});

 const info=await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.state.time=150;const t=w.controls.target.clone();t.x+=15;t.z+=10;t.y=w.nav.field.surface(t.x,t.z)+.15;w.controls.target.copy(t);w.camera.position.copy(t).add({x:3,y:2,z:4});w.syncChunks();await w.whenChunksReady();w.render(.016);return {sun:w.toon.uniforms.uLightDir.value.toArray(),camera:w.camera.position.toArray(),target:t.toArray(),quality:w.quality,biome:w.state.biome}});await page.waitForTimeout(1000);console.log(info);
 const data=await page.evaluate(()=>{const w=window.qaCampaignWorld;w.render(.016);return w.renderer.domElement.toDataURL('image/png').split(',')[1]});await writeFile(out+'/probe.png',Buffer.from(data,'base64'));await writeFile(out+'/probe.json',JSON.stringify(info,null,2));await page.close();
}}finally{await browser.close()}
