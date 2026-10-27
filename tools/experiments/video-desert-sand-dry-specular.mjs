import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/desert-aerial-sand/dry-specular/motion';await mkdir(out,{recursive:true});const records=[];
const phases=(process.env.WG_SAND_PHASES??'day,night').split(',');
if(process.env.WG_SAND_APPEND==='1')records.push(...JSON.parse(await readFile(out+'/captures.json','utf8')).records.filter(r=>!((process.env.WG_COVER_QUALITY??'media,baja').split(',').includes(r.quality)&&phases.includes(r.phase))));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media,baja').split(','))for(const biome of ['desierto']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&visualLab=global-lighting');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'qa-visual');w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});




 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;const o=w.controls.target.toArray();window.qaSandPath=Array.from({length:121},(_,i)=>{const t=i<=60?i/60:(120-i)/60,u=t*t*(3-2*t);const x=o[0]+22-40*u,z=o[2]+18+4*u;return [x,Math.max(o[1]+16-6*u,w.nav.field.surface(x,z)+1.2),z];});w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();});
 await page.evaluate(async()=>{await(await import('/tools/experiments/qa-desert-aerial-sand-normal-only.js')).applyMaterialStudy(window.qaCampaignWorld)});
 for(const variant of ['base','candidate']){
  if(variant==='candidate')await page.evaluate(async()=>{await(await import('/tools/experiments/qa-desert-sand-dry-specular.js')).applyMaterialStudy(window.qaCampaignWorld,{prepared:true})});
  for(const phase of phases){
   const dir=`${out}/${quality}-${variant}-${phase}`;await mkdir(dir,{recursive:true});const frames=[];
   await page.evaluate(async phase=>{const w=window.qaCampaignWorld;w.state.time=phase==='day'?150:350;w.state.day=1;w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();for(const group of w.chunks.values())for(const batch of group.userData.lodBatches??[])batch.key=null;w.render(1/30);await Promise.all([...w.objects.values()].map(o=>o.userData.actorReady).filter(Boolean));for(let i=0;i<12;i++)w.render(1/30)},phase);
   for(let i=0;i<121;i++){
    const frame=await page.evaluate(async i=>{const w=window.qaCampaignWorld;w.camera.position.fromArray(window.qaSandPath[i]);w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();w.render(1/30);return {i,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),time:w.state.time,glError:w.renderer.getContext().getError(),calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,data:w.renderer.domElement.toDataURL('image/png').split(',')[1]}},i);
    if(frame.glError)throw Error('WebGL error '+frame.glError);await writeFile(`${dir}/${String(i).padStart(4,'0')}.png`,Buffer.from(frame.data,'base64'));delete frame.data;frames.push(frame);
   }
   if(errors.length)throw Error(errors.join('\n'));records.push({quality,variant,phase,initialLodReset:true,frames,errors:[...errors]});await writeFile(out+'/captures.json',JSON.stringify({reference:"normal-only",candidate:"dry-specular",seed:712,resolution:[1280,720],fps:30,note:'Real deterministic renderer frames after waiting for horizon/chunks at each pose, offline encoding; not measured realtime FPS. QA path uses terrain surface to keep camera clear.',records},null,2)+'\n');console.log(quality,variant,phase,'captured');
  }
 }
 await page.close();
 }}finally{await browser.close()}
