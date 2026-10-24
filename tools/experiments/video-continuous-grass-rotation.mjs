import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/continuous-grass-rotation';await mkdir(out,{recursive:true});const records=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const biome of ['sabana']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&visualLab=global-lighting');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'qa-visual');w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});



 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.controls.target.set(135,9.400129699707032,45);w.camera.position.set(138,11.400129699707032,49);w.state.time=150;w.syncChunks();await w.whenChunksReady();await (await import('/tools/experiments/qa-continuous-grass-rotation.js')).applyMaterialStudy(w,'C');w.render(.016)});
 for(const strength of ['C','rotation']){await mkdir(out+'/wind-'+strength,{recursive:true});await page.evaluate(async variant=>(await import('/tools/experiments/qa-continuous-grass-rotation.js')).applyMaterialStudy(window.qaCampaignWorld,variant),strength);for(let i=0;i<150;i++){
 const image=await page.evaluate(i=>{const w=window.qaCampaignWorld;w.qaContinuousGrass.timeOverride=i/30;w.render(1/30);return w.renderer.domElement.toDataURL('image/png').split(',')[1]},i);
 await writeFile(out+'/wind-'+strength+'/'+String(i).padStart(4,'0')+'.png',Buffer.from(image,'base64'));
 }
 }
 await mkdir(out+'/camera-frames',{recursive:true});
 for(let i=0;i<120;i++){
 const image=await page.evaluate(i=>{const w=window.qaCampaignWorld,t=i/119;w.camera.position.set(138+19*t,11.400129699707032+14*t,49+14*t);w.qaContinuousGrass.timeOverride=i/30;w.render(1/30);return w.renderer.domElement.toDataURL('image/png').split(',')[1]},i);
 await writeFile(out+'/camera-frames/'+String(i).padStart(4,'0')+'.png',Buffer.from(image,'base64'));
 }
 await writeFile(out+'/wind-video.json',JSON.stringify({variants:['C','rotation'],strength:8,seed:712,quality,resolution:[1280,720],frames:150,fps:30,duration:5,cameraVideo:{frames:120,duration:4},method:'Renderer frames at deterministic shader times; fixed camera; offline encoding, not an FPS measurement',errors},null,2));
 await page.close();
 }}finally{await browser.close()}
