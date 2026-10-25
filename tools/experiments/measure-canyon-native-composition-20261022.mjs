import {installSkyEnvironmentPalette} from './qa-sky-environment-palette-20261022.mjs';
import {installSkyReflectionLatitude} from './qa-sky-reflection-latitude-20261022.mjs';
import {installSkyDepth} from './qa-sky-cloud-latitude-subtle-20261022.mjs';
import {installGrassPigmentLod} from './qa-grass-pigment-lod-20261021.mjs';
import {installGrassPigmentLod as installRiverLod} from './qa-river-night-ambient-strong-20261021.mjs';
import {installMossTwoScales} from './qa-moss-two-scales-20261021.mjs';
import {installRiverYardIslands} from './qa-river-yard-islands.mjs';
import {installMangroveHeightBlendRoute} from './qa-mangrove-height-blend-route.mjs';
import {installRiverSoilLayerV2Route} from './qa-river-soil-layer-v2-route.mjs';
import {installRiverCoverPaletteRoute} from './qa-river-cover-palette-route.mjs';
import {installRiverWearRoute} from './river-wear-qa-route.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out=process.env.WG_BENCH_OUT??'docs/qa/global-visual-lab/canyon-native-composition-cost-20261022';await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const biome of (process.env.WG_REVIEW_BIOMES??'gran-canon').split(','))for(const variant of ['base','combined','base','combined']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 if(biome==='gran-rio'){await installRiverSoilLayerV2Route(page,false);await installRiverYardIslands(page);await page.addInitScript(()=>globalThis.qaRiverWindPadding=true);}

 if(biome==='gran-canon')await page.route('**/content/ground-materials.json*',async route=>{const response=await route.fetch(),tiles=await response.json();if(![.2,.08].includes(tiles.canyons.scale))throw Error('Unexpected canyon scale');tiles.canyons.scale=.08;await route.fulfill({response,json:tiles});});
 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 if(biome==='manglares')await installMossTwoScales(page);
 if(biome==='sabana'&&variant==='qa')await installGrassPigmentLod(page);
 if(biome==='gran-rio'&&variant==='qa')await installRiverLod(page);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712'+'&visualLab=global-lighting&skyAtmosphere=clouds&sandRelief=1&sandWear=residual'+'&volcanicAsh=mask&volcanicRock=layered&volcanicNight=spectrum&canyonShadows=horizon&riverSoil=1&mangroveSubstrate=full'+'&canyonSand=full'+'&canyonFloor=warm'+(variant==='combined'?'&canyonSandBlend=soft&canyonNormals=smooth':''));
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.state.elapsed=2;w.simElapsed=2;w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});




 await page.evaluate(async({biome,variant})=>{
 const w=window.qaCampaignWorld;
 if(biome==='manglares'){await(await import('/tools/experiments/qa-mangrove-leaf-stream-20261021.js')).applyMaterialStudy(w,'C');w.qaContinuousGrass.timeOverride=2;}
 if(biome==='sabana')w.controls.target.set(135,9.400129699707032,45);
 if(biome==='gran-rio')w.controls.target.set(87.83156862745099,7.077262442364413,15.827254901960785);
 if(biome==='gran-canon')await(await import('/tools/experiments/qa-water-view.js')).focusWater(w);
 {
  if(biome==='sabana'||biome==='gran-rio'){
   if(variant==='qa')await(await import(biome==='sabana'?'/tools/experiments/qa-continuous-grass-occupancy.js':'/tools/experiments/qa-continuous-grass-river.js')).applyMaterialStudy(w,'C');
   w.groundDetails.timeOverride=2;w.groundDetails.uniforms.uCoverageWindStrength.value=8;
  }
  if(biome==='gran-canon'&&variant==='qa')(await import('/tools/experiments/qa-canyon-warm-floor-streaming.js')).applyMaterialStudy(w);

 }
 },{biome,variant});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;const o=w.controls.target.toArray();window.qaSandPath=[[22,16,18],[6,34,6],[-18,9,22]].map(([x,y,z])=>[o[0]+x,Math.max(o[1]+y,w.nav.field.surface(o[0]+x,o[2]+z)+1.2),o[2]+z]);w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();});

  for(const phase of phases){
   const dir=`${out}/${biome}-${quality}-${variant}-${phase}`;await mkdir(dir,{recursive:true});const frames=[];
   await page.evaluate(async phase=>{const w=window.qaCampaignWorld;w.state.time=phase==='day'?150:350;w.state.day=1;w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();for(const group of w.chunks.values())for(const batch of group.userData.lodBatches??[])batch.key=null;w.render(1/30);await Promise.all([...w.objects.values()].map(o=>o.userData.actorReady).filter(Boolean));for(let i=0;i<12;i++)w.render(1/30)},phase);
   const result=await page.evaluate(async()=>{
    const w=window.qaCampaignWorld,{measureCampaign}=await import('/tools/experiments/qa-campaign-frame-measure.js');
    const original=w.render;let index=0;const base=window.qaSandPath[0];
    const moving=function(...args){const t=index++/149*Math.PI*2;w.camera.position.set(base[0]+Math.sin(t)*4,base[1],base[2]+(Math.cos(t)-1)*4);return original.apply(this,args);};
    try{w.render=moving;const gpu=await measureCampaign(w,{gpuEnabled:true,samples:90,warmup:60});index=0;w.render=moving;const cadence=await measureCampaign(w,{samples:90,warmup:60});return {gpu,cadence};}finally{w.render=original;}
   });
   if(errors.length)throw Error(errors.join('\n'));records.push({variant,phase,...result,errors:[...errors]});await writeFile(out+'/benchmarks.json',JSON.stringify({seed:712,note:'QA/native/QA/native, media, identical 4-unit moving camera path, warm baseline versus soft sand + smooth horizon normals, 60 warmup + 90 samples; GPU query and cadence measured separately. Paused simulation, resident scene; not streaming latency.',records},null,2));console.log(variant,phase,'measured');
  }
 await page.close();
 }}finally{await browser.close()}
