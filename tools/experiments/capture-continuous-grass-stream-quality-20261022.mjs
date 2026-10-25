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


const out='docs/qa/global-visual-lab/continuous-grass-stream-quality-20261022';await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const biome of (process.env.WG_REVIEW_BIOMES??'sabana').split(','))for(const variant of ['native']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 if(biome==='gran-rio'){await installRiverSoilLayerV2Route(page,false);await installRiverYardIslands(page);await page.addInitScript(()=>globalThis.qaRiverWindPadding=true);}

 if(biome==='gran-canon')await page.route('**/content/ground-materials.json*',async route=>{const response=await route.fetch(),tiles=await response.json();if(tiles.canyons.scale!==.2)throw Error('Unexpected canyon scale');tiles.canyons.scale=.08;await route.fulfill({response,json:tiles});});
 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 if(biome==='manglares')await installMossTwoScales(page);
 if(biome==='sabana'&&variant==='qa')await installGrassPigmentLod(page);
 if(biome==='gran-rio')await installRiverLod(page);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712'+'&visualLab=global-lighting&skyAtmosphere=clouds&sandRelief=1&sandWear=residual'+'&volcanicAsh=mask&volcanicRock=layered&volcanicNight=spectrum&canyonShadows=horizon&riverSoil=1&mangroveSubstrate=full'+'&canyonSand=full'+(variant==='native'?'&grassCoverage=continuous':''));
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
   if(variant==='qa')await(await import('/tools/experiments/qa-continuous-grass-occupancy.js')).applyMaterialStudy(w,'C');
   w.groundDetails.timeOverride=2;w.groundDetails.uniforms.uCoverageWindStrength.value=8;
  }
  if(biome==='gran-canon')(await import('/tools/experiments/qa-canyon-warm-floor-streaming.js')).applyMaterialStudy(w);

 }
 },{biome,variant});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;const o=w.controls.target.toArray();window.qaSandPath=[[22,16,18],[6,34,6],[-18,9,22]].map(([x,y,z])=>[o[0]+x,Math.max(o[1]+y,w.nav.field.surface(o[0]+x,o[2]+z)+1.2),o[2]+z]);w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();});

  for(const phase of phases){
   const rows=[];
   for(const quality of ['media','baja','muy_baja','media']){
    const index=rows.length;
    const row=await page.evaluate(async({phase,quality,index})=>{
     const w=window.qaCampaignWorld,q=w.groundDetails;w.qualitySetting(quality);w.state.time=phase==='day'?150:350;w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();for(let n=0;n<6;n++)w.render(1/30);
     return {quality,index,audit:q.audit(),visible:q.group.visible,calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,gl:w.renderer.getContext().getError(),data:w.renderer.domElement.toDataURL('image/png').split(',')[1]};
    },{phase,quality,index});
    if(row.gl)throw Error('GL quality error');if(quality==='muy_baja'&&row.visible)throw Error('Very-low coverage still visible');
    await writeFile(`${out}/${phase}-quality-${index}-${quality}.png`,Buffer.from(row.data,'base64'));delete row.data;rows.push(row);
   }
   const motion=[];
   for(const offset of [0,24,48,72,96,72,48,24,0]){
    const row=await page.evaluate(async offset=>{
     const w=window.qaCampaignWorld,q=w.groundDetails;w.controls.target.x=135+offset;w.camera.position.fromArray(window.qaSandPath[0]);w.camera.position.x+=offset;w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();for(let n=0;n<3;n++)w.render(1/30);
     const orphanChunks=[...q.chunks.keys()].filter(k=>!w.chunks.has(k)),orphanTiles=[...q.tiles.values()].filter(t=>!q.chunks.has(t.chunk));
     return {offset,audit:q.audit(),residentChunks:w.chunks.size,orphanChunks,orphanTiles:orphanTiles.length,geometries:w.renderer.info.memory.geometries,textures:w.renderer.info.memory.textures,gl:w.renderer.getContext().getError(),data:w.renderer.domElement.toDataURL('image/png').split(',')[1]};
    },offset);
    if(row.gl||row.orphanChunks.length||row.orphanTiles)throw Error('Streaming ownership failure');
    await writeFile(`${out}/${phase}-motion-${motion.length}.png`,Buffer.from(row.data,'base64'));delete row.data;motion.push(row);
   }
   const projection=await page.evaluate(()=>{
    const w=window.qaCampaignWorld,q=w.groundDetails;w.camera.fov=65;w.camera.updateProjectionMatrix();w.render(0);w.render(0);const automatic=q.audit();const image=w.renderer.domElement.toDataURL();const buffers=()=>q.meshes.map(e=>Object.fromEntries(['coverageAnchor','coverageData','coverageSlope'].map(k=>[k,Array.from(e.mesh.geometry.attributes[k].array)])));const before=buffers();q.dirty=true;w.render(0);const forced=q.audit();const equal=image===w.renderer.domElement.toDataURL();w.camera.fov=42;w.camera.updateProjectionMatrix();return {automatic,forced,equal,buffersEqual:JSON.stringify(before)===JSON.stringify(buffers()),beforeImage:image,afterImage:w.renderer.domElement.toDataURL()};
   });
   for(const key of ['beforeImage','afterImage']){await writeFile(`${out}/${phase}-projection-${key}.png`,Buffer.from(projection[key].split(',')[1],'base64'));delete projection[key];}
   if(!projection.buffersEqual)throw Error('Projection selection buffers differ');
   records.push({phase,rows,motion,projection,errors:[...errors]});await writeFile(out+'/results.json',JSON.stringify(records,null,2));if(errors.length)throw Error(errors.join('\n'));console.log(phase,'quality, streaming ownership and projection buffers passed');
  }
 await page.close();
 }}finally{await browser.close()}
