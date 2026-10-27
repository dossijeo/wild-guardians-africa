import {installRiverCoverPaletteRoute} from './qa-river-cover-palette-route.mjs';
import {installRiverWearRoute} from './river-wear-qa-route.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/river-cover-palette';await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of ['baja','media'])for(const biome of ['gran-rio'])for(const variant of ['base','combined']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 await installRiverCoverPaletteRoute(page,variant==='combined');
 if(variant==='combined'&&biome==='gran-canon')await page.route('**/content/ground-materials.json*',async route=>{const response=await route.fetch(),tiles=await response.json();if(tiles.canyons.scale!==.2)throw Error('Unexpected canyon scale');tiles.canyons.scale=.08;await route.fulfill({response,json:tiles});});
 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712'+'&visualLab=global-lighting&sandRelief=1');
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
  if(variant==='combined'&&biome==='manglares')(await import('/tools/experiments/qa-mangrove-mud-moss-toon-interior.js')).applyMaterialStudy(w);
 }
 },{biome,variant});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;const o=w.controls.target.toArray();window.qaSandPath=[[22,16,18],[12,5,18],[-18,9,22]].map(([x,y,z])=>[o[0]+x,Math.max(o[1]+y,w.nav.field.surface(o[0]+x,o[2]+z)+1.2),o[2]+z]);w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();});

  for(const phase of phases){
   const dir=`${out}/${biome}-${quality}-${variant}-${phase}`;await mkdir(dir,{recursive:true});const frames=[];
   await page.evaluate(async phase=>{const w=window.qaCampaignWorld;w.state.time=phase==='day'?150:350;w.state.day=1;w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();for(const group of w.chunks.values())for(const batch of group.userData.lodBatches??[])batch.key=null;w.render(1/30);await Promise.all([...w.objects.values()].map(o=>o.userData.actorReady).filter(Boolean));for(let i=0;i<12;i++)w.render(1/30)},phase);
   for(let i=0;i<3;i++){
    const frame=await page.evaluate(async i=>{const w=window.qaCampaignWorld;w.camera.position.fromArray(window.qaSandPath[i]);w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();w.render(1/30);return {i,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),time:w.state.time,glError:w.renderer.getContext().getError(),coverage:w.qaContinuousGrass?.audit()??null,calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,data:w.renderer.domElement.toDataURL('image/png').split(',')[1]}},i);
    if(frame.glError)throw Error('WebGL error '+frame.glError);await writeFile(`${dir}/${String(i).padStart(4,'0')}.png`,Buffer.from(frame.data,'base64'));delete frame.data;frames.push(frame);
   }
   if(errors.length)throw Error(errors.join('\n'));records.push({biome,quality,variant,phase,initialLodReset:true,frames,errors:[...errors]});await writeFile(out+'/captures.json',JSON.stringify({study:'River wear feather retained on both; ground-aligned foliage pigment and daylight candidate',seed:712,resolution:[1280,720],views:['game','oblique','reverse'],note:'Real paused campaign settlement, seed 712; identical poses and visual time, settled chunks. Static artistic review, not a performance benchmark.',records},null,2)+'\n');console.log(biome,quality,variant,phase,'captured');
  }
 await page.close();
 }}finally{await browser.close()}
