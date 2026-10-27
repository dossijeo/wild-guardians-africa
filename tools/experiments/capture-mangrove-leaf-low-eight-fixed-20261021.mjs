import {installMossTwoScales} from './qa-moss-two-scales-20261021.mjs';
import {installMossSampleGate} from './qa-moss-sample-gate-20261021.mjs';
import {installMossOrientations} from './qa-moss-orientations-20261021.mjs';
import {installRiverYardIslands} from './qa-river-yard-islands.mjs';
import {installMangroveHeightBlendRoute} from './qa-mangrove-height-blend-route.mjs';
import {installRiverSoilLayerV2Route} from './qa-river-soil-layer-v2-route.mjs';
import {installRiverCoverPaletteRoute} from './qa-river-cover-palette-route.mjs';
import {installRiverWearRoute} from './river-wear-qa-route.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/mangrove-leaf-low-eight-fixed-20261021';await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'baja').split(','))for(const biome of (process.env.WG_REVIEW_BIOMES??'manglares').split(','))for(const variant of ['base','combined']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 if(biome==='gran-rio'){await installRiverSoilLayerV2Route(page,false);await installRiverYardIslands(page);await page.addInitScript(()=>globalThis.qaRiverWindPadding=true);}

 if(biome==='gran-canon')await page.route('**/content/ground-materials.json*',async route=>{const response=await route.fetch(),tiles=await response.json();if(tiles.canyons.scale!==.2)throw Error('Unexpected canyon scale');tiles.canyons.scale=.08;await route.fulfill({response,json:tiles});});
 await installMossTwoScales(page);
 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712'+'&visualLab=global-lighting&sandRelief=1'+'&volcanicAsh=mask&volcanicRock=layered&canyonShadows=horizon&riverSoil=1&mangroveSubstrate=full'+(variant==='combined'?'&canyonSand=full':'&canyonSand=1'));
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.state.elapsed=2;w.simElapsed=2;w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});




 await page.evaluate(async({biome,variant})=>{
 const w=window.qaCampaignWorld;window.qaOriginalDetailLayer=w.groundDetails;window.qaOriginalDetailMethods=Object.fromEntries(['chunk','release','flush','markDirtyAt','dispose'].map(k=>[k,w.groundDetails[k]]));
 if(biome==='manglares')await(await import(variant==='base'?'/tools/experiments/qa-mangrove-leaf-stream-20261021.js':'/tools/experiments/qa-mangrove-leaf-low-eight-20261021.js')).applyMaterialStudy(w,'C');
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
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;const o=w.controls.target.toArray();window.qaSandPath=[[22,16,18],[6,34,6],[-18,9,22]].map(([x,y,z])=>[o[0]+x,Math.max(o[1]+y,w.nav.field.surface(o[0]+x,o[2]+z)+1.2),o[2]+z]);w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();});

 await page.evaluate(async variant=>{const w=window.qaCampaignWorld;w.render(1/30);const tiles=[...w.qaContinuousGrass.tiles.values()].sort((a,b)=>b.items.length-a.items.length||a.tx-b.tx||a.tz-b.tz);if(!tiles[0]?.items.length)throw Error('No leaf region');const t=tiles[0];w.controls.target.set(52,0,28);w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.4;const o=w.controls.target.toArray();window.qaSandPath=[[12,12,14],[4,26,4],[-5,2.5,5]].map(([x,y,z])=>[o[0]+x,Math.max(o[1]+y,w.nav.field.surface(o[0]+x,o[2]+z)+1.2),o[2]+z]);},variant);
  for(const phase of phases){
   const dir=`${out}/${biome}-${quality}-${variant}-${phase}`;await mkdir(dir,{recursive:true});const frames=[];
   await page.evaluate(async phase=>{const w=window.qaCampaignWorld;w.state.time=phase==='day'?150:350;w.state.day=1;w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();for(const group of w.chunks.values())for(const batch of group.userData.lodBatches??[])batch.key=null;w.render(1/30);await Promise.all([...w.objects.values()].map(o=>o.userData.actorReady).filter(Boolean));for(let i=0;i<12;i++)w.render(1/30)},phase);
   for(let i=0;i<3;i++){
    const frame=await page.evaluate(async i=>{const w=window.qaCampaignWorld;w.camera.position.fromArray(window.qaSandPath[i]);w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();w.render(1/30);return {i,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),time:w.state.time,glError:w.renderer.getContext().getError(),coverage:w.qaContinuousGrass?.audit()??null,calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,data:w.renderer.domElement.toDataURL('image/png').split(',')[1]}},i);
    if(frame.glError)throw Error('WebGL error '+frame.glError);await writeFile(`${dir}/${String(i).padStart(4,'0')}.png`,Buffer.from(frame.data,'base64'));delete frame.data;frames.push(frame);
   }
   if(errors.length)throw Error(errors.join('\n'));records.push({biome,quality,variant,phase,initialLodReset:true,frames,errors:[...errors]});await writeFile(out+'/captures.json',JSON.stringify({study:'Low-leaf coverage: coverage-mask growth versus coverage and wear growth',seed:712,resolution:[1280,720],views:['game','elevated','reverse'],note:'Real paused campaign settlement, seed 712; identical poses and visual time, settled chunks. Static artistic review, not a performance benchmark.',records},null,2)+'\n');console.log(biome,quality,variant,phase,'captured');
  }
 if(variant==='combined')await writeFile(out+'/streaming.json',JSON.stringify(await page.evaluate(async()=>{const w=window.qaCampaignWorld,q=w.qaContinuousGrass,steps=[],origin=w.controls.target.clone();
 for(const offset of [0,96,192,96,0]){w.controls.target.set(origin.x+offset,origin.y,origin.z);w.camera.position.set(origin.x+offset+12,origin.y+16,origin.z+18);w.syncChunks();await w.horizon.whenReady();await w.whenChunksReady();w.render(1/30);const resident=[...w.chunks.keys()].sort(),coverage=[...q.chunks.keys()].sort();if(JSON.stringify(resident)!==JSON.stringify(coverage))throw Error('Stale coverage chunks');steps.push({offset,resident,coverage,tiles:q.tiles.size,audit:q.audit(),geometries:w.renderer.info.memory.geometries,textures:w.renderer.info.memory.textures,glError:w.renderer.getContext().getError()});}
 q.markDirtyAt();w.groundDetails.flush(w.nav.field,w.state);if(q.occupancyDirty)throw Error('Invalidation not flushed');q.dispose();if(w.groundDetails!==window.qaOriginalDetailLayer)throw Error('Detail layer replaced');for(const [k,v]of Object.entries(window.qaOriginalDetailMethods))if(w.groundDetails[k]!==v)throw Error('Method not restored '+k);w.render(1/30);return {steps,disposed:q.disposed,remainingCoverageChunks:q.chunks.size,remainingTiles:q.tiles.size,originalLayerRestored:true,glError:w.renderer.getContext().getError()};}),null,2)+'\n');
 await page.close();
 }}finally{await browser.close()}
