import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/continuous-grass-river/distance-lod';await mkdir(out,{recursive:true});const records=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const mode of ['original','distance'])for(const biome of ['gran-rio']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});if(mode==='distance')await page.route('**/tools/experiments/qa-continuous-grass-river.js',async route=>route.fulfill({response:await route.fetch({url:route.request().url().replace('qa-continuous-grass-river.js','qa-continuous-grass-river-distance.js')})}));const errors=[];
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



 await page.evaluate(async()=>{const w=window.qaCampaignWorld,z=15.827254901960785,x=w.nav.field.riverX(z)+10;w.controls.target.set(x,w.nav.field.surface(x,z)+.4,z);w.camera.position.copy(w.controls.target).add({x:16,y:12,z:18});w.state.time=150;w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();await (await import('/tools/experiments/qa-continuous-grass-river.js')).applyMaterialStudy(w,'C');w.render(.016)});
 await mkdir(out+'/'+mode+'-frames',{recursive:true});const frames=[];
 for(let i=0;i<180;i++){
 const result=await page.evaluate(i=>{const w=window.qaCampaignWorld,t=i/179,h=12+20*Math.sin(Math.PI*t);w.camera.position.copy(w.controls.target).add({x:16,y:h,z:18});w.qaContinuousGrass.timeOverride=i/30;w.render(1/30);return {image:w.renderer.domElement.toDataURL('image/png').split(',')[1],camera:w.camera.position.toArray(),coverage:w.qaContinuousGrass.audit(),glError:w.renderer.getContext().getError()}},i);
 if(result.glError||result.coverage.stats.overflow||!result.coverage.far)throw Error('Invalid camera frame');
 await writeFile(out+'/'+mode+'-frames/'+String(i).padStart(4,'0')+'.png',Buffer.from(result.image,'base64'));delete result.image;frames.push(result);
 }
 await writeFile(out+'/camera-'+mode+'.json',JSON.stringify({mode,seed:712,quality,resolution:[1280,720],fps:30,duration:6,method:'Deterministic offline frames; camera rises from 12m to32m then descends; wind8; not FPS benchmark',frames,errors},null,2));console.log(mode,frames.length,errors);await page.close();
 }}finally{await browser.close()}
