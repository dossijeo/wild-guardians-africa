import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/continuous-grass-lifecycle';await mkdir(out,{recursive:true});const records=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media,baja').split(','))for(const biome of (process.env.WG_COVER_BIOMES??'sabana,gran-rio').split(',')){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&visualLab=global-lighting');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'qa-visual');w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});




 const result=await page.evaluate(async()=>{
  const w=window.qaCampaignWorld,biome=w.state.biome;
  const origin=biome==='sabana'?[135,9.400129699707032,45]:[87.83156862745099,7.077262442364413,15.827254901960785];
  w.controls.target.fromArray(origin);w.camera.position.set(origin[0]+22,origin[1]+16,origin[2]+18);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();w.state.time=150;w.render(.016);
  const apply=(await import(biome==='sabana'?'/tools/experiments/qa-continuous-grass-occupancy.js':'/tools/experiments/qa-continuous-grass-river.js')).applyMaterialStudy;
  const original=w.scene.onBeforeRender,cycles=[],images=[];
  for(let cycle=0;cycle<3;cycle++){
   await apply(w,'C');const q=w.qaContinuousGrass;q.timeOverride=2.5;w.state.time=150;w.render(.016);
   const audit=q.audit();if(!audit.active||audit.triangles===0||q.uniforms.uCoverageWindStrength.value!==8)throw Error('Coverage/wind missing');
   const active={...w.renderer.info.memory};
   for(const phase of ['day','night']){w.state.time=phase==='day'?150:350;w.render(.016);images.push({cycle,phase,data:w.renderer.domElement.toDataURL('image/png').split(',')[1]});}
   q.dispose();q.dispose();w.render(.016);
   const closed={referenceRemoved:!w.qaContinuousGrass,hookRestored:w.scene.onBeforeRender===original,detached:q.group.parent===null,enabled:w.groundDetails.enabled,memory:{...w.renderer.info.memory},glError:w.renderer.getContext().getError()};
   cycles.push({cycle,audit,active,closed});
   if(!closed.referenceRemoved||!closed.hookRestored||!closed.detached||closed.enabled||closed.glError) return {cycles,images,failure:'Teardown invariants failed'};
  }
  // A foreign wrapper must survive disposal of the coverage hook it wraps.
  await apply(w,'C');const q=w.qaContinuousGrass,inner=w.scene.onBeforeRender;let calls=0;const outer=function(...args){calls++;inner.apply(this,args)};w.scene.onBeforeRender=outer;q.dispose();w.render(.016);
  const chained={preserved:w.scene.onBeforeRender===outer,called:calls>0,glError:w.renderer.getContext().getError()};w.scene.onBeforeRender=original;
  if(!chained.preserved||!chained.called||chained.glError)throw Error('Foreign render callback damaged');
  return {cycles,images,chained};
 });
 for(const im of result.images)await writeFile(`${out}/${biome}-${quality}-${im.cycle}-${im.phase}.png`,Buffer.from(im.data,'base64'));
 delete result.images;result.errors=errors;await writeFile(`${out}/${biome}-${quality}.json`,JSON.stringify(result,null,2)+'\n');
 if(result.failure||errors.length)throw Error(result.failure??errors.join('\n'));
 console.log(biome,quality,'verified');await page.close();
 }}finally{await browser.close()}
