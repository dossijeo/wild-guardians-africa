import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';


const study='desert-sand-dry-specular';
const out=process.env.WG_SAND_OUTPUT??'docs/qa/global-visual-lab/desert-aerial-sand/dry-specular/campaign-cadence';await mkdir(out,{recursive:true});const records=[];
const phases=(process.env.WG_SAND_PHASES??'day,night').split(',');
const order=(process.env.WG_SAND_ORDER??'0,1,1,0,1,0,0,1').split(',').map(Number);
if(order.some(v=>v!==0&&v!==1))throw Error('Invalid variant order');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media,baja').split(','))for(const biome of ['desierto']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 await page.route('**/src/app/main.js*',async route=>{
  const response=await route.fetch();let body=await response.text();
  for(const [from,to]of [
   ['function frame(now) {','function frame(now) {const qaFrameStart=performance.now();try{'],
   ['}\nasync function boot()', '}finally{globalThis.qaCampaignFrame?.(now,performance.now()-qaFrameStart);}}\nasync function boot()']
  ]){if(!body.includes(from))throw Error('App frame observation anchor missing');body=body.replace(from,to)}
  await route.fulfill({response,body});
 });
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&visualLab=global-lighting');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(async()=>{
  const w=window.qaCampaignWorld;await w.whenChunksReady();await w.horizon.whenReady();
  await Promise.all([...w.objects.values()].map(o=>o.userData.actorReady).filter(Boolean));
  const origin=w.controls.target.clone();origin.y=w.nav.field.surface(origin.x,origin.z)+.9;w.controls.target.copy(origin);
  w.camera.position.set(origin.x+22,origin.y+16,origin.z+18);
  for(let settle=0;settle<4;settle++){w.render(0);await w.whenChunksReady();await w.horizon.whenReady();await new Promise(requestAnimationFrame);}
  const materials=[];w.scene.traverse(o=>{for(const m of [].concat(o.material??[]))if(m.userData.groundBiome==='desert'&&m.userData.biomeGround&&!materials.includes(m))materials.push(m)});
  const snapshot=()=>({textures:w.biomeGround.textures.slice(),materials:materials.map(m=>({compile:m.onBeforeCompile,key:m.customProgramCacheKey,params:m.userData.biomeGround.uGroundParams.value.clone()}))});
  const initialMaterials=()=>{const found=[];w.scene.traverse(o=>{for(const m of [].concat(o.material??[]))if(m.userData.groundBiome==='desert'&&m.userData.biomeGround&&!found.includes(m))found.push(m)});return found};
  const a=snapshot();await(await import('/tools/experiments/qa-desert-sand-dry-specular.js')).applyMaterialStudy(w);const b=snapshot();
  const pose=i=>{const t=Math.max(0,Math.min(240,i))/240*Math.PI*2;w.controls.target.copy(origin);w.camera.position.set(origin.x+22+Math.sin(t)*3,origin.y+16+Math.sin(t)*.5,origin.z+18+(Math.cos(t)-1)*2)};
  window.qaSetSand=variant=>{const s=variant?b:a;w.biomeGround.textures=s.textures.slice();materials.forEach((m,i)=>{m.onBeforeCompile=s.materials[i].compile;m.customProgramCacheKey=s.materials[i].key;m.userData.biomeGround.uGroundParams.value.copy(s.materials[i].params);for(const [key,j]of [['uGroundDetailMap',0],['uGroundNormal',1],['uLayerSandBase',0],['uLayerSandNormal',1]])if(m.userData.biomeGround[key])m.userData.biomeGround[key].value=s.textures[j];m.needsUpdate=true});};
  const original=w.render;
  w.render=function(dt){
   const run=window.qaCampaignRun;if(!run?.active)return original.call(this,dt);
   pose(run.index);const info=this.renderer.info,reset=info.autoReset;info.autoReset=false;info.reset();const start=performance.now();
   try{return original.call(this,dt)}finally{
    const cpu=performance.now()-start;run.renderCalls++;
    run.rendered={frame:run.index,renderCpuMs:cpu,camera:this.camera.position.toArray(),target:this.controls.target.toArray(),calls:info.render.calls,triangles:info.render.triangles,geometries:info.memory.geometries,textures:info.memory.textures};info.autoReset=reset;
   }
  };
  const changedPaths=(a,b,path='')=>{if(JSON.stringify(a)===JSON.stringify(b))return [];if(a&&b&&typeof a==='object'&&typeof b==='object')return [...new Set([...Object.keys(a),...Object.keys(b)])].flatMap(k=>changedPaths(a[k],b[k],path?path+'.'+k:k));return [{path,before:a,after:b}]};
  window.qaCampaignFrame=(stamp,cpu)=>{
   const r=window.qaCampaignRun;if(!r?.active||!r.rendered)return;
   if(r.previous)r.previous.intervalMs=stamp-r.previous.stamp;
   if(r.index>=0&&r.index<240){const row={...r.rendered,stamp,appFrameCpuMs:cpu,renderCalls:r.renderCalls,hidden:document.hidden};r.rows.push(row);r.previous=row}
   r.index++;r.rendered=null;r.renderCalls=0;
   if(r.index>240){r.active=false;r.resolve({rows:r.rows,materialMembershipUnchanged:initialMaterials().length===materials.length&&initialMaterials().every(m=>materials.includes(m)),simulationUnchanged:r.state===JSON.stringify(w.state),stateChanges:changedPaths(JSON.parse(r.state),JSON.parse(JSON.stringify(w.state))),residentBefore:r.resident,residentAfter:[...w.chunks.keys()],memory:{...w.renderer.info.memory}})}
  };
  window.qaRunCampaign=async(variant,night)=>{
   window.qaSetSand(variant);w.state.time=night?350:150;w.state.day=1;pose(0);
   for(const group of w.chunks.values())for(const batch of group.userData.lodBatches??[])batch.key=null;
   return await new Promise(resolve=>{window.qaCampaignRun={active:true,index:-60,rows:[],rendered:null,previous:null,renderCalls:0,resolve,state:JSON.stringify(w.state),resident:[...w.chunks.keys()]}});
  };
  window.qaCaptureCampaign=variant=>{window.qaSetSand(variant);pose(0);w.render(0);return {image:w.renderer.domElement.toDataURL('image/png').split(',')[1],camera:w.camera.position.toArray(),target:w.controls.target.toArray(),time:w.state.time}};
  const gl=w.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
  window.qaCampaignDevice={renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],canvas:[gl.drawingBufferWidth,gl.drawingBufferHeight],hardwareConcurrency:navigator.hardwareConcurrency};
 });
 for(const phase of phases){
  for(const [run,variant]of order.entries()){
   const report=await page.evaluate(({variant,night})=>window.qaRunCampaign(variant,night),{variant,night:phase==='night'});
   const device=await page.evaluate(()=>window.qaCampaignDevice);
   records.push({quality,phase,run,variant,device,...report,errors:[...errors]});
   await writeFile(out+'/results.json',JSON.stringify({seed:712,study,warmupFrames:60,measuredFrames:240,order,note:'Native application RAF loop, menu-paused initial campaign (tutorial presentation paused through existing menu pause reason) with deterministic short camera path. No GPU timing, getError polling, readback, manual render loop or shader switching during measured frames. CPU includes QA observation overhead. Not active simulation or advanced campaign.',records},null,2)+'\n');
   console.log(quality,phase,run,variant,report.rows.reduce((n,r)=>n+r.intervalMs,0)/report.rows.length,'ms interval');
   if(!report.materialMembershipUnchanged)throw Error('Ground material membership changed');
   if(!report.simulationUnchanged||JSON.stringify(report.residentBefore)!==JSON.stringify(report.residentAfter))throw Error('Campaign state or residents changed');
   if(report.rows.length!==240||report.rows.some(r=>!Number.isFinite(r.intervalMs)||r.renderCalls!==1||r.hidden)||errors.length)throw Error('Campaign observation failed');
   if(run<2){const c=await page.evaluate(v=>window.qaCaptureCampaign(v),variant);await writeFile(`${out}/${quality}-${phase}-${variant?'candidate':'base'}.png`,Buffer.from(c.image,'base64'));}
  }
 }
 await page.close();
 }}finally{await browser.close()}
