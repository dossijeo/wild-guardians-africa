import {disableIntegratedDesertLight} from './desert-light-qa-route.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';


const study=process.env.WG_GRASS_STUDY??'desert-continuous-radiance';const out=process.env.WG_GRASS_OUTPUT??'docs/qa/global-visual-lab/desert-continuous-radiance/dunes';await mkdir(out,{recursive:true});const records=[],transitions=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const biome of (process.env.WG_GRASS_BIOMES??'desierto').split(','))for(const variant of ['base','candidate']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});



 if(process.env.WG_DESERT_LIGHT_COMPARE==='1'?variant==='base':study==='desert-soft-light')await disableIntegratedDesertLight(page);
 await page.addInitScript(()=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',farVegetation:false})));
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&visualLab=global-lighting');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'qa-visual');w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});
 {const offset=(process.env.WG_CAMPAIGN_TARGET_OFFSET??'50,30').split(',').map(Number);if(offset.length!==2||offset.some(v=>!Number.isFinite(v)))throw Error('WG_CAMPAIGN_TARGET_OFFSET requires x,z');await page.evaluate(([x,z])=>{const w=window.qaCampaignWorld;w.controls.target.x+=x;w.controls.target.z+=z;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;},offset);}
 const selected=process.env.WG_DESERT_LIGHT_COMPARE==='1'?null:variant==='candidate'?study:process.env.WG_GRASS_BASELINE;if(selected)await page.evaluate(async study=>{const {applyMaterialStudy}=await import('/tools/experiments/qa-'+study+'.js');await applyMaterialStudy(window.qaCampaignWorld)},selected);
 for(const [view,offset] of (process.env.WG_GRASS_DETAIL==='1'?[['detail',[3,2,4]]]:[['settlement',[22,16,18]],['overview',[32,26,32]],['low',[14,8,14]]]).filter(([view])=>!process.env.WG_GRASS_VIEWS||process.env.WG_GRASS_VIEWS.split(',').includes(view))){
 await page.evaluate(async({view,offset})=>{const w=window.qaCampaignWorld;if(view==='detail'){const x=w.controls.target.x+28,z=w.controls.target.z+16;const p=[...w.groundDetails.chunks.values()].flat().sort((a,b)=>(a.x-x)**2+(a.z-z)**2-((b.x-x)**2+(b.z-z)**2))[0];w.controls.target.set(p.x,p.y+.2,p.z);}w.camera.position.copy(w.controls.target).add({x:offset[0],y:offset[1],z:offset[2]});w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();w.render(.016);},{view,offset});
  for(const phase of ['day','night']){
   await page.evaluate(phase=>{const w=window.qaCampaignWorld;w.state.day=1;w.state.time=phase==='day'?150:350;w.render(.016);},phase);await page.waitForTimeout(1000);
   const info=await page.evaluate(phase=>{const w=window.qaCampaignWorld;w.state.day=phase==='dawn'?2:1;w.state.time=({day:150,dusk:300.25,night:350,dawn:.25})[phase];w.render(.016);return {glError:w.renderer.getContext().getError(),meshCount:w.groundDetails.mesh?.count??0,vertices:w.groundDetails.geometry?.attributes.position.count??0,tufts:w.groundDetails.count,capacity:w.groundDetails.mesh?.instanceMatrix.count??0,night:w.toon.uniforms.uNight.value,nightLight:w.toon.uniforms.uNightLight.value,day:w.state.day,calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,textures:w.renderer.info.memory.textures,seed:712,time:w.state.time,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),quality:w.quality,structures:w.state.structures.length,plants:w.state.plants.length,chunks:w.chunks.size}},phase);
   const file=`${biome}-${variant}-${view}-${phase}.png`;{const data=await page.evaluate(()=>{const w=window.qaCampaignWorld;w.render(.016);return w.renderer.domElement.toDataURL('image/png').split(',')[1]});await writeFile(`${out}/${file}`,Buffer.from(data,'base64'));}records.push({biome,variant,view,phase,file,...info,errors:[...errors]});
  }
 }
 await page.close();await writeFile(`${out}/${process.env.WG_GRASS_DETAIL==='1'?'detail-captures':'captures'}.json`,JSON.stringify({note:'Real campaign launched from menu; QA observation hook and pause; fixed time; no added entities.',records},null,2)+'\n');console.log(biome,variant);
}}finally{await browser.close()}
