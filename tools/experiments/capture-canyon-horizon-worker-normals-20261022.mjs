import {installSkyDepth} from './qa-sky-horizon-cloud-mask-20261021.mjs';
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


const out='docs/qa/global-visual-lab/canyon-horizon-worker-normals-20261022';await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const biome of (process.env.WG_REVIEW_BIOMES??'sabana,gran-rio,gran-canon,manglares,volcanes,desierto').split(','))for(const variant of ['baseline','depth']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 if(biome==='gran-rio'){await installRiverSoilLayerV2Route(page,false);await installRiverYardIslands(page);await page.addInitScript(()=>globalThis.qaRiverWindPadding=true);}

 if(biome==='gran-canon')await page.route('**/content/ground-materials.json*',async route=>{const response=await route.fetch(),tiles=await response.json();if(tiles.canyons.scale!==.2)throw Error('Unexpected canyon scale');tiles.canyons.scale=.08;await route.fulfill({response,json:tiles});});
 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 if(biome==='manglares')await installMossTwoScales(page);
 if(biome==='sabana')await installGrassPigmentLod(page);
 if(biome==='gran-rio')await installRiverLod(page);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712'+'&visualLab=global-lighting&sandRelief=1&sandWear=residual'+'&volcanicAsh=mask&volcanicRock=layered&volcanicNight=spectrum&canyonShadows=horizon&riverSoil=1&mangroveSubstrate=full'+'&canyonSand=full'+(variant==='depth'?'&canyonNormals=smooth':'')+(biome==='desierto'?'&sandMeso=1':''));
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
   await(await import(biome==='sabana'?'/tools/experiments/qa-continuous-grass-occupancy.js':'/tools/experiments/qa-continuous-grass-river.js')).applyMaterialStudy(w,'C');
   w.qaContinuousGrass.timeOverride=2;w.qaContinuousGrass.uniforms.uCoverageWindStrength.value=8;
  }
  if(biome==='gran-canon')(await import('/tools/experiments/qa-canyon-warm-floor-streaming.js')).applyMaterialStudy(w);

 }
 },{biome,variant});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;const o=w.controls.target.toArray();window.qaHomeTarget=o;window.qaSandPath=[[22,16,18],[6,34,6],[-18,9,22]].map(([x,y,z])=>[o[0]+x,Math.max(o[1]+y,w.nav.field.surface(o[0]+x,o[2]+z)+1.2),o[2]+z]);w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();});

  for(const phase of phases){
   const dir=`${out}/${biome}-${quality}-${variant}-${phase}`;await mkdir(dir,{recursive:true});const frames=[];
   await page.evaluate(async phase=>{const w=window.qaCampaignWorld;w.state.time=phase==='day'?150:350;w.state.day=1;w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();for(const group of w.chunks.values())for(const batch of group.userData.lodBatches??[])batch.key=null;w.render(1/30);await Promise.all([...w.objects.values()].map(o=>o.userData.actorReady).filter(Boolean));for(let i=0;i<12;i++)w.render(1/30)},phase);
   for(let i=0;i<3;i++){
    const frame=await page.evaluate(async i=>{const w=window.qaCampaignWorld;const o=window.qaHomeTarget,shift=i===1?192:0;const z=o[2]+i*48,field=w.nav.field;w.controls.target.set(field.riverX(z+160),field.riverLevel+1,z+160);w.camera.position.set(field.riverX(z)+12,field.riverLevel+9,z);w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();for(const group of w.chunks.values())for(const batch of group.userData.lodBatches??[])batch.key=null;for(let n=0;n<12;n++)w.render(1/30);const bankStats={bytes:0,vertices:0,meshes:0,seamPairs:0,maxSeamError:0};const seen=new Map();
for(const [key,g]of w.chunks){const origin=g.userData.nativeChunkOrigin;g.traverse(m=>{const bank=m.geometry?.attributes.qaBank,p=m.geometry?.attributes.position;if(!bank||!p)return;bankStats.meshes++;bankStats.bytes+=bank.array.byteLength;bankStats.vertices+=bank.count;for(let v=0;v<p.count;v++){const id=(p.getX(v)+origin[0]).toFixed(4)+','+(p.getZ(v)+origin[1]).toFixed(4),prior=seen.get(id);if(prior&&prior.key!==key){bankStats.seamPairs++;bankStats.maxSeamError=Math.max(bankStats.maxSeamError,Math.abs(prior.a-bank.getX(v)),Math.abs(prior.b-bank.getY(v)));}else if(!prior)seen.set(id,{key,a:bank.getX(v),b:bank.getY(v)});}});}
const far=w.horizon.group?.children.find(m=>m.userData.nativeHorizon==='water');const farBank=far?.geometry.attributes.qaBank;bankStats.horizonBytes=farBank?.array.byteLength??0;bankStats.horizonVertices=farBank?.count??0;return {i,normalBuild:w.horizon.normalBuild,workerActive:!!w.horizon.generator.worker,bankStats,origin:{x:w.renderOrigin.x,z:w.renderOrigin.z,revision:w.renderOrigin.revision},chunks:[...w.chunks.keys()].sort(),camera:w.camera.position.toArray(),target:w.controls.target.toArray(),time:w.state.time,glError:w.renderer.getContext().getError(),coverage:w.qaContinuousGrass?.audit()??null,calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,data:w.renderer.domElement.toDataURL('image/png').split(',')[1]}},i);
    if(frame.glError)throw Error('WebGL error '+frame.glError);await writeFile(`${dir}/${String(i).padStart(4,'0')}.png`,Buffer.from(frame.data,'base64'));delete frame.data;frames.push(frame);
   }
   if(errors.length)throw Error(errors.join('\n'));records.push({biome,quality,variant,phase,initialLodReset:true,frames,errors:[...errors]});await writeFile(out+'/captures.json',JSON.stringify({study:'Canyon horizon averaged normal isolation over V11 composition; no timing claim.',seed:712,resolution:[1280,720],views:['river-z+0','river-z+48','river-z+96'],note:'Real paused campaign settlement, seed 712; identical poses and visual time, settled chunks. Static artistic review, not a performance benchmark.',records},null,2)+'\n');console.log(biome,quality,variant,phase,'captured');
  }
 await page.close();
 }}finally{await browser.close()}
