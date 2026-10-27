import {globalReviewedQuery} from './global-reviewed-recipe-20261022.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out=process.env.WG_REVIEW_OUT??'docs/qa/global-visual-lab/holly-fern-native-motion-20261023';await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const treatment of ['cards'])for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const biome of (process.env.WG_REVIEW_BIOMES??'manglares').split(',')){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new');await route.fulfill({response,body});});
 await page.route('**/src/app/main.js*',async route=>{const response=await route.fetch();let body=await response.text();const anchor='world.render(0);loadingOverlay?.dispose();';if(!body.includes(anchor))throw Error('Early pause anchor missing');body=body.replace(anchor,"Game.pause(state,'menu');world.render(0);loadingOverlay?.dispose();");body=body.replace('} catch(e){if(loadingToken===loadingGeneration)', '} catch(e){globalThis.qaFarLoadError=String(e.stack??e);if(loadingToken===loadingGeneration)');await route.fulfill({response,body});});
 await page.route('**/src/rendering/shader-failure.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('throw failure.current;', 'globalThis.qaShaderFailure=failure.current.details;throw failure.current;');await route.fulfill({response,body});});
 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:true})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&'+(globalReviewedQuery(biome)+'&mangroveFerns=holly'));
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>globalThis.qaFarLoadError||(document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state),null,{timeout:180000}).catch(async e=>{await writeFile(out+'/load-failure.json',JSON.stringify(await page.evaluate(()=>({text:document.body.innerText,far:globalThis.qaCampaignWorld?.farVegetation?.stats,adapters:globalThis.qaCampaignWorld?.farVegetation?.adapters?.map(a=>({stats:a.stats,pending:a.preparationStatus()}))})),null,2));throw Error(errors.join('\n')+'\n'+e.message)});
 const failure=await page.evaluate(()=>globalThis.qaFarLoadError&&(globalThis.qaFarLoadError+'\n'+JSON.stringify(globalThis.qaShaderFailure)));if(failure){await writeFile(out+'/load-failure.json',JSON.stringify({error:failure},null,2));throw Error(failure);}
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.state.elapsed=2;w.simElapsed=2;w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});





 await page.evaluate(({biome,canyonTarget})=>{
 const w=window.qaCampaignWorld;
 if(biome==='sabana')w.controls.target.set(135,9.400129699707032,45);
 if(biome==='gran-rio')w.controls.target.set(87.83156862745099,7.077262442364413,15.827254901960785);
 if(biome==='gran-canon')w.controls.target.fromArray(canyonTarget);
 if(biome!=='gran-canon'&&biome!=='desierto'){const f=w.nav.field,o=w.controls.target.clone();let best=null;for(let z=-100;z<=100;z+=2)for(let x=-100;x<=100;x+=2){const px=o.x+x,pz=o.z+z,info=f.waterInfo(px,pz);if(info.inside&&(!best||x*x+z*z<best.d))best={x:px,z:pz,d:x*x+z*z};}if(best)w.controls.target.set(best.x,f.surface(best.x,best.z)+.9,best.z);}
 if(w.groundDetails.audit)w.groundDetails.timeOverride=2;
 },{biome,canyonTarget:[-47.868919372558594, 3.259999895095825, 102]});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;const o=w.controls.target.toArray();window.qaSandPath=[[7,3,6],[22,16,18],[-18,9,22]].map(([x,y,z])=>[o[0]+x,Math.max(o[1]+y,w.nav.field.surface(o[0]+x,o[2]+z)+1.2),o[2]+z]);w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();});

 for(const phase of phases){
  const dir=out+'/'+phase;await mkdir(dir,{recursive:true});const frames=[];
  await page.evaluate(async phase=>{const w=qaCampaignWorld;w.state.time=phase==='day'?150:350;w.state.day=1;w.camera.position.fromArray(qaSandPath[0]);w.groundDetails.timeOverride=0;w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();const {prepareInitialFarWorld}=await import('/src/app/far-world-loading.js');await prepareInitialFarWorld(w);for(let i=0;i<45;i++){await new Promise(requestAnimationFrame);w.render(0);}},phase);
  for(let i=0;i<120;i++){
   const f=await page.evaluate(i=>{const w=qaCampaignWorld,t=i/30,offset=i<60?0:3*Math.sin((i-60)/59*Math.PI)**2;w.camera.position.fromArray(qaSandPath[0]);w.camera.position.x+=offset;w.groundDetails.timeOverride=t;w.render(0);return {frame:i,time:t,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),elapsed:w.state.elapsed,calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,coverage:w.groundDetails.audit(),pending:(w.farVegetation?.adapters??[]).some(a=>a.preparationPending()),glError:w.renderer.getContext().getError(),data:w.renderer.domElement.toDataURL('image/png').split(',')[1]};},i);
   if(f.glError)throw Error('GL error '+f.glError);await writeFile(dir+'/'+String(i).padStart(4,'0')+'.png',Buffer.from(f.data,'base64'));delete f.data;frames.push(f);
  }
  if(errors.length)throw Error(errors.join('\n'));await writeFile(dir+'/frames.json',JSON.stringify({phase,seed:712,resolution:[1280,720],fps:30,note:'Offline sampled render frames, not measured real-time FPS. First2s fixed camera, then3m lateral arc; native wind advances. Simulation paused.',frames,errors},null,2));console.log(phase,'motion captured');
 }
 await page.close();
 }}finally{await browser.close()}
