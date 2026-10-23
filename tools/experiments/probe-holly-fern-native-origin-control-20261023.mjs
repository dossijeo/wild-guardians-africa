import {globalReviewedQuery} from './global-reviewed-recipe-20261022.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out=process.env.WG_REVIEW_OUT??'docs/qa/global-visual-lab/holly-fern-native-origin-control-20261023';await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const treatment of (process.env.WG_CARD_TREATMENTS??'original,cards').split(','))for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const biome of (process.env.WG_REVIEW_BIOMES??'manglares').split(',')){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new');await route.fulfill({response,body});});
 await page.route('**/src/app/main.js*',async route=>{const response=await route.fetch();let body=await response.text();const anchor='world.render(0);loadingOverlay?.dispose();';if(!body.includes(anchor))throw Error('Early pause anchor missing');body=body.replace(anchor,"Game.pause(state,'menu');world.render(0);loadingOverlay?.dispose();");body=body.replace('} catch(e){if(loadingToken===loadingGeneration)', '} catch(e){globalThis.qaFarLoadError=String(e.stack??e);if(loadingToken===loadingGeneration)');await route.fulfill({response,body});});
 await page.route('**/src/rendering/shader-failure.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('throw failure.current;', 'globalThis.qaShaderFailure=failure.current.details;throw failure.current;');await route.fulfill({response,body});});
 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:true})),quality);
 if(treatment==='fringe')await page.route('**/src/rendering/continuous-grass.js*',async route=>{const response=await route.fetch();let body=await response.text();
 const anchor='q.stats.candidates++;';if(body.split(anchor).length!==2)throw Error('Candidate anchor mismatch');body=body.replace(anchor,anchor+"const fringe=mangrove?.15*clamp((noise(x*.43,z*.43,seed^18597)-.35)/.45,0,1):0;const wearLimit=.25+fringe;");
 body=body.replace('||wear>.25||','||wear>wearLimit||').replace('if(edgeWear>.27)break;','if(edgeWear>wearLimit+.02)break;').replace('if(edgeWear>.27){q.stats.masked++;continue;}','if(edgeWear>wearLimit+.02){q.stats.masked++;continue;}').replace('cover,mangrove?wear:moisture,','cover,mangrove?(wear>.25||edgeWear>.27?.06:wear):moisture,');await route.fulfill({response,body});});
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

 await page.evaluate(()=>{globalThis.qaFernHomeTarget=qaCampaignWorld.controls.target.toArray();globalThis.qaFernHomeCamera=qaSandPath[1];});
 for(const phase of phases){
  for(const [step,offset]of [0,0].entries()){
   const r=await page.evaluate(async({phase,offset,step})=>{
    const w=qaCampaignWorld;w.state.time=phase==='day'?150:350;w.state.day=1;w.controls.target.fromArray(qaFernHomeTarget);w.controls.target.x+=offset;w.camera.position.fromArray(qaFernHomeCamera);w.camera.position.x+=offset;if(offset){const delta=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9-w.controls.target.y;w.controls.target.y+=delta;w.camera.position.y+=delta;}w.groundDetails.timeOverride=2;if(step===1){w.renderOrigin.update({x:w.controls.target.x+288,z:w.controls.target.z});w.renderOrigin.update(w.controls.target);w.releaseNativeShadow.cache.invalidate();}w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();
    const {prepareInitialFarWorld}=await import('/src/app/far-world-loading.js');await prepareInitialFarWorld(w);
    let stable=0,last='',start=performance.now();while(stable<45){await new Promise(requestAnimationFrame);w.render(0);const sig=JSON.stringify([w.renderer.info.render.calls,w.renderer.info.render.triangles]);stable=!(w.farVegetation?.adapters??[]).some(a=>a.preparationPending())&&sig===last?stable+1:0;last=sig;if(performance.now()-start>120000)throw Error('Quality transition did not settle');}
    return {offset,origin:[w.renderOrigin.x,w.renderOrigin.z],chunks:[...w.chunks.keys()].sort(),coverageChunks:[...w.groundDetails.chunks.keys()].sort(),elapsed:w.state.elapsed,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),coverage:w.groundDetails.audit(),shadows:{enabled:w.renderer.shadowMap.enabled,mapSize:w.sun.shadow.mapSize.toArray(),allocated:w.sun.shadow.map?[w.sun.shadow.map.width,w.sun.shadow.map.height]:null,on:w.toon.shadowUniforms.uNativeShadowOn.value},memory:{...w.renderer.info.memory},calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,glError:w.renderer.getContext().getError(),data:w.renderer.domElement.toDataURL('image/png').split(',')[1]};
   },{phase,offset,step});
   if(r.glError||errors.length)throw Error(JSON.stringify({r,errors}));
   await writeFile(`${out}/${phase}-${step}-${offset}.png`,Buffer.from(r.data,'base64'));delete r.data;records.push({phase,step,...r});await writeFile(out+'/streaming.json',JSON.stringify({records,errors},null,2));console.log(phase,step,offset,'captured');
  }
 }
 await page.close();
 }}finally{await browser.close()}
