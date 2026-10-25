import {disableIntegratedCanyon} from './canyon-qa-route.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const integrated=true;
const out='docs/qa/global-visual-lab/canyon-warm-floor/streaming/control';await mkdir(out,{recursive:true});const records=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const biome of ['gran-canon'])for(const variant of ['base']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});


 await page.addInitScript(()=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',farVegetation:false})));
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&visualLab=global-lighting');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'qa-visual');w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});
 await page.evaluate(async()=>{const {focusWater}=await import('/tools/experiments/qa-water-view.js');await focusWater(window.qaCampaignWorld);const w=window.qaCampaignWorld;w.camera.position.set(w.controls.target.x+22,w.controls.target.y+10,w.controls.target.z);w.render(.016)});
 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});

 const result=await page.evaluate(async()=>{
  const w=window.qaCampaignWorld,origin=w.controls.target.clone(),oldMethod=w.toon.material,records=[];
  const pose=async dz=>{w.controls.target.copy(origin);w.controls.target.z+=dz;w.camera.position.copy(w.controls.target).add({x:12,y:18,z:18});w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();w.state.time=150;w.render(.016);};
  const image=()=>{w.render(.016);return w.renderer.domElement.toDataURL('image/png').split(',')[1]};
  await pose(0);const before=image();const {applyMaterialStudy}=await import('/tools/experiments/qa-canyon-warm-floor-streaming.js');const q={audit:()=>({control:true,bound:0}),setEnabled(){},dispose(){}};
  // Unpatched round trip control.
  for(const dz of [0,144,-144,0]){await pose(dz);const a=q.audit();records.push({dz,audit:a,chunks:[...w.chunks.keys()],camera:w.camera.position.toArray(),glError:w.renderer.getContext().getError(),image:image()});}
  q.setEnabled(false);const disabled=image();q.setEnabled(true);const enabled=image();q.dispose();const restored=image();
  if(w.toon.material!==oldMethod||w.qaWarmFloor)throw Error('Failed lifecycle restoration');
  return {records,before,disabled,enabled,restored,restoredMethod:true,remainingBindings:q.audit().bound,glError:w.renderer.getContext().getError()};
 });
 for(const name of ['before','disabled','enabled','restored']){await writeFile(out+'/'+name+'.png',Buffer.from(result[name],'base64'));delete result[name];}
 for(let i=0;i<result.records.length;i++){const r=result.records[i];await writeFile(out+'/step-'+i+'.png',Buffer.from(r.image,'base64'));delete r.image;}
 await writeFile(out+'/audit.json',JSON.stringify({result,errors},null,2)+'\n');console.log(JSON.stringify({steps:result.records.map(r=>({dz:r.dz,...r.audit})),errors,remaining:result.remainingBindings}));await page.close();
 }}finally{await browser.close()}
