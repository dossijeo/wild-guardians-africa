import {globalClosureQuery} from './global-closure-recipe-20261022.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/desert-populated-effect-audit-20261022';await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
const fixture=JSON.parse(await readFile('docs/qa/global-visual-lab/desert-populated-closure-20261022/native-fixture.json','utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of ['media','media'])for(const biome of (process.env.WG_REVIEW_BIOMES??'desierto').split(','))for(const variant of ['closure']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();const body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('Observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new').replace('if(depth)this.destructionPass.captureDepth', 'globalThis.qaDepthEffects={workDepth,attackDepth,shieldDepth,agricultureDepth,materialDepth,locomotionDepth,elapsed:this.state.elapsed,time:this.state.time,counts:Object.fromEntries(["workVfx","attackVfx","shieldVfx","agricultureVfx","materialVfx","locomotionVfx"].map(k=>[k,this[k]?.effects?.size??0]))};if(depth)this.destructionPass.captureDepth')});});
 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:true})),quality);

 await page.addInitScript(text=>localStorage.setItem('wild-guardians:slot:opening',text),fixture.timing.navigationContext.state);
 await page.route('**/tools/experiments/qa-campaign-frame-measure.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('const start=performance.now();',`const passRows=[],draw=renderer.render;renderer.render=function(scene,camera){const calls=renderer.info.render.calls,triangles=renderer.info.render.triangles,target=renderer.getRenderTarget(),stack=new Error().stack;try{return draw.apply(this,arguments);}finally{passRows.push({scene:scene.name,type:scene.type,target:target?{name:target.texture.name,width:target.width,height:target.height}:null,override:scene.overrideMaterial?.type,calls:renderer.info.render.calls-calls,triangles:renderer.info.render.triangles-triangles,stack});}};const start=performance.now();`);body=body.replace('const cpuMs=performance.now()-start;', 'renderer.render=draw;const cpuMs=performance.now()-start;');body=body.replace('frames.push({frame:', 'frames.push({effects:globalThis.qaDepthEffects,passes:passRows,frame:');await route.fulfill({response,body});});
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&'+globalClosureQuery(biome));
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'load-slot',slotId:'opening'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000}).catch(e=>{throw Error(errors.join('\n')+'\n'+e.message)});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.simElapsed=w.state.elapsed;w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});




 await page.evaluate(({biome,canyonTarget})=>{
 const w=window.qaCampaignWorld;
 if(biome==='sabana')w.controls.target.set(135,9.400129699707032,45);
 if(biome==='gran-rio')w.controls.target.set(87.83156862745099,7.077262442364413,15.827254901960785);
 if(biome==='gran-canon')w.controls.target.fromArray(canyonTarget);
 if(biome==='gran-rio'){const z=102;w.controls.target.set(w.nav.field.riverX(z),w.nav.field.riverLevel,z);}

 if(w.groundDetails.audit)w.groundDetails.timeOverride=2;
 },{biome,canyonTarget:[-47.868919372558594, 3.259999895095825, 102]});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;const o=w.controls.target.toArray();window.qaSandPath=[[22,16,18],[6,34,6],[-18,9,22]].map(([x,y,z])=>[o[0]+x,Math.max(o[1]+y,w.nav.field.surface(o[0]+x,o[2]+z)+1.2),o[2]+z]);w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();});

  for(const phase of phases){
   const dir=`${out}/${biome}-${quality}-${variant}-${phase}`;await mkdir(dir,{recursive:true});const frames=[];
   await page.evaluate(async phase=>{const w=window.qaCampaignWorld;w.state.time=phase==='day'?150:350;w.state.day=1;w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();for(const group of w.chunks.values())for(const batch of group.userData.lodBatches??[])batch.key=null;w.render(1/30);await Promise.all([...w.objects.values()].map(o=>o.userData.actorReady).filter(Boolean));for(let i=0;i<12;i++)w.render(1/30)},phase);
   const result=await page.evaluate(async()=>{
    const w=window.qaCampaignWorld;w.qaContinuousGrass=typeof w.groundDetails.audit==="function"?w.groundDetails:undefined;const {measureCampaign}=await import('/tools/experiments/qa-campaign-frame-measure.js');
    await w.whenChunksReady();await w.horizon.whenReady();const {prepareInitialFarWorld}=await import('/src/app/far-world-loading.js');await prepareInitialFarWorld(w);if(!w.farVegetation?.enabled||!w.scene.getObjectByName('biome-2d-backdrop')?.visible||w.farVegetation.adapters.some(a=>!a.layer.current))throw Error('Full background missing');let stable=0,last='',started=performance.now();while(stable<90){await new Promise(requestAnimationFrame);w.render(0);const sig=JSON.stringify([w.renderer.info.render.calls,w.renderer.info.render.triangles,w.renderer.info.memory.geometries,w.renderer.info.memory.textures]);stable=!w.farVegetation.adapters.some(a=>a.preparationPending())&&sig===last?stable+1:0;last=sig;if(performance.now()-started>120000)throw Error('Scene preparation did not stabilize');}const sceneAudit={origin:[w.renderOrigin.x,w.renderOrigin.z],target:w.controls.target.toArray(),chunks:[...w.chunks.keys()].sort(),objects:w.objects.size,memory:{...w.renderer.info.memory},far:w.farVegetation.stats,workload:JSON.parse(last)};const originalSync=w.syncChunks;w.syncChunks=()=>{};const original=w.render;let index=0;const base=window.qaSandPath[0];
    const moving=function(...args){const t=index++/149*Math.PI*2;w.camera.position.set(base[0],base[1],base[2]);return original.apply(this,args);};
    try{w.render=moving;const gpu=await measureCampaign(w,{gpuEnabled:true,samples:90,warmup:60});index=0;w.render=moving;const cadence=await measureCampaign(w,{samples:90,warmup:60});return {gpu,cadence,sceneAudit};}finally{w.render=original;w.syncChunks=originalSync;}
   });
   if(errors.length)throw Error(errors.join('\n'));records.push({biome,quality,variant,phase,...result,errors:[...errors]});await writeFile(out+'/benchmarks.json',JSON.stringify({seed:712,note:"Medium/low/medium/low fixed camera, full closure recipe and backgrounds. Profiles intentionally differ in shadows and LOD: viability comparison, not equivalent-image optimization. 60 warmup + 90 samples per pass; GPU queries and cadence measured separately. Paused simulation, resident scene with syncChunks suspended; excludes shoreline construction and streaming latency.",records},null,2));console.log(quality,variant,phase,'measured');
  }
 await page.close();
 }}finally{await browser.close()}
