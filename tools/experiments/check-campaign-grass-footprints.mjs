import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';


const study=process.env.WG_GRASS_STUDY??'grass-streaming';const out=process.env.WG_GRASS_OUTPUT??'docs/qa/global-visual-lab/grass-campaign';await mkdir(out,{recursive:true});const records=[],transitions=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const biome of (process.env.WG_GRASS_BIOMES??'sabana,gran-rio').split(','))for(const variant of ['candidate']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});



 await page.addInitScript(()=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',farVegetation:false})));
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&visualLab=global-lighting');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'qa-visual');w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});
 await page.evaluate(async study=>{const {applyMaterialStudy}=await import('/tools/experiments/qa-'+study+'.js');await applyMaterialStudy(window.qaCampaignWorld)},study);
 const result=await page.evaluate(async()=>{
 const w=window.qaCampaignWorld,{footprintDistance}=await import('/src/world/footprints.js');
 const {residentWearSampler}=await import('/tools/experiments/qa-ground-detail-mask.js');
 let wornCandidates=0;for(const [key,points] of w.groundDetails.chunks){const wear=residentWearSampler(w,...key.split(',').map(Number));wornCandidates+=points.filter(p=>wear(p.x,p.z)>.27).length;}
 const positions=[...w.groundDetails.chunks.values()].flat(),obstacles=w.nav.obstacles.filter(o=>o.kind!=='shield');
 const overlaps=positions.filter(p=>obstacles.some(o=>o.footprint?footprintDistance(o.footprint,p.x,p.z)<.65:Math.hypot(p.x-o.x,p.z-o.z)<(o.radius??0)+.65));
 const wetCandidates=positions.filter(p=>w.nav.field.waterInfo(p.x,p.z).inside).length,steepCandidates=positions.filter(p=>w.nav.field.slope(p.x,p.z)>.42).length;
 if(wetCandidates||steepCandidates)throw Error('Grass overlaps fluid or steep terrain');
 if(wornCandidates)throw Error('Grass overlaps worn ground');
 if(overlaps.length)throw Error('Grass overlaps building footprints');
 return {wetCandidates,steepCandidates,wornCandidates,candidates:positions.length,obstacles:obstacles.length,overlaps:overlaps.map(p=>({x:p.x,z:p.z})),fieldConstructor:w.nav.field.constructor.name};
 });records.push({biome,...result});await page.close();console.log(biome,result.overlaps.length);
 }await writeFile(out+'/footprint-audit.json',JSON.stringify(records,null,2)+'\n');}finally{await browser.close()}
