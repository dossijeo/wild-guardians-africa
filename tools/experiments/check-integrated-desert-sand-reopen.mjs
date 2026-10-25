import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='docs/qa/global-visual-lab/desert-aerial-sand/integration-reopen';await mkdir(out,{recursive:true});const records=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of ['media','baja']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch(),body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')})});
 await page.route('**/src/app/main.js*',async route=>{const response=await route.fetch(),body=await response.text();if(!body.includes('async function boot()'))throw Error('Menu anchor missing');await route.fulfill({response,body:body.replace('async function boot()','globalThis.qaReturnMenu=menu;async function boot()')})});
 await page.addInitScript(q=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:q,farVegetation:false})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&visualLab=global-lighting&sandRelief=1');
 for(let cycle=0;cycle<3;cycle++){
  await page.waitForSelector('#native-menu',{timeout:60000});const menu=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});await menu.waitForLoadState('load');await menu.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
  await menu.evaluate(()=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome:'desierto',culture:'mapungubwe'},location.origin));
  await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state&&!window.qaCampaignWorld.disposed,null,{timeout:180000});
  const setup=await page.evaluate(async()=>{
   const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};const update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0);
   w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;w.camera.position.copy(w.controls.target).add({x:22,y:16,z:18});
   for(let i=0;i<4;i++){w.render(0);await w.whenChunksReady();await w.horizon.whenReady();await new Promise(requestAnimationFrame)}
   await Promise.all([...w.objects.values()].map(o=>o.userData.actorReady).filter(Boolean));
   const map=w.biomeGround.textures[1],source=await w.assets.cache.get('/assets/visual-lab/aerial_beach_01-normal.pngfalse');if(!source)throw Error('Missing source');
   const stats={clone:0,source:0};map.addEventListener('dispose',()=>stats.clone++);source.addEventListener('dispose',()=>stats.source++);window.qaReleaseStats=stats;
   return {mapId:map.uuid,sourceId:source.uuid,enabled:w.biomeGround.desertSand,memory:{...w.renderer.info.memory}};
  });
  const frames=[];
  for(const phase of ['day','night']){
   const result=await page.evaluate(phase=>{const w=window.qaCampaignWorld;w.state.time=phase==='day'?150:350;w.state.day=1;for(const group of w.chunks.values())for(const batch of group.userData.lodBatches??[])batch.key=null;for(let i=0;i<12;i++)w.render(1/30);return {camera:w.camera.position.toArray(),target:w.controls.target.toArray(),time:w.state.time,calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,memory:{...w.renderer.info.memory},glError:w.renderer.getContext().getError(),data:w.renderer.domElement.toDataURL('image/png').split(',')[1]}},phase);
   await writeFile(`${out}/${quality}-${cycle}-${phase}.png`,Buffer.from(result.data,'base64'));delete result.data;frames.push({phase,...result});if(result.glError)throw Error('GL error');
  }
  const closed=await page.evaluate(async()=>{const w=window.qaCampaignWorld;await window.qaReturnMenu();return {worldDisposed:w.disposed,groundDisposed:w.biomeGround.disposed,textures:w.biomeGround.textures.length,masks:w.biomeGround.masks.size,releases:{...window.qaReleaseStats},menu:!!document.querySelector('#native-menu')}});
  records.push({quality,cycle,setup,frames,closed,errors:[...errors]});await writeFile(out+'/results.json',JSON.stringify({seed:712,navigation:'same page, native menu and new game, no reload between cycles',records},null,2)+'\n');
  if(!setup.enabled||!closed.menu||!closed.worldDisposed||!closed.groundDisposed||closed.textures||closed.masks||closed.releases.clone!==1||closed.releases.source!==1||errors.length)throw Error('Lifecycle assertion failed');
  console.log(quality,cycle,'closed and released');
 }
 await page.close();
}}finally{await browser.close()}
