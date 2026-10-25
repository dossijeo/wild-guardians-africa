import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/grass-wind-preserved';await mkdir(out,{recursive:true});const records=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_POM_QUALITY??'media,baja').split(','))for(const biome of ['sabana']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'qa-visual');w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});


 if(process.env.WG_POM_APPEND==='1'){const old=JSON.parse(await readFile(out+'/captures-'+quality+'.json','utf8'));records.push(...old.records);}
 const origin=await page.evaluate(()=>window.qaCampaignWorld.controls.target.toArray());
 for(const view of ['close','game']){
 await page.evaluate(async({view,origin})=>{const w=window.qaCampaignWorld;w.controls.target.fromArray(origin);if(view==='close'){w.controls.target.x+=25;w.controls.target.z+=15;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.15;}const offset=view==='close'?[3,2,4]:[22,16,18];w.camera.position.copy(w.controls.target).add({x:offset[0],y:offset[1],z:offset[2]});w.syncChunks();await w.horizon.whenReady();await w.whenChunksReady();w.render(.016);},{view,origin});
 for(const phase of ['day','night'])for(const variant of (process.env.WG_POM_VARIANTS??'reference,static,wind2,reference2').split(',')){
 const audit=await page.evaluate(async({variant,phase})=>{const w=window.qaCampaignWorld;w.state.time=phase==='day'?150:350;const {applyMaterialStudy}=await import('/tools/experiments/qa-grass-wind.js');return await applyMaterialStudy(w,variant);},{variant,phase});
 await page.waitForTimeout(1200);
 const result=await page.evaluate(async()=>{const w=window.qaCampaignWorld,r=w.renderer;let shaderAudit=null;if(w.groundDetails.material.userData.qaWindStatic){const THREE=await import('/node_modules/three/build/three.module.js');const q=w.qaGrassWind,m=w.groundDetails.material;const make=()=>({vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}});const a=make(),b=make();q.compileBase.call(m,a,r);q.compileWind(b,r);shaderAudit={vertexIdentical:a.vertexShader===b.vertexShader,fragmentIdentical:a.fragmentShader===b.fragmentShader,nativeLighting:b.fragmentShader.includes('artLighting416'),nativeShadows:b.fragmentShader.includes('nativeShadowOcclusion')};if(!Object.values(shaderAudit).every(Boolean))throw Error('Static wind must preserve native shader');}const auto=r.info.autoReset;r.info.autoReset=false;r.info.reset();w.render(.016);const info={shaderAudit,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),time:w.state.time,quality:w.quality,sun:w.toon.uniforms.uLightDir.value.toArray(),night:w.toon.uniforms.uNight.value,calls:r.info.render.calls,triangles:r.info.render.triangles,geometries:r.info.memory.geometries,textures:r.info.memory.textures,structures:w.state.structures.length,plants:w.state.plants.length,chunks:w.chunks.size,tufts:w.groundDetails.count};r.info.autoReset=auto;return {info,data:r.domElement.toDataURL('image/png').split(',')[1]};});
 const file=`${quality}-${view}-${phase}-${variant}.png`;await writeFile(out+'/'+file,Buffer.from(result.data,'base64'));records.push({file,view,phase,variant,quality,...result.info,audit,errors:[...errors]});await writeFile(out+'/captures-'+quality+'.json',JSON.stringify({seed:712,resolution:[1280,720],note:'Actual menu-started campaign, default rendering, paused simulation; all variants share the same world and cameras. Full-frame renderer counters.',records:records.filter(r=>r.quality===quality)},null,2)+'\n');console.log(file,result.info.calls,result.info.triangles,errors.length);
 }
 }
 await page.close();
}}finally{await browser.close()}
