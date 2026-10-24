import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/native-grass-base';await mkdir(out,{recursive:true});const records=[];
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

 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.controls.target.set(135,9.400129699707032,45);w.camera.position.set(138,11.400129699707032,49);w.state.time=150;w.syncChunks();await w.whenChunksReady();w.render(.016)});await page.waitForTimeout(1200);
 const data=await page.evaluate(()=>{const w=window.qaCampaignWorld;const points=[[560,480],[620,510],[300,420],[900,360],[700,260],[560,460],[560,490],[600,480],[540,470]];return points.map(([x,y])=>{w.raycaster.setFromCamera({x:x/640-1,y:1-y/360},w.camera);const hits=w.raycaster.intersectObjects(w.scene.children,true).filter(h=>h.object.visible).slice(0,4);return {pixel:[x,y],hits:hits.map(h=>{const slot=h.object.userData.nativeLodBatch?.slot ?? w.prototypes.findIndex(levels=>levels.some(m=>m.material===h.object.material)),p=h.point.clone().sub(w.scene.position),water=w.nav.field.waterInfo(p.x,p.z);return {objectName:h.object.name,userDataKeys:Object.keys(h.object.userData),materialName:h.object.material?.name,slot,name:w.pack.assets[slot]?.name,point:p.toArray(),uv:h.uv?.toArray(),instance:h.instanceId,fluid:h.object.userData.nativeFluid,ground:h.object.userData.ground,waterInside:water.inside}})}})});
 await writeFile(out+'/ray-audit.json',JSON.stringify(data,null,2)+'\n');const image=await page.evaluate(()=>{const w=window.qaCampaignWorld;w.render(.016);return w.renderer.domElement.toDataURL('image/png').split(',')[1]});await writeFile(out+'/reference.png',Buffer.from(image,'base64'));console.log(JSON.stringify(data));await page.close();
 }}finally{await browser.close()}
