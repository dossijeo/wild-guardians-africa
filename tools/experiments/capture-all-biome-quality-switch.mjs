import {installMangroveHeightBlendRoute} from './qa-mangrove-height-blend-route.mjs';
import {installRiverCoverPaletteRoute} from './qa-river-cover-palette-route.mjs';
import {installRiverWearRoute} from './river-wear-qa-route.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/all-biome-quality-switch-settled';await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const biome of (process.env.WG_REVIEW_BIOMES??'sabana,gran-rio,gran-canon,manglares,volcanes,desierto').split(','))for(const variant of (process.env.WG_REVIEW_VARIANTS??'combined').split(',')){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message)});page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text())){errors.push(m.text());console.error(m.text())}});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 if(biome==='gran-rio')await installRiverCoverPaletteRoute(page,variant==='combined');
 if(biome==='gran-canon')await page.route('**/content/ground-materials.json*',async route=>{const response=await route.fetch(),tiles=await response.json();if(tiles.canyons.scale!==.2)throw Error('Unexpected canyon scale');tiles.canyons.scale=.08;await route.fulfill({response,json:tiles});});
 if(variant==='base')await installMangroveHeightBlendRoute(page,{height:true,calibrated:true,linearSoil:true,toonSoil:true,skipUnusedLighting:true});
 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712'+'&visualLab=global-lighting&sandRelief=1'+(variant==='combined'?'&mangroveSubstrate=full':''));
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state||window.qaCampaignWorld?.shaderFailure?.current,null,{timeout:60000});
 await page.evaluate(()=>{const f=window.qaCampaignWorld?.shaderFailure?.current;if(f)throw Error(JSON.stringify(f.details));});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});




 await page.evaluate(async({biome,variant})=>{
 const w=window.qaCampaignWorld;
 if(biome==='sabana')w.controls.target.set(135,9.400129699707032,45);
 if(biome==='gran-rio')w.controls.target.set(87.83156862745099,7.077262442364413,15.827254901960785);
 if(biome==='gran-canon')await(await import('/tools/experiments/qa-water-view.js')).focusWater(w);
 {
  if(biome==='sabana'||biome==='gran-rio'){
   await(await import(biome==='sabana'?'/tools/experiments/qa-continuous-grass-occupancy.js':'/tools/experiments/qa-continuous-grass-river.js')).applyMaterialStudy(w,'C');
   w.qaContinuousGrass.timeOverride=2;w.qaContinuousGrass.uniforms.uCoverageWindStrength.value=8;
  }
  if(biome==='gran-canon')(await import('/tools/experiments/qa-canyon-warm-floor-streaming.js')).applyMaterialStudy(w);
  if(biome==='manglares'&&variant==='base')(await import('/tools/experiments/qa-mangrove-mud-moss-toon-interior.js')).applyMaterialStudy(w);
 }
 },{biome,variant});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;const o=w.controls.target.toArray();window.qaSandPath=[[22,16,18],[6,34,6],[-18,9,22]].map(([x,y,z])=>[o[0]+x,Math.max(o[1]+y,w.nav.field.surface(o[0]+x,o[2]+z)+1.2),o[2]+z]);w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();});

  for(const phase of phases){
   for(const [step,nextQuality] of ['media','muy_baja','baja','media'].entries()){
    const row=await page.evaluate(async({phase,step,nextQuality,biome})=>{
     const w=window.qaCampaignWorld;w.state.time=phase==='day'?150:350;w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();
     const mud=[...w.chunks.values()].flatMap(g=>g.children.filter(m=>m.userData.globalMudBlend));
     const before=mud.map(m=>m.material),geometries=mud.map(m=>m.geometry.uuid),disposed=before.map(()=>0);
     before.forEach((m,i)=>m.addEventListener('dispose',()=>disposed[i]++));
     w.qualitySetting(nextQuality);for(let i=0;i<30;i++)w.render(1/30);
     const glError=w.renderer.getContext().getError();if(glError)throw Error('GL '+glError);
     if(w.shaderFailure?.current)throw Error(JSON.stringify(w.shaderFailure.current));
     if((biome==='manglares'&&!mud.length)||mud.some(m=>!!m.material.isMeshBasicMaterial!==(nextQuality==='muy_baja')))throw Error('Mud quality mismatch');
     if(mud.some((m,i)=>m.geometry.uuid!==geometries[i]))throw Error('Geometry rebuilt');
     for(let i=0;i<mud.length;i++)if(disposed[i]!==Number(mud[i].material!==before[i]))throw Error('Material lifetime mismatch');
     return {biome,phase,step,quality:nextQuality,mudCount:mud.length,disposed,types:mud.map(m=>m.material.type),masks:w.biomeGround.masks.size,memory:{...w.renderer.info.memory},glError,calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,data:w.renderer.domElement.toDataURL('image/png').split(',')[1]};
    },{phase,step,nextQuality,biome});
    await writeFile(`${out}/${biome}-${phase}-${step}-${nextQuality}.png`,Buffer.from(row.data,'base64'));delete row.data;records.push(row);
    if(errors.length)throw Error(errors.join('\n'));
    await writeFile(out+'/captures.json',JSON.stringify({seed:712,resolution:[1280,720],records,errors},null,2)+'\n');console.log(biome,phase,step,nextQuality,'quality checked');
   }
  }
 await page.close();
 }}finally{await browser.close()}
