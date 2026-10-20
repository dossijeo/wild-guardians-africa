import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const base=process.env.WG_WEBGPU_URL??'http://127.0.0.1:5294';
const biome=process.env.WG_GRASS_BIOME??'sabana',quality=process.env.WG_GRASS_QUALITY??'media';
if(!['sabana','gran-rio'].includes(biome)||!['media','baja'].includes(quality))throw Error('Invalid biome or quality');
const river=biome==='gran-rio',suffix=(river?'-river':'')+(quality==='baja'?'-low':'');
const isolated=process.env.WG_GRASS_FIXTURE==='1';
const output='tools/webgpu-evaluation/fixtures',docs='docs/qa/webgpu-evaluation';
await mkdir(output,{recursive:true});await mkdir(docs,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
 const errors=[];
 let threeModule;
 page.on('pageerror',e=>{errors.push(e.message);console.error('pageerror',e.message);});
 page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST/.test(m.text())){errors.push(m.text());console.error('browser',m.text());}});
 page.on('response',r=>{if(r.status()>=400)console.error('HTTP',r.status(),r.url());});
 await page.route('**/src/rendering/scene.js*',async route=>{
  const response=await route.fetch(),body=await response.text();
  threeModule=body.match(/from\s*["']([^"']*\/three\.js[^"']*)["']/)?.[1]??threeModule;
  if(!body.includes('this.raycaster=new'))throw Error('Missing QA observation anchor');
  await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});
 });
 // Serve only the three known helper modules, retaining Vite's exact Three URL.
 await page.route('**/tools/experiments/qa-*.js',async route=>{
  const name=new URL(route.request().url()).pathname.split('/').pop();
  if(!['qa-continuous-grass-occupancy.js','qa-continuous-grass.js','qa-continuous-grass-river.js','qa-coverage-lifecycle.js'].includes(name))return route.continue();
  let body=await readFile('tools/experiments/'+name,'utf8');
  if(body.includes("from 'three'")){if(!threeModule)throw Error('Missing transformed Three module URL');body=body.replace("from 'three'","from "+JSON.stringify(threeModule));}
  await route.fulfill({status:200,contentType:'text/javascript',body});
 });
 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 if(isolated){
  await page.goto(base+`/tests/browser/african-toon.html?case=${river?6:1}&q=${quality}&visualLab=global-lighting&visualLabReference=1`);
  await page.waitForFunction(()=>window.qaVisualReference?.world,null,{timeout:180000});
  await page.evaluate(()=>{window.qaCampaignWorld=window.qaVisualReference.world;document.querySelector('header').style.display='none';});
 }else{
 await page.goto(base+'/?qa-seed=712&visualLab=global-lighting');
 await page.waitForSelector('#native-menu',{timeout:60000});
 const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');
 await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'),null,{timeout:60000});
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 try{await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});}
 catch(error){await page.screenshot({path:docs+'/export-failure.png'});console.error(await page.evaluate(()=>({text:document.body.innerText,world:!!window.qaCampaignWorld,state:!!window.qaCampaignWorld?.state})));throw error;}
 }
 console.log('Campaign ready; settling deterministic pose');
 await page.evaluate(async({river})=>{
  const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'qa-visual');
  w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();};
  const update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0);
  w.state.time=150;w.state.day=1;
  const target=river?[87.83156862745099,7.077262442364413,15.827254901960785]:[135,9.400129699707032,45];
  w.controls.target.fromArray(target);
  w.camera.position.fromArray(target.map((v,i)=>v+[22,16,18][i]));w.updateCamera();
  w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();
  for(const group of w.chunks.values())for(const batch of group.userData.lodBatches??[])batch.key=null;
  w.render(0);await Promise.all([...w.objects.values()].map(o=>o.userData.actorReady).filter(Boolean));
  await(await import(river?'/tools/experiments/qa-continuous-grass-river.js':'/tools/experiments/qa-continuous-grass-occupancy.js')).applyMaterialStudy(w,'C');
  w.qaContinuousGrass.timeOverride=0;
  for(let i=0;i<12;i++)w.render(0);
 },{river});
 const result=await page.evaluate(async({biome,quality,river})=>{
  const w=window.qaCampaignWorld,q=w.qaContinuousGrass;
  const manifest=await(await fetch('/content/ground-materials.json')).json();
  const encode=v=>v?.toArray?v.toArray():v;
  let renderSpace;
  const hook=w.scene.onBeforeRender;
  w.scene.onBeforeRender=function(...args){
   hook.apply(this,args);
   renderSpace={cameraPosition:w.camera.position.toArray(),sceneOrigin:w.scene.position.toArray(),
    viewMatrix:w.camera.matrixWorldInverse.toArray(),projectionMatrix:w.camera.projectionMatrix.toArray(),
    modelMatrices:q.meshes.map(e=>e.mesh.matrixWorld.toArray()),
    lightVP:q.uniforms.uNativeLightVP.value.toArray(),shadowOn:q.uniforms.uNativeShadowOn.value};
  };
  const auto=w.renderer.info.autoReset;w.renderer.info.autoReset=false;w.renderer.info.reset();
  try{w.render(0);}finally{w.scene.onBeforeRender=hook;w.renderer.info.autoReset=auto;}
  const uniformNames=['uCoverageTime','uCoverageWindStrength','uCoverageSpacing','uCoverageFar','uCoverageSeed','uCoverageScale','uNight','uNightLight','uExposure','uLightDir','uWorldOrigin'];
  const uniforms=Object.fromEntries(uniformNames.map(name=>[name,encode(q.uniforms[name].value)]));
  const geometries=q.meshes.map(({mesh,capacity,data})=>{
   const g=mesh.geometry,n=g.instanceCount,attributes={};
   for(const [name,a]of Object.entries(g.attributes))attributes[name]={itemSize:a.itemSize,normalized:a.normalized,instanced:!!a.isInstancedBufferAttribute,array:Array.from(a.array.subarray(0,a.isInstancedBufferAttribute?n*a.itemSize:a.array.length))};
   return {name:mesh.name,module:mesh.name.replace('coverage-',''),count:n,capacity,attributes,index:Array.from(g.index.array),refined:mesh.material.uniforms.uCoverageRefined.value,triangles:g.index.count/3*n};
  });
  const gl=w.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
  const snapshot={schemaVersion:1,sourceCommit:'719510cec',biome,seed:712,quality,variant:'C',resolution:[1280,720],
   camera:{position:w.camera.position.toArray(),target:w.controls.target.toArray(),fov:w.camera.fov,near:w.camera.near,far:w.camera.far},
   sceneOrigin:w.scene.position.toArray(),renderSpace,uniforms,geometries,modulesUrl:'/assets/visual-lab/continuous-grass/modules.json',
   terrain:{manifestUrl:'/content/ground-materials.json',key:river?'grand_river':'savanna',...manifest[river?'grand_river':'savanna']},
   rawResidentCandidates:{itemLayout:['x','y','z','height','yaw','pigment','cover','moisture','slopeX','slopeZ'],items:[...q.tiles.values()].flatMap(t=>t.items),tiles:[...q.tiles.values()].map(t=>({chunk:t.chunk,tx:t.tx,tz:t.tz,count:t.items.length})),note:'Cached tiles actually visited by original selection, not all unvisited resident terrain.'},
   metadata:{time:w.state.time,day:w.state.day,elapsed:w.state.elapsed,audit:q.audit(),streaming:w.chunkStream.summary(),residentChunks:[...w.chunks.keys()],calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,memory:{...w.renderer.info.memory},worldCounts:{objects:w.objects.size,terrainMeshes:w.terrainMeshes.length,workers:w.state.workers?.length,plants:w.state.plants?.length},renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),glError:gl.getError(),
    note:'Actual selected resident instance arrays; no procedural redistribution. Camera and sceneOrigin are restored world space. renderSpace records temporary origin rebasing during the original render. Counters encompass all submitted passes, not measured timing.'}};
  return {snapshot,png:w.renderer.domElement.toDataURL('image/png').split(',')[1]};
 },{biome,quality,river});
 result.snapshot.metadata.errors=errors;
 result.snapshot.metadata.sourceScene=isolated?'african-toon QA reference fixture; real WorldScene, not campaign startup':'campaign startup';
 if(result.snapshot.metadata.glError||errors.length)throw Error(JSON.stringify({gl:result.snapshot.metadata.glError,errors}));
 if(quality==='media'&&result.snapshot.geometries.some(g=>g.count===0))throw Error('Expected both near and far selected geometry');
 if(!result.snapshot.geometries.some(g=>g.count>0))throw Error('Empty coverage');
 await writeFile(output+'/grass-snapshot'+suffix+'.json',JSON.stringify(result.snapshot)+'\n');
 await writeFile(docs+'/original-'+(river?'river':'savanna')+(quality==='baja'?'-low':'')+'.png',Buffer.from(result.png,'base64'));
 console.log(JSON.stringify({output:output+'/grass-snapshot'+suffix+'.json',counts:result.snapshot.geometries.map(g=>[g.name,g.count,g.triangles]),renderSpace:result.snapshot.renderSpace,errors}));
}finally{await browser.close();}
