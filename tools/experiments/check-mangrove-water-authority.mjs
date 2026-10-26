import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.env.WG_WATER_OUT??'docs/qa/post-beasts-20261026/water-before';
const seed=Number(process.env.WG_WATER_SEED??37);
const biome=process.env.WG_WATER_BIOME??'manglares';
if(!['sabana','gran-rio','manglares','volcanes','desierto','gran-canon'].includes(biome))throw Error('Unsupported QA biome');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 if(process.env.WG_FAR_MASK_STEP||process.env.WG_FAR_GEOMETRY_STEP){const mask=Number(process.env.WG_FAR_MASK_STEP??4),geometry=Number(process.env.WG_FAR_GEOMETRY_STEP??32);if(![1,2,4].includes(mask)||![8,16,32].includes(geometry))throw Error('Unsupported far ground sample step');await page.route('**/src/rendering/far-vegetation-profile.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('groundColorStep:4',`groundColorStep:${mask}`).replace('groundStep:32',`groundStep:${geometry}`)});});}
 if(process.env.WG_NETWORK_VARIANT==='7')await page.route('**/src/app/wild-engine-world.js*',async route=>{const response=await route.fetch(),source=await response.text();if(!source.includes('state.mangroveNetwork=true'))throw Error('Missing estuary default assignment');await route.fulfill({response,body:source.replace('state.mangroveNetwork=true','state.mangroveChannels=true')});});
 await page.route('**/tools/experiments/native-far-ground.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('const mesh=new THREE.Mesh(geometry,material);','const mesh=new THREE.Mesh(geometry,material);mesh.userData.qaSampling={step:data.step,mapStep:data.colorMap?.step,vertices:data.positions.length/3,mapWidth:data.colorMap?.width,bedBytes:data.waterBed?.bytes.byteLength};')});});
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('this.raycaster=new','globalThis.qaWaterWorld=this;this.raycaster=new')});});
 await page.addInitScript(()=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',music:0,sfx:0})));
 await page.goto((process.env.WG_QA_URL??'http://127.0.0.1:5218')+'/?qa-seed='+seed+(process.env.WG_FAR_WATER_SURFACE==='1'?'&farWaterSurface=1':'')+(process.env.WG_ANGULAR_LOD==='1'?'&farAngularLod=1':''),{waitUntil:'domcontentloaded',timeout:90000});
 const menu=page.frameLocator('#native-menu');await menu.locator('#loading').waitFor({state:'hidden',timeout:90000});
 await menu.locator('body').evaluate((element,biome)=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&globalThis.qaWaterWorld?.state,null,{timeout:240000});
 await page.waitForTimeout(3000);
 // Presentation-only diagnostic: do not advance tutorial steps or let its
 // guided placement camera override the requested comparison views.
 await page.addStyleTag({content:'#guardian-root{display:none!important}'});
 await page.evaluate(()=>{qaWaterWorld.cinematic=true;});
 if(process.env.WG_WATER_VIEW)await page.evaluate(([x,z])=>{const w=qaWaterWorld,t=w.controls.target,dx=x-t.x,dz=z-t.z;t.set(x,w.nav.field.surface(x,z),z);w.camera.position.x+=dx;w.camera.position.z+=dz;w.camera.lookAt(t);w.camera.updateMatrixWorld(true);w.syncChunks();},process.env.WG_WATER_VIEW.split(',').map(Number));
 if(process.env.WG_WATER_VIEW)await page.waitForTimeout(10000);
 if(process.env.WG_ANGULAR_LOD==='1'){await page.waitForFunction(()=>qaWaterWorld.farVegetation?.adapters.every(a=>!a.preparationPending()),null,{timeout:90000});await page.waitForTimeout(1500);const near=await page.evaluate(()=>{const w=qaWaterWorld;return w.farVegetation.adapters.map(a=>({stats:a.stats,trees:a.layer.current.trees.filter(t=>Math.hypot(t.x-w.camera.position.x,t.z-w.camera.position.z)<60).map(t=>({id:t.id,x:t.x,y:t.y,z:t.z,state:a.layer.current.prototype.treeState(t.id),diagnosis:a.readinessDiagnosis(t.id)}))}));});await writeFile(out+'/near-lod.json',JSON.stringify(near,null,2));}
 await page.screenshot({path:out+'/world.png'});
 const data=await page.evaluate(async()=>{
  const w=qaWaterWorld,f=w.nav.field,points=[];const o=w.controls.target;
  for(let z=-60;z<=60;z+=2)for(let x=-60;x<=60;x+=2){const px=o.x+x,pz=o.z+z;points.push({x:px,z:pz,h:f.surface(px,pz),water:f.waterInfo(px,pz)});}
  const farGround=[];w.scene.traverse(m=>{if(m.userData.qaSampling)farGround.push(m.userData.qaSampling);});const regional=[];w.scene.traverse(m=>{if(m.userData.regionalWaterSurface)regional.push({visible:m.visible,vertices:m.geometry.attributes.position.count,clock:m.material.userData.paintUniforms.uTime.value});});const waters=[];w.scene.traverse(m=>{if(m.userData.nativeFluid)waters.push({kind:m.userData.nativeFluid,vertices:m.geometry?.attributes.position.count,bounds:m.geometry?.boundingBox});});
  return {biome:w.state.biome,regional,farGround,runtime:w.spatialSession?.runtime??null,crossOriginIsolated:globalThis.crossOriginIsolated,seed:w.state.seed,channels:w.state.mangroveChannels===true,network:w.state.mangroveNetwork===true,visualSearch:w.visualSearch,coverage:w.groundDetails?.audit?.()??null,target:o.toArray(),camera:w.camera.position.toArray(),points,waters,fieldKeys:Object.keys(f),snapshot:JSON.stringify(w.state)};
 });
 await writeFile(out+'/report.json',JSON.stringify({farMaskStep:Number(process.env.WG_FAR_MASK_STEP??4),farGeometryStep:Number(process.env.WG_FAR_GEOMETRY_STEP??32),data,errors},null,2));
 await page.evaluate(()=>{const w=qaWaterWorld,t=w.controls.target;w.camera.position.set(t.x+75,t.y+95,t.z+95);w.camera.lookAt(t);w.camera.updateMatrixWorld(true);});
 await page.waitForTimeout(2000);
 if(process.env.WG_ANGULAR_LOD==='1'){await page.waitForFunction(()=>{const a=qaWaterWorld.farVegetation?.adapters;return a?.length&&a.every(x=>!x.preparationPending());},null,{timeout:90000});await page.waitForTimeout(1500);const lod=await page.evaluate(()=>qaWaterWorld.farVegetation.adapters.map(a=>({status:a.preparationStatus(),stats:a.stats})));await writeFile(out+'/angular-lod.json',JSON.stringify(lod,null,2));}
 await page.screenshot({path:out+'/elevated.png'});
 if(process.env.WG_ANGULAR_MOTION==='1'){
  const motion=await page.evaluate(async()=>{
   const w=qaWaterWorld,t=w.controls.target.clone(),frames=[],samples=[];let previous=performance.now(),start=previous;
   await new Promise(resolve=>{const tick=now=>{frames.push(now-previous);previous=now;const u=Math.min(1,(now-start)/24000),phase=(1-Math.cos(u*Math.PI*4))/2;
    w.camera.position.set(t.x+35+40*phase,t.y+25+90*phase,t.z+45+50*phase);w.camera.lookAt(t);w.camera.updateMatrixWorld(true);w.syncChunks();
    if(!samples.length||now-start-samples.at(-1).ms>=500)samples.push({ms:now-start,pending:w.farVegetation.adapters.filter(a=>a.preparationPending()).length,trees:w.farVegetation.adapters.map(a=>a.stats.standby?.trees??0),errors:w.farVegetation.adapters.flatMap(a=>[...a.stats.errors,...(a.stats.standby?.errors??[])])});
    if(u<1)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});
   frames.sort((a,b)=>a-b);return {frames:frames.length,p50:frames[Math.floor(frames.length*.5)],p95:frames[Math.floor(frames.length*.95)],p99:frames[Math.floor(frames.length*.99)],max:frames.at(-1),samples};
  });
  await page.waitForFunction(()=>qaWaterWorld.farVegetation.adapters.every(a=>!a.preparationPending()),null,{timeout:90000});await page.waitForTimeout(1500);
  motion.final=await page.evaluate(()=>qaWaterWorld.farVegetation.adapters.map(a=>({status:a.preparationStatus(),stats:a.stats})));
  await writeFile(out+'/motion.json',JSON.stringify(motion,null,2));await page.screenshot({path:out+'/motion-return.png'});
  if(motion.samples.some(s=>s.errors.length)||motion.final.some(a=>a.stats.errors.length||a.stats.standby?.errors.length))throw Error('Angular LOD motion preparation errors');
 }
 if(process.env.WG_WATER_GPU==='1'){
  await page.evaluate(async()=>{const game=await import('/src/simulation/game.js');game.pause(qaWaterWorld.state,'qa-water-benchmark');qaWaterWorld.state.time=100;qaWaterWorld.state.elapsed=100;});
  const gpu=await page.evaluate(async()=>{
   const w=qaWaterWorld,gl=w.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2'),debug=gl.getExtension('WEBGL_debug_renderer_info');
   const renderer=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);if(!ext)return {supported:false,renderer};
   const original=w.drawRenderFrame,pending=[],gpu=[],cpu=[],intervals=[];let frames=0,disjoint=false,resolve,reject,last=null;
   const done=new Promise((a,b)=>{resolve=a;reject=b;}),timeout=setTimeout(()=>reject(Error('GPU query timeout')),60000);
   w.drawRenderFrame=function(...args){frames++;const measured=frames>60&&frames<=300;
    if(gl.getQuery(ext.TIME_ELAPSED_EXT,gl.CURRENT_QUERY))throw Error('Existing GPU query');
    const q=measured?gl.createQuery():null;if(q)gl.beginQuery(ext.TIME_ELAPSED_EXT,q);const start=performance.now();if(measured&&last!==null)intervals.push(start-last);last=start;
    try{return original.apply(this,args);}finally{if(measured)cpu.push(performance.now()-start);if(q){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(q);}if(gl.getParameter(ext.GPU_DISJOINT_EXT))disjoint=true;
     while(pending.length&&gl.getQueryParameter(pending[0],gl.QUERY_RESULT_AVAILABLE)){const query=pending.shift();gpu.push(gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6);gl.deleteQuery(query);}if(frames>=300&&!pending.length)resolve();}
   };
   try{await done;}finally{clearTimeout(timeout);w.drawRenderFrame=original;for(const q of pending)gl.deleteQuery(q);}
   return {supported:true,renderer,frames,gpu,cpu,intervals,disjoint,memory:w.renderer.info.memory,render:w.renderer.info.render,scope:'Whole drawRenderFrame; 60 warmup+240 measured; static elevated view, identical day/time, simulation paused for controlled GPU comparison.'};
  });await writeFile(out+'/gpu.json',JSON.stringify(gpu,null,2));if(gpu.disjoint)throw Error('Disjoint GPU measurements');
 }
 if(process.env.WG_WATER_PROGRAM==='1'){
  const audit=await page.evaluate(()=>{const w=qaWaterWorld,items=[];w.scene.traverse(m=>{if(!m.userData.regionalWaterSurface&&m.userData.nativeFluid!=='chunk')return;const mat=m.material,p=w.renderer.properties.get(mat),program=p.currentProgram,u=mat.userData.paintUniforms,ancestors=[];for(let a=m;a;a=a.parent)ancestors.push({name:a.name,visible:a.visible});items.push({regional:!!m.userData.regionalWaterSurface,ancestors,drawRange:m.geometry.drawRange,program:program?.id,key:mat.customProgramCacheKey(),transparent:mat.transparent,opacity:mat.opacity,uniforms:Object.fromEntries(Object.entries(u??{}).map(([k,v])=>[k,v.value?.isTexture?{uuid:v.value.uuid}:v.value?.toArray?v.value.toArray():v.value])),vertex:program?w.renderer.getContext().getShaderSource(program.vertexShader):null,fragment:program?w.renderer.getContext().getShaderSource(program.fragmentShader):null});});return items;});
  await writeFile(out+'/programs.json',JSON.stringify(audit,null,2));
  await page.evaluate(()=>{const w=qaWaterWorld;w.scene.traverse(m=>{if(m.userData.regionalWaterSurface){const old=m.material.onBeforeCompile,key=m.material.customProgramCacheKey();m.material.onBeforeCompile=(s,r)=>{old(s,r);s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>','outgoingLight=vec3(1.,0.,1.);diffuseColor.a=1.;\n#include <opaque_fragment>');};m.material.customProgramCacheKey=()=>key+':qa-magenta';m.material.needsUpdate=true;}});});
  await page.waitForTimeout(500);await page.screenshot({path:out+'/regional-magenta.png'});
 }
 if(process.env.WG_WATER_ISOLATE==='1'){
  const hits=await page.evaluate(()=>{
   const w=qaWaterWorld,ray=w.raycaster,points=[[740,295],[400,365],[650,540],[880,385]],result=[];
   for(const [x,y] of points){ray.setFromCamera({x:x/1280*2-1,y:1-y/720*2},w.camera);result.push({pixel:[x,y],hits:ray.intersectObjects(w.scene.children,true).slice(0,12).map(h=>({point:h.point.toArray(),distance:h.distance,name:h.object.name,userData:h.object.userData,material:h.object.material?.type,parents:[h.object.parent?.name,h.object.parent?.parent?.name]}))});}
   return result;
  });await writeFile(out+'/surface-hits.json',JSON.stringify(hits,null,2));
  for(const layer of ['regional','resident','seam']){
   await page.evaluate(layer=>{const w=qaWaterWorld;globalThis.qaHidden=[];w.scene.traverse(m=>{if(m.visible&&((layer==='regional'&&(m.userData.farGround||m.userData.regionalWaterSurface))||(layer==='resident'&&m.userData.nativeFluid)||(layer==='seam'&&m.userData.farGroundSeam))){qaHidden.push(m);m.visible=false;}});},layer);
   await page.waitForTimeout(200);await page.screenshot({path:out+'/without-'+layer+'.png'});
   await page.evaluate(()=>{for(const m of qaHidden)m.visible=true;delete globalThis.qaHidden;});
  }
 }
 if(process.env.WG_WATER_HIDE_FAR==='1'){await page.evaluate(()=>{qaWaterWorld.scene.traverse(m=>{if(m.userData.farGround)m.visible=false;});});await page.waitForTimeout(300);await page.screenshot({path:out+'/elevated-without-far-ground.png'});}
 console.log(JSON.stringify({seed:data.seed,target:data.target,wet:data.points.filter(p=>p.water.inside).length,total:data.points.length,waters:data.waters.length,errors}));
}catch(error){await writeFile(out+'/failure.json',JSON.stringify({error:String(error),errors,text:await page.locator('body').innerText().catch(()=>null)},null,2));await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw error;}finally{await page.unrouteAll({behavior: 'wait'});await browser.close();}
