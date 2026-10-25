import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='docs/qa/production-integration-20261025/horizon-focus-integrated';await mkdir(out,{recursive:true});
const biome=process.env.WG_LIGHT_BIOME??'manglares';
const browser=await chromium.launch({channel:'chrome',headless:true});const records=[];
try{for(const arm of ['original']){
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'&&errors.length<20)errors.push(m.text());});
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();const body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World hook absent');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaLightingWorld=this;this.raycaster=new')});});
 await page.addInitScript(()=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',farVegetation:true,sfx:0,music:0})));
 await page.goto('http://localhost:5190/?qa-seed=712');await page.waitForSelector('#native-menu');const menu=page.frameLocator('#native-menu');await menu.locator('#loading').waitFor({state:'hidden',timeout:90000});
 await menu.locator('body').evaluate((_,biome)=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaLightingWorld?.state,null,{timeout:240000});
 const setup=await page.evaluate(async()=>{const w=window.qaLightingWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.state.time=150;w.state.elapsed=2;w.simElapsed=2;w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();};const f=w.nav.field,o=w.controls.target.clone();let best=null;for(let z=-100;z<=100;z+=2)for(let x=-100;x<=100;x+=2){const px=o.x+x,pz=o.z+z;if(f.waterInfo(px,pz).inside&&(!best||x*x+z*z<best.d))best={x:px,z:pz,d:x*x+z*z};}if(best)w.controls.target.set(best.x,f.surface(best.x,best.z)+.9,best.z);const p=w.controls.target.clone();w.camera.position.set(p.x+22,p.y+16,p.z+18);w.syncChunks();await w.whenChunksReady();await w.horizon?.whenReady();const update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(2);return {camera:w.camera.position.toArray(),target:w.controls.target.toArray(),biome:w.state.biome,visualSearch:w.visualSearch};});
 const defaults=await page.evaluate(()=>{const f=window.qaLightingWorld.horizonFocus;return {enabled:f.enabled,ready:f.ready,stats:{...f.stats}};});
 if(!defaults.enabled||!defaults.ready||defaults.stats.disabledReason)throw Error('Default horizon focus not ready: '+JSON.stringify(defaults));
 for(const phase of ['day','night'])for(const view of ['game','horizon','elevated']){
  await page.evaluate(({phase,view})=>{const w=window.qaLightingWorld,p=w.controls.target;w.state.time=phase==='day'?150:350;w.camera.position.set(p.x+22,p.y+(view==='game'?16:view==='horizon'?4:50),p.z+18);w.camera.lookAt(p);w.camera.updateMatrixWorld();},{phase,view});
  for(const mode of ['off','default']){
   await page.evaluate(mode=>{window.qaLightingWorld.horizonFocus.enabled=mode!=='off';},mode);await page.waitForTimeout(700);
   const file=`${biome}-${view}-${phase}-${mode}.png`;await page.screenshot({path:`${out}/${file}`});
   records.push({phase,view,mode,file,metrics:await page.evaluate(()=>{const w=window.qaLightingWorld;return {camera:w.camera.position.toArray(),target:w.controls.target.toArray(),focus:w.horizonFocus.uniforms.focus.value.toArray(),radius:w.horizonFocus.uniforms.radius.value,stats:{...w.horizonFocus.stats},glError:w.renderer.getContext().getError()};}),errors:[...errors]});
   if(records.at(-1).metrics.glError)throw Error('GL error in integrated focus');
  }
 }
 const lifecycle=[];
 for(const quality of ['baja','media']){
  await page.evaluate(q=>window.qaLightingWorld.qualitySetting(q),quality);await page.waitForTimeout(1500);
  lifecycle.push(await page.evaluate(()=>{const w=window.qaLightingWorld,f=w.horizonFocus;return {quality:w.quality,enabled:f.enabled,ready:f.ready,stats:{...f.stats},glError:w.renderer.getContext().getError()};}));
 }
 await page.setViewportSize({width:960,height:540});await page.waitForTimeout(700);
 lifecycle.push(await page.evaluate(()=>{const w=window.qaLightingWorld;return {resize:[w.renderer.domElement.width,w.renderer.domElement.height],target:[w.horizonFocus.target?.width,w.horizonFocus.target?.height],glError:w.renderer.getContext().getError()};}));
 await page.setViewportSize({width:1280,height:720});await page.waitForTimeout(700);
 if(process.env.WG_FOCUS_CONTEXT==='1'){
  await page.evaluate(()=>{window.qaRestore=window.qaLightingWorld.renderer.getContext().getExtension('WEBGL_lose_context');window.qaRestore.loseContext();});await page.waitForTimeout(500);await page.evaluate(()=>window.qaRestore.restoreContext());
  await page.waitForFunction(()=>window.qaLightingWorld.horizonFocus.ready&&!window.qaLightingWorld.renderer.getContext().isContextLost(),null,{timeout:90000});await page.waitForTimeout(1000);
  lifecycle.push(await page.evaluate(()=>({restored:true,stats:{...window.qaLightingWorld.horizonFocus.stats},glError:window.qaLightingWorld.renderer.getContext().getError()})));
 }
 await writeFile(`${out}/${biome}.json`,JSON.stringify({scope:'Integrated default renderer, real campaign. Controlled paused visual views, quality switch, resize and optional context restoration. Not a streaming benchmark.',defaults,records,lifecycle,errors},null,2));
 if(errors.length||lifecycle.some(r=>r.glError||r.stats?.disabledReason))throw Error('Integrated lifecycle reported errors');
 await page.close();console.log(biome,'integrated focus passed');
}}finally{await browser.close();}
