import {globalNativeQuery} from './global-native-recipe-20261022.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/mangrove-leaf-cupped-cost-20261022';await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'baja').split(','))for(const biome of (process.env.WG_REVIEW_BIOMES??'manglares').split(','))for(const [run,variant] of ['original','cupped','original','cupped'].entries()){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();const body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('Observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});
 if(variant==='cupped')await page.route('**/src/rendering/continuous-grass.js*',async route=>{const response=await route.fetch();let body=await response.text();for(const [a,b]of [["mangrove-leaf-fill-20261021/modules.json","mangrove-leaf-cupped-20261022/modules.json"],["const modules=mangrove&&!cupped?prepareMangroveLeaves(raw):raw;","const modules=raw;"],["triangles:q.near*(mangrove?32:60)+q.far*8","triangles:q.meshes.reduce((n,e)=>n+e.mesh.geometry.index.count/3*e.mesh.geometry.instanceCount,0)"]]){if(body.includes(a))body=body.replace(a,b);else if(!body.includes(b))throw Error('Folded leaf QA anchor missing');}await route.fulfill({response,body});});
 await page.route('**/src/app/main.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('} catch(e){if(loadingToken===loadingGeneration)', '} catch(e){globalThis.qaFarLoadError=String(e.stack??e);if(loadingToken===loadingGeneration)');await route.fulfill({response,body});});
 await page.route('**/src/rendering/shader-failure.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('throw failure.current;', 'globalThis.qaShaderFailure=failure.current.details;throw failure.current;');await route.fulfill({response,body});});
 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:true})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&spatialFar=1&'+'farTransitions=smooth&'+globalNativeQuery+'&waterPalette=regional&riverBank=soil&mangroveShore=sediment'+'&waterEdges=natural');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000}).catch(e=>{throw Error(errors.join('\n')+'\n'+e.message)});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.state.elapsed=2;w.simElapsed=2;w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});




 await page.evaluate(({biome,canyonTarget})=>{
 const w=window.qaCampaignWorld;
 if(biome==='sabana')w.controls.target.set(135,9.400129699707032,45);
 if(biome==='gran-rio')w.controls.target.set(87.83156862745099,7.077262442364413,15.827254901960785);
 if(biome==='gran-canon')w.controls.target.fromArray(canyonTarget);
 if(biome==='gran-rio'){const z=102;w.controls.target.set(w.nav.field.riverX(z),w.nav.field.riverLevel,z);}

 if(biome==='manglares'){const f=w.nav.field,o=w.controls.target.clone();let best=null;for(let z=-100;z<=100;z+=2)for(let x=-100;x<=100;x+=2){const px=o.x+x,pz=o.z+z,info=f.waterInfo(px,pz);if(info.inside&&(!best||x*x+z*z<best.d))best={x:px,z:pz,d:x*x+z*z};}if(best)w.controls.target.set(best.x,f.surface(best.x,best.z)+.9,best.z);}
 if(w.groundDetails.audit)w.groundDetails.timeOverride=2;
 },{biome,canyonTarget:[-47.868919372558594, 3.259999895095825, 102]});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.controls.target.z+=192;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;const o=w.controls.target.toArray();window.qaSandPath=[[22,16,18],[6,34,6],[-18,9,22]].map(([x,y,z])=>[o[0]+x,Math.max(o[1]+y,w.nav.field.surface(o[0]+x,o[2]+z)+1.2),o[2]+z]);w.camera.position.fromArray(window.qaSandPath[2]);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();});

 await page.evaluate(async()=>{const w=window.qaCampaignWorld;for(const pose of window.qaSandPath){w.camera.position.fromArray(pose);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();let stable=0,last='',start=performance.now();while(stable<45){await new Promise(r=>requestAnimationFrame(r));w.render(0);const sig=JSON.stringify([w.renderer.info.render.calls,w.renderer.info.render.triangles]);stable=!w.farVegetation.adapters.some(a=>a.preparationPending())&&sig===last?stable+1:0;last=sig;if(performance.now()-start>90000)throw Error('Warm traversal timeout');}}});
  for(const phase of phases){
   const dir=`${out}/${biome}-${quality}-${variant}-${run}-${phase}`;await mkdir(dir,{recursive:true});const frames=[];
   await page.evaluate(async phase=>{const w=window.qaCampaignWorld;w.state.time=phase==='day'?150:350;w.state.day=1;w.camera.position.fromArray(window.qaSandPath[2]);w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();for(const group of w.chunks.values())for(const batch of group.userData.lodBatches??[])batch.key=null;w.render(1/30);await Promise.all([...w.objects.values()].map(o=>o.userData.actorReady).filter(Boolean));for(let i=0;i<12;i++)w.render(1/30)},phase);
   const readiness=await page.evaluate(async()=>{
 const w=window.qaCampaignWorld,start=performance.now();let stable=0,last='';
 while(stable<45){
  await new Promise(resolve=>requestAnimationFrame(resolve));w.render(0);
  const adapters=w.farVegetation.adapters,pending=adapters.some(a=>a.preparationPending()||!a.layer.current),signature=JSON.stringify([w.renderer.info.render.calls,w.renderer.info.render.triangles,adapters.map(a=>[a.layer.revision,a.stats.prepared])]);
  stable=!pending&&signature===last?stable+1:0;last=signature;
  if(performance.now()-start>90000)throw Error('Far preparation did not settle');
 }
 return {waitMs:performance.now()-start,signature:last,adapters:w.farVegetation.adapters.map(a=>({pending:a.preparationStatus(),stats:a.stats}))};
 });
   const shot=await page.evaluate(()=>{const w=window.qaCampaignWorld;w.render(0);return w.renderer.domElement.toDataURL('image/png').split(',')[1]});await writeFile(dir+'/scene.png',Buffer.from(shot,'base64'));
   const result=await page.evaluate(async()=>{
 if(!window.qaCampaignWorld.farVegetation?.enabled)throw Error("Far background missing");
    const w=window.qaCampaignWorld;w.qaContinuousGrass=typeof w.groundDetails.audit==="function"?w.groundDetails:undefined;const {measureCampaign}=await import('/tools/experiments/qa-campaign-frame-measure.js');
    await w.whenChunksReady();await w.horizon.whenReady();const originalSync=w.syncChunks;w.syncChunks=()=>{};const original=w.render;let index=0;const base=window.qaSandPath[2];
    let workload=[];const moving=function(...args){const i=index++,offset=12*Math.sin((i%150)/149*Math.PI*2);w.camera.position.set(base[0]+offset,base[1],base[2]+offset*.35);const result=original.apply(this,args);let calls=0,triangles=0;w.scene.traverseVisible(m=>{if(m.name==='smooth-far-opaque'&&m.geometry.instanceCount>0){calls++;triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3*m.geometry.instanceCount;}});if(i<150)workload.push({frame:i,extraCalls:calls,extraTriangles:triangles,leafTriangles:w.groundDetails.audit().triangles,leafInstances:w.groundDetails.near+w.groundDetails.far,camera:w.camera.position.toArray()});return result;};
    try{w.render=moving;const gpu=await measureCampaign(w,{gpuEnabled:true,samples:90,warmup:60});const gpuWorkload=workload.slice(60);index=0;workload=[];const cadence=await measureCampaign(w,{samples:90,warmup:60});return {gpu,cadence,gpuWorkload,cpuWorkload:workload.slice(60)};}finally{w.render=original;w.syncChunks=originalSync;}

   });
   if(errors.length)throw Error(errors.join('\n'));records.push({biome,quality,variant,run,phase,readiness,...result,errors:[...errors]});await writeFile(out+'/benchmarks.json',JSON.stringify({seed:712,note:"Reload ABAB original/cupped leaves, low quality, Intel UHD, same 24-unit camera path over exposed soil. Full backgrounds and smooth far transitions in both arms. 60 warmup +90 samples per GPU and separate cadence pass. syncChunks suspended during sampling. Same leaf density/masks; normalize workload by actual leaf triangle and opaque split changes; verify equal instance counts. No FPS claim from reload variance alone.",records},null,2));console.log(variant,phase,'measured');
  }
 await page.close();
 }}finally{await browser.close()}
