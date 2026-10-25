import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/continuous-grass-river';await mkdir(out,{recursive:true});const records=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const biome of ['gran-rio']){
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


 // Fixed after scouting resident herbaceous candidates in seed 712; identical across quality profiles.
 await page.evaluate(()=>{window.qaCoverageOrigin=[87.83156862745099,7.077262442364413,15.827254901960785]});
 if(process.env.WG_COVER_APPEND==='1'){const old=JSON.parse(await readFile(out+'/captures-'+quality+'.json','utf8'));records.push(...old.records);}


 for(const view of ['close','game','elevated'])for(const [hour,time]of [['day',150],['night',350]])for(const variant of ['A','B','C','A2']){
 const audit=await page.evaluate(async({view,time,variant})=>{
  const w=window.qaCampaignWorld;w.controls.target.fromArray(window.qaCoverageOrigin);
  const offset=view==='close'?[3,2,4]:view==='game'?[22,16,18]:[16,30,18];w.camera.position.copy(w.controls.target).add({x:offset[0],y:offset[1],z:offset[2]});w.state.time=time;
  w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();
  const {applyMaterialStudy}=await import('/tools/experiments/qa-continuous-grass-river.js');w.renderer.debug.onShaderError=(gl,p,v,f)=>{throw Error(gl.getProgramInfoLog(p)+' V:'+gl.getShaderInfoLog(v)+' F:'+gl.getShaderInfoLog(f))};const audit=await applyMaterialStudy(w,variant==='A2'?'A':variant);w.render(.016);return audit;
 },{view,time,variant});await page.waitForTimeout(1200);
 const result=await page.evaluate(()=>{const w=window.qaCampaignWorld,r=w.renderer,auto=r.info.autoReset;r.info.autoReset=false;r.info.reset();w.render(.016);if(r.getContext().isContextLost())throw Error('GL context lost');const data={glError:r.getContext().getError(),image:r.domElement.toDataURL('image/png').split(',')[1],coverage:w.qaContinuousGrass.audit(),render:{...r.info.render},memory:{...r.info.memory},camera:w.camera.position.toArray(),target:w.controls.target.toArray(),time:w.state.time};r.info.autoReset=auto;return data;});
 const file=quality+'-'+view+'-'+hour+'-'+variant+'.png';await writeFile(out+'/'+file,Buffer.from(result.image,'base64'));delete result.image;records.push({file,quality,view,hour,variant,audit,...result});
 }
 await writeFile(out+'/captures-'+quality+'.json',JSON.stringify({records:records.filter(r=>r.quality===quality),errors},null,2)+'\n');console.log(JSON.stringify({quality,records:records.length,errors}));await page.close();
 }}finally{await browser.close()}
