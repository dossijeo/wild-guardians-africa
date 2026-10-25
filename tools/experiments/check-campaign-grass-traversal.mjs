import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';


const study=process.env.WG_GRASS_STUDY??'grass-biomes';const out=process.env.WG_GRASS_OUTPUT??'docs/qa/global-visual-lab/grass-traversal';await mkdir(out,{recursive:true});const records=[],transitions=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const biome of (process.env.WG_GRASS_BIOMES??'sabana,gran-rio,gran-canon').split(','))for(const variant of ['candidate']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});



 await page.addInitScript(()=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',farVegetation:false})));
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&visualLab=global-lighting');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'qa-visual');w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});
 const selected=variant==='candidate'?study:process.env.WG_GRASS_BASELINE;if(selected)await page.evaluate(async study=>{const {applyMaterialStudy}=await import('/tools/experiments/qa-'+study+'.js');await applyMaterialStudy(window.qaCampaignWorld)},selected);
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.camera.position.copy(w.controls.target).add({x:22,y:16,z:18});w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();});
 const origin=await page.evaluate(()=>{const w=window.qaCampaignWorld;return {x:w.controls.target.x+50,z:w.controls.target.z+30}});
 for(const phase of ['day','night']){
  await page.evaluate(({phase,origin})=>{const w=window.qaCampaignWorld;w.state.day=1;w.state.time=phase==='day'?150:350;const y=w.nav.field.surface(origin.x,origin.z)+.9;w.controls.target.set(origin.x,y,origin.z);w.camera.position.set(origin.x+22,y+16,origin.z+18);w.render(.016);},{phase,origin});
  await page.evaluate(async()=>{const w=window.qaCampaignWorld;await w.whenChunksReady();await w.horizon.whenReady();});await page.waitForTimeout(700);
  for(const [index,offset] of [0,96,192,288,192,96,0].entries()){
   const motion=index===0?null:await page.evaluate(async({origin,offset})=>{
    const w=window.qaCampaignWorld,d=w.groundDetails,startX=w.controls.target.x,startZ=w.controls.target.z,old=w.updateCamera;
    const {GpuTimer}=await import('/tests/browser/gpu-timer.js'),gpu=new GpuTimer(w.renderer.getContext());const render=w.render,cpu=[],frames=[];let frame=0;
    const start=performance.now();
    w.updateCamera=()=>{const t=Math.min(1,(performance.now()-start)/6000),x=startX+(origin.x+offset-startX)*t,z=startZ+(origin.z-startZ)*t,y=w.nav.field.surface(x,z)+.9;w.controls.target.set(x,y,z);w.camera.position.set(x+22,y+16,z+18);old();};
    w.render=function(...args){gpu.begin(frame);const begin=performance.now();try{return render.apply(this,args)}finally{cpu.push(performance.now()-begin);gpu.end();frames.push({frame:frame++,count:d.count,transitioning:d.qaActive.filter(p=>p.scale>0&&p.scale<1).length,origin:[w.renderOrigin.x,w.renderOrigin.z],chunks:w.chunks.size});}};
    try{await new Promise(r=>setTimeout(r,6100));}finally{w.render=render;w.updateCamera=old;}
    for(let i=0;i<120&&gpu.pending.length;i++){await new Promise(r=>setTimeout(r,8));gpu.poll();}const report=gpu.report();gpu.dispose();
    if(frames.some(f=>f.count>192))throw Error('Grass capacity exceeded');return {cpu,gpu:report,frames};
   },{origin,offset});
   await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();});await page.waitForTimeout(700);
   const settled=await page.evaluate(()=>{const w=window.qaCampaignWorld,d=w.groundDetails,positions=[...d.chunks.values()].flat();return {camera:w.camera.position.toArray(),target:w.controls.target.toArray(),chunks:[...w.chunks.keys()].sort(),detailChunks:[...d.chunks.keys()].sort(),count:d.count,candidates:positions.length,signature:positions.map(p=>[p.x,p.y,p.z,p.bits].join(',')).sort().join(';'),origin:[w.renderOrigin.x,w.renderOrigin.z],time:w.state.time,structures:w.state.structures.length,plants:w.state.plants.length,textures:w.renderer.info.memory.textures,geometries:w.renderer.info.memory.geometries,active:d.qaActive}});
   if(JSON.stringify(settled.chunks)!==JSON.stringify(settled.detailChunks))throw Error('Resident grass chunk mismatch');
   const record={biome,phase,index,offset,motion,settled,errors:[...errors]};records.push(record);
   if([0,3,6].includes(index))for(const visible of [false,true]){
    await page.evaluate(visible=>{const w=window.qaCampaignWorld;w.groundDetails.mesh.visible=visible;w.render(.016)},visible);
    await page.locator('#stage canvas#world').screenshot({path:`${out}/${biome}-${phase}-${index}-${visible?'grass':'base'}.png`});
   }
   await writeFile(out+'/traversal.json',JSON.stringify({note:'Actual campaign, fixed seed 712 and time, 16 m/s camera, 288 m outward and return. GPU absolute cost includes rendering/streaming; no visibility ABBA in this run.',records},null,2)+'\n');console.log(biome,phase,index,settled.count,settled.candidates);
  }
 }
 await page.close();
}}finally{await browser.close()}
