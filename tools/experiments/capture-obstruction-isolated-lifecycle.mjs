import {installObstructionBlendRoute} from './qa-obstruction-blend-route.mjs';
import {installInstanceFrustumRoute} from './qa-asset-instance-frustum-route.mjs';
import {installRiverWearRoute} from './river-wear-qa-route.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/obstruction-isolated-lifecycle-v2';await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'baja').split(','))for(const biome of (process.env.WG_REVIEW_BIOMES??'sabana').split(','))for(const variant of ['base','combined']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];await page.route('**/src/rendering/asset-groups.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace("fade.name='native-obstruction-blend';","fade.userData.qaDepthSource=base;fade.name='native-obstruction-blend';");await route.fulfill({response,body});});
 await page.route('**/src/app/main.js*',async route=>{const response=await route.fetch();const body=await response.text();const anchor='requestAnimationFrame(frame);';if(!body.includes(anchor))throw Error('Main frame anchor missing');await route.fulfill({response,body:body.replace(anchor,anchor+'if(globalThis.qaManualMotion)return;')});});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 if(variant==='combined'&&biome==='gran-rio')await installRiverWearRoute(page);
 if(variant==='combined'&&biome==='gran-canon')await page.route('**/content/ground-materials.json*',async route=>{const response=await route.fetch(),tiles=await response.json();if(tiles.canyons.scale!==.2)throw Error('Unexpected canyon scale');tiles.canyons.scale=.08;await route.fulfill({response,json:tiles});});
 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712'+'&visualLab=global-lighting&sandRelief=1');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{globalThis.qaManualMotion=true;const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});




 await page.evaluate(async({biome,variant})=>{
 (await import(variant==='combined'?'/tools/experiments/qa-isolated-fade-depth-pooled.js':'/tools/experiments/qa-isolated-fade-depth.js')).installIsolatedFadeDepth(window.qaCampaignWorld);
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
   await page.evaluate(async phase=>{const w=window.qaCampaignWorld;w.state.time=phase==='day'?150:350;w.state.day=1;w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();for(const group of w.chunks.values())for(const batch of group.userData.lodBatches??[]){batch.key=null;if(batch.fade)batch.fade.fresh=true;}w.render(1/30);await Promise.all([...w.objects.values()].map(o=>o.userData.actorReady).filter(Boolean));for(let i=0;i<12;i++)w.render(1/30)},phase);
   for(const i of Array.from({length:36},(_,i)=>i)){
    if(i===12)await page.setViewportSize({width:960,height:540});if(i===24)await page.setViewportSize({width:1280,height:720});
    const frame=await page.evaluate(async i=>{const w=window.qaCampaignWorld;(await import('/tools/experiments/qa-savanna-camera-sweep.js')).placeCamera(w,i/35);w.qaContinuousGrass.timeOverride=2+i/12;w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();w.render(1/30);return {opacities:[...w.assetGroups.colors.values()].flatMap(g=>(g.smoothFades??[]).filter(f=>f.visible).map(f=>Array.from(f.geometry.getAttribute("nativeVisibility")?.array??[]))),isolated:w.qaIsolatedFadeDepth?.audit()??null,partial:[...w.assetGroups.colors.values()].reduce((n,g)=>n+(g.smoothFades??[]).filter(f=>f.visible).length,0),samples:w.renderer.getContext().getParameter(w.renderer.getContext().SAMPLES),i,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),time:w.state.time,glError:w.renderer.getContext().getError(),windTime:w.qaContinuousGrass.timeOverride,coverage:w.qaContinuousGrass?.audit()??null,calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,data:w.renderer.domElement.toDataURL('image/png').split(',')[1]}},i);
    if(frame.glError)throw Error('WebGL error '+frame.glError);await writeFile(`${dir}/${String(i).padStart(4,'0')}.png`,Buffer.from(frame.data,'base64'));delete frame.data;frames.push(frame);
   }
   if(errors.length)throw Error(errors.join('\n'));records.push({biome,quality,variant,phase,initialLodReset:true,frames,errors:[...errors]});await writeFile(out+'/captures.json',JSON.stringify({study:'Smooth FrontSide versus per-object isolated nearest-surface depth',seed:712,resolution:[1280,720],views:['game','oblique','reverse'],note:'Real paused campaign settlement, seed 712; identical poses and visual time, settled chunks. Sequential 36-pose camera sweep, dt 1/30 per step; offline capture is not presentation timing or a performance benchmark.',records},null,2)+'\n');console.log(biome,quality,variant,phase,'captured');
  }
 if(variant==='combined'){
 const lifecycle=await page.evaluate(async()=>{const w=window.qaCampaignWorld,old=w.qaIsolatedFadeDepth;w.render(0);const before=old.audit();old.trim();const trimmed=old.audit();w.render(0);const baseline=w.renderer.domElement.toDataURL('image/png').split(',')[1];old.dispose();old.dispose();const disposed=old.audit();const installed=(await import('/tools/experiments/qa-isolated-fade-depth-pooled.js')).installIsolatedFadeDepth(w);w.render(0);return {before,trimmed,disposed,reinstalled:installed.audit(),glError:w.renderer.getContext().getError(),baseline,after:w.renderer.domElement.toDataURL('image/png').split(',')[1]};});
 for(const k of ['baseline','after']){await writeFile(`${out}/lifecycle-${k}.png`,Buffer.from(lifecycle[k],'base64'));delete lifecycle[k];}await writeFile(out+'/lifecycle.json',JSON.stringify(lifecycle,null,2)+'\n');
 }
 await page.close();
 }}finally{await browser.close()}
