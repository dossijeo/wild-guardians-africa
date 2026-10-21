import {installEnginePackedRoute} from './qa-engine-packed-route.mjs';
import {installWildRendererRoute} from './qa-wild-renderer-route.mjs';
import {installRiverWearRoute} from './river-wear-qa-route.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out=process.env.WR_OUT??'docs/qa/wild-renderer/performance';await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'baja').split(','))for(const biome of (process.env.WG_REVIEW_BIOMES??'sabana').split(','))for(const variant of (process.env.WR_ORDER??'base,combined,combined,base').split(',')){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];await installWildRendererRoute(page);if(variant==='engine'||variant==='engine-events'||variant==='engine-selection')await installEnginePackedRoute(page);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 if(biome==='gran-rio')await installRiverWearRoute(page);
 if(biome==='gran-canon')await page.route('**/content/ground-materials.json*',async route=>{const response=await route.fetch(),tiles=await response.json();if(tiles.canyons.scale!==.2)throw Error('Unexpected canyon scale');tiles.canyons.scale=.08;await route.fulfill({response,json:tiles});});
 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 await page.goto('http://127.0.0.1:5192/?qa-seed=712'+'&visualLab=global-lighting&sandRelief=1');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.state.elapsed=2;w.simElapsed=2;w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});




 await page.evaluate(async({biome,variant})=>{
 const w=window.qaCampaignWorld;w.assetGroups.qaInstanceCull=variant!=='unculled';w.assetGroups.qaCullUploadGate=false;if(variant==='engine-events'||variant==='engine-selection')w.assetGroups.qaWildRenderer=await(await import('/src/rendering/wild-renderer/engine-events.js')).createEngineEventsWildRenderer(w.state,()=>{w.propSuppressionSource=null;});else if(variant==='engine')w.assetGroups.qaWildRenderer=await(await import('/src/rendering/wild-renderer/engine-packed.js')).createEnginePackedWildRenderer(()=>w.nav.suppressed);else if(variant==='events')w.assetGroups.qaWildRenderer=await(await import('/src/rendering/wild-renderer/event-lifecycle.js')).createEventLifecycleWildRenderer();else if(variant==='incremental')w.assetGroups.qaWildRenderer=await(await import('/src/rendering/wild-renderer/incremental.js')).createIncrementalWildRenderer();else if(variant==='combined')w.assetGroups.qaWildRenderer=await(await import('/src/rendering/wild-renderer/adapter.js')).createWildRenderer();
 if(variant==='engine-selection')w.assetGroups.qaWildRenderer.effectiveSelection=true;
 if(biome==='sabana')w.controls.target.set(135,9.400129699707032,45);
 if(biome==='gran-rio')w.controls.target.set(87.83156862745099,7.077262442364413,15.827254901960785);
 if(biome==='gran-canon')await(await import('/tools/experiments/qa-water-view.js')).focusWater(w);
 {
  if(biome==='sabana'||biome==='gran-rio'){
   await(await import(biome==='sabana'?'/tools/experiments/qa-continuous-grass-occupancy.js':'/tools/experiments/qa-continuous-grass-river.js')).applyMaterialStudy(w,'C');
   w.qaContinuousGrass.timeOverride=2;w.qaContinuousGrass.uniforms.uCoverageWindStrength.value=8;
  }
  if(biome==='gran-canon')(await import('/tools/experiments/qa-canyon-warm-floor-streaming.js')).applyMaterialStudy(w);
  if(biome==='manglares')(await import('/tools/experiments/qa-mangrove-mud-moss-toon-interior.js')).applyMaterialStudy(w);
 }
 },{biome,variant});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;const o=w.controls.target.toArray();window.qaSandPath=[[22,16,18],[12,5,18],[-18,9,22]].map(([x,y,z])=>[o[0]+x,Math.max(o[1]+y,w.nav.field.surface(o[0]+x,o[2]+z)+1.2),o[2]+z]);w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();});

  if(process.env.WR_DENSE==='1')await page.evaluate(async()=>await(await import('/tools/experiments/qa-wild-renderer-dense.js')).installDenseFixture(window.qaCampaignWorld));
  if(process.env.WR_FIXED_RESIDENCY==='1')await page.evaluate(async()=>await(await import('/tools/experiments/qa-wild-renderer-fixed-residency.js')).installFixedResidency(window.qaCampaignWorld));
  if(process.env.WR_DRAW_TRACE==='1')await page.evaluate(async()=>{(await import('/tools/experiments/qa-wild-renderer-draw-trace.js')).installDrawTrace(window.qaCampaignWorld);});
  let mutations=null;if(process.env.WR_MUTATE==='1')mutations=await page.evaluate(async()=>await(await import('/tools/experiments/qa-wild-renderer-mutations.js')).exerciseRendererMutations(window.qaCampaignWorld));
  if(process.env.WR_MUTATE_ONLY==='1'){if(!mutations)throw Error('Mutation-only mode requires WR_MUTATE');await writeFile(out+'/'+variant+'-mutations.json',JSON.stringify(mutations,null,2));if(errors.length)throw Error(JSON.stringify(errors));await page.close();continue;}
  if(process.env.WR_STREAM_ONLY==='1'){const streaming=await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.state.time=150;return await(await import('/tools/experiments/qa-wild-renderer-streaming.js')).measureStreamingSweep(w);});if(errors.length)throw Error(JSON.stringify(errors));records.push({biome,quality,variant,streaming,errors});await writeFile(out+'/streaming.json',JSON.stringify({seed:712,records},null,2));console.log('streaming',variant,streaming.completed.length);await page.close();continue;}
  for(const phase of phases){
   const dir=`${out}/${biome}-${quality}-${variant}-${phase}`;await mkdir(dir,{recursive:true});const frames=[];
   await page.evaluate(async phase=>{const w=window.qaCampaignWorld;w.state.time=phase==='day'?150:350;w.state.day=1;w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();for(const group of w.chunks.values())for(const batch of group.userData.lodBatches??[])batch.key=null;w.render(1/30);await Promise.all([...w.objects.values()].map(o=>o.userData.actorReady).filter(Boolean));for(let i=0;i<12;i++)w.render(1/30)},phase);

   const png=await page.evaluate(()=>{const w=window.qaCampaignWorld;w.render(1/30);return w.renderer.domElement.toDataURL('image/png').split(',')[1]});await writeFile(dir+'/scene.png',Buffer.from(png,'base64'));
   const screenshot=`captures/${String(records.length).padStart(2,'0')}-${variant}-${phase}.png`;await mkdir(out+'/captures',{recursive:true});await writeFile(out+'/'+screenshot,Buffer.from(png,'base64'));
   if(process.env.WR_CAPTURE_ONLY==='1'){if(errors.length)throw Error(JSON.stringify(errors));records.push({biome,quality,variant,phase,screenshot});await writeFile(out+'/captures.json',JSON.stringify({seed:712,records},null,2));continue;}
   if(errors.length)throw Error('Before measurement: '+JSON.stringify(errors));
   const result=await page.evaluate(async()=>{const {measureCampaign}=await import('/tools/experiments/qa-wild-renderer-measure.js');const w=window.qaCampaignWorld,dense=!!w.qaDenseFixture;const gpu=await measureCampaign(w,{gpuEnabled:true,samples:dense?120:180,warmup:180});const cadence=await measureCampaign(w,{samples:dense?180:360,warmup:180});return {fixedResidency:w.qaFixedResidency??null,fixture:w.qaDenseFixture??null,gpu,cadence,target:w.controls.target.toArray(),time:w.state.time,elapsed:w.state.elapsed};});
   if(errors.length||result.gpu.glError||result.cadence.glError||!result.gpu.stateUnchanged||!result.cadence.stateUnchanged)throw Error('Invalid campaign block '+JSON.stringify({errors,gpuState:result.gpu.stateUnchanged,cadenceState:result.cadence.stateUnchanged}));
   records.push({biome,quality,variant,phase,instanceCulling:variant!=='unculled',screenshot,mutations,diagnosticDrawTrace:process.env.WR_DRAW_TRACE==='1',...result,errors:[...errors]});await writeFile(out+'/benchmarks.json',JSON.stringify({seed:712,note:'unculled disables only experimental color-instance frustum culling; base enables it in JS; combined uses WASM packing; persistent variants may skip unchanged uploads. Coverage C wind8 unchanged; fresh pages in WR_ORDER, GPU and cadence sampled separately. Deterministic camera sweep indexed by frame, paused simulation. No capture during measurement.',records},null,2)+'\n');console.log(quality,biome,variant,phase,'GPU',result.gpu.gpu.samples.length,'cadence',result.cadence.frames.length);

  }
 await page.close();
 }}finally{await browser.close()}
