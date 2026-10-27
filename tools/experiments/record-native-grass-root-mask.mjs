import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/native-grass-root-mask';await mkdir(out,{recursive:true});const records=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_POM_QUALITY??'media').split(','))for(const biome of ['sabana']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&visualLab=global-lighting');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'qa-visual');w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});


 if(process.env.WG_POM_APPEND==='1'){const old=JSON.parse(await readFile(out+'/captures-'+quality+'.json','utf8'));records.push(...old.records);}



 await mkdir(out+'/motion',{recursive:true});
 for(const [hour,time]of [['day',150],['night',350]])for(const variant of ['continuous','root']){
 await page.evaluate(async({time,variant})=>{const w=window.qaCampaignWorld;w.controls.target.set(135,9.400129699707032,45);w.camera.position.set(138,11.400129699707032,49);w.state.time=time;w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();await(await import('/tools/experiments/qa-native-grass-root-mask.js')).applyMaterialStudy(w,variant);w.render(.016)},{time,variant});await page.waitForTimeout(1200);
 for(let i=0;i<48;i++){
 const image=await page.evaluate(i=>{const w=window.qaCampaignWorld,a=(i/47-.5)*.35;w.camera.position.set(135+3*Math.cos(a)+4*Math.sin(a),11.400129699707032,45+4*Math.cos(a)-3*Math.sin(a));w.render(.016);return w.renderer.domElement.toDataURL('image/png').split(',')[1]},i);
 await writeFile(out+'/motion/'+hour+'-'+variant+'-'+String(i).padStart(3,'0')+'.png',Buffer.from(image,'base64'));
 }
 console.log(hour,variant,'48 frames');
 }
 await writeFile(out+'/motion/audit.json',JSON.stringify({framesPerClip:48,playbackFps:20,note:'Deterministic orbit, not measured FPS; world/clock paused',errors},null,2)+'\n');await page.close();
 }}finally{await browser.close()}
