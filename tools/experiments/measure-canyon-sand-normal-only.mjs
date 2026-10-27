import {installCanyonSandMapsRoute} from './qa-canyon-sand-maps-route.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/canyon-sand-normal-only/moving-performance';await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of ['baja'])for(const biome of ['gran-canon'])for(const variant of ['original','candidate','candidate','original']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 await installCanyonSandMapsRoute(page,variant==='candidate',{drySand:true,normalOnly:true});
 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712'+'&visualLab=global-lighting');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
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
 }
 },{biome,variant});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;const o=w.controls.target.toArray();window.qaSandPath=[[22,16,18],[38,34,28],[-18,16,22]].map(([x,y,z])=>[o[0]+x,Math.max(o[1]+y,w.nav.field.surface(o[0]+x,o[2]+z)+1.2),o[2]+z]);w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();});

  for(const phase of phases){
   const dir=`${out}/${biome}-${quality}-${variant}-${phase}`;await mkdir(dir,{recursive:true});const frames=[];
   await page.evaluate(async phase=>{const w=window.qaCampaignWorld;w.state.time=phase==='day'?150:350;w.state.day=1;w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();for(const group of w.chunks.values())for(const batch of group.userData.lodBatches??[])batch.key=null;w.render(1/30);await Promise.all([...w.objects.values()].map(o=>o.userData.actorReady).filter(Boolean));for(let i=0;i<12;i++)w.render(1/30)},phase);
   const result=await page.evaluate(async()=>{const {measureCampaign}=await import('/tools/experiments/qa-obstruction-moving-measure.js');const w=window.qaCampaignWorld;const {updateObstructions}=await import('/src/rendering/obstruction.js');updateObstructions(w.chunks,w.camera,w.controls.target,0,{enabled:w.obstructionEnabled!==false,snap:true});const gpu=await measureCampaign(w,{gpuEnabled:true,samples:120});const cadence=await measureCampaign(w,{samples:180});return {gpu,cadence,target:w.controls.target.toArray(),time:w.state.time};});
   if(errors.length||result.gpu.glError||result.cadence.glError||!result.gpu.stateUnchanged||!result.cadence.stateUnchanged)throw Error('Invalid measurement');
   records.push({biome,quality,variant,phase,...result,errors:[...errors]});await writeFile(out+'/benchmarks.json',JSON.stringify({seed:712,note:'Canyon gravel vs normal-only dry sand complete recipe. Fresh pages ABBA; paused simulation, deterministic moving camera; GPU and cadence separate.',records},null,2)+'\n');console.log(quality,variant,phase,'GPU',result.gpu.gpu.samples.length);

  }
 await page.close();
 }}finally{await browser.close()}
