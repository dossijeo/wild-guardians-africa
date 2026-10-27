import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const out=process.env.WG_WORKER_OUT??'docs/qa/mangrove-magic-20261026/worker-crossing/validated',fixture=JSON.parse(await readFile('docs/qa/mangrove-magic-20261026/worker-crossing/fixture.json','utf8'));
await mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:out+'/raw',size:{width:1280,height:720}}}),page=await context.newPage(),errors=[],report={scope:fixture.scope,samples:[]};
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('this.raycaster=new','globalThis.qaWorkerWorld=this;this.raycaster=new')});});
 await page.addInitScript(f=>{localStorage.setItem('wild-guardians:slot:'+f.slotId,f.snapshot);localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',music:0,sfx:0}));},fixture);
 await page.goto((process.env.WG_QA_URL??'http://127.0.0.1:5220')+'/?qa-visibility',{timeout:90000});const menu=page.frameLocator('#native-menu');await menu.locator('#loading').waitFor({state:'hidden',timeout:90000});await menu.getByRole('button',{name:'Continuar',exact:true}).click();await menu.locator('[data-production-save="'+fixture.slotId+'"]').click();await page.waitForFunction(()=>document.querySelector('#stage')?.getAttribute('aria-busy')==='false',null,{timeout:180000});
 if(await page.locator('.tutorial-close:visible').count())await page.locator('.tutorial-close:visible').first().click();
 await page.evaluate(()=>{const w=qaWorkerWorld;w.cinematic=true;const p=w.state.workers[0];w.controls.target.set(p.x,w.nav.workerSurface(p.x,p.z),p.z);w.camera.position.set(p.x+15,w.controls.target.y+20,p.z+22);w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld(true);});
 const end=Date.now()+180000;let wetCaptured=false;
 while(Date.now()<end){
  const s=await page.evaluate(()=>{const w=qaWorkerWorld,p=w.state.workers[0],plant=w.state.plants[0],actor=w.objects.get(p.id);const dx=p.x-w.controls.target.x,dz=p.z-w.controls.target.z;w.controls.target.x=p.x;w.controls.target.z=p.z;w.camera.position.x+=dx;w.camera.position.z+=dz;w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld(true);w.syncChunks();return {elapsed:w.state.elapsed,worker:structuredClone(p),water:w.nav.field.waterInfo(p.x,p.z).inside,plant:structuredClone(plant),visual:actor?{position:actor.position.toArray(),visible:actor.visible}:null,runtime:w.spatialSession.runtime,pauses:w.state.pauses};});report.samples.push(s);
  if(s.water&&!wetCaptured){await page.screenshot({path:out+'/worker-on-water.png'});wetCaptured=true;}
  if(s.plant.water[0].status==='manual')break;
  await page.waitForTimeout(200);
 }
 await page.screenshot({path:out+'/worker-final.png'});report.wetSamples=report.samples.filter(s=>s.water).length;report.watered=report.samples.at(-1).plant.water[0].status==='manual';assert(report.wetSamples>0,'Worker never observed on water');assert(report.watered,'Worker never completed crop watering');assert.deepEqual(errors,[]);report.ok=true;
}catch(e){report.ok=false;report.failure=String(e);process.exitCode=1;await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}finally{report.errors=errors;await writeFile(out+'/renderer.json',JSON.stringify(report,null,2));await context.close();await page.video().saveAs(out+'/worker-crossing.webm');await browser.close();console.log(JSON.stringify({ok:report.ok,failure:report.failure,wetSamples:report.wetSamples,watered:report.watered}));}
