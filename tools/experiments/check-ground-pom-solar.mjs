import {spawnSync} from 'node:child_process';
import {disableIntegratedDesertLight} from './desert-light-qa-route.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const study=process.env.WG_GRASS_STUDY??'grass-streaming';const out=process.env.WG_GRASS_OUTPUT??'docs/qa/global-visual-lab/ground-pom';await mkdir(out,{recursive:true});const records=[],transitions=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of ['media'])for(const biome of ['sabana']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'qa-visual');w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});



 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.controls.target.x+=25;w.controls.target.z+=15;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.15;w.camera.position.copy(w.controls.target).add({x:3,y:2,z:4});w.syncChunks();await w.horizon.whenReady();await w.whenChunksReady();});

 await page.evaluate(async()=>{const w=window.qaCampaignWorld;await (await import('/tools/experiments/qa-ground-pom.js')).applyMaterialStudy(w,'D');});
 for(const phase of ['day','night']){
 await page.evaluate(phase=>window.qaCampaignWorld.state.time=phase==='day'?150:350,phase);await page.waitForTimeout(700);
 for(const [index,value] of [0,255,0].entries()){
 const result=await page.evaluate(value=>{const w=window.qaCampaignWorld,t=w.qaGroundPOMResources.get('D')[0];t.qaOriginalImage??=t.image;const c=document.createElement('canvas');c.width=t.qaOriginalImage.width;c.height=t.qaOriginalImage.height;const ctx=c.getContext('2d');ctx.drawImage(t.qaOriginalImage,0,0);const p=ctx.getImageData(0,0,c.width,c.height);for(let i=1;i<p.data.length;i+=4)p.data[i]=value;ctx.putImageData(p,0,0);t.image=c;t.needsUpdate=true;w.render(.016);return {night:w.toon.uniforms.uNight.value,camera:w.camera.position.toArray(),data:w.renderer.domElement.toDataURL('image/png').split(',')[1]};},value);const file=`solar-check-${phase}-${index}-${value}.png`;await writeFile(out+'/'+file,Buffer.from(result.data,'base64'));records.push({phase,index,value,file,night:result.night,camera:result.camera,errors:[...errors]});
 }
 }
 await writeFile(out+'/solar-check.json',JSON.stringify({records},null,2)+'\n');await page.close();
}}finally{await browser.close()}
