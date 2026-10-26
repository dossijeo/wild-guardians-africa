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
 if(process.env.WG_REGIONAL_BINARY_COVERAGE==='1')await page.context().route('**/tools/experiments/regional-wetland-bed.js*',async route=>{const response=await route.fetch(),source=await response.text(),target='return Math.max(0,Math.min(1,.5+info.mask-.61));';if(!source.includes(target))throw Error('Missing continuous coverage implementation');await route.fulfill({response,body:source.replace(target,'return info.inside?1:0;')});});
 if(process.env.WG_TREE_CANDIDATES==='1')await page.route('**/content/biome-*.json',async route=>{const file=new URL(route.request().url()).pathname.split('/').at(-1);const response=await route.fetch({url:new URL('/assets/visual-lab/tree-candidates-20261026'+(process.env.WG_TREE_LOD==='1'?'-lod':'')+'/'+file,route.request().url()).href});if(!response.ok())throw Error('Candidate manifest missing: '+file);await route.fulfill({response});});
 if(process.env.WG_FAR_MASK_STEP||process.env.WG_FAR_GEOMETRY_STEP){const mask=Number(process.env.WG_FAR_MASK_STEP??4),geometry=Number(process.env.WG_FAR_GEOMETRY_STEP??32);if(![1,2,4].includes(mask)||![2,4,8,16,32].includes(geometry))throw Error('Unsupported far ground sample step');await page.route('**/src/rendering/far-vegetation-profile.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('groundColorStep:4',`groundColorStep:${mask}`).replace('groundStep:32',`groundStep:${geometry}`)});});}
 if(process.env.WG_NETWORK_VARIANT==='7')await page.route('**/src/app/wild-engine-world.js*',async route=>{const response=await route.fetch(),source=await response.text();if(!source.includes('state.mangroveNetwork=true'))throw Error('Missing estuary default assignment');await route.fulfill({response,body:source.replace('state.mangroveNetwork=true','state.mangroveChannels=true')});});
 await page.route('**/tools/experiments/native-far-ground.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('const mesh=new THREE.Mesh(geometry,material);','const mesh=new THREE.Mesh(geometry,material);mesh.userData.qaSampling={step:data.step,mapStep:data.colorMap?.step,vertices:data.positions.length/3,mapWidth:data.colorMap?.width,bedBytes:data.waterBed?.bytes.byteLength};')});});
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('this.raycaster=new','globalThis.qaWaterWorld=this;this.raycaster=new')});});
 await page.addInitScript(()=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',music:0,sfx:0})));
 await page.goto((process.env.WG_QA_URL??'http://127.0.0.1:5218')+'/?qa-seed='+seed+(process.env.WG_FAR_WATER_SURFACE==='1'?'&farWaterSurface=1':'')+(process.env.WG_ANGULAR_LOD==='1'?'&farAngularLod=1':''),{waitUntil:'domcontentloaded',timeout:90000});
 const menu=page.frameLocator('#native-menu');await menu.locator('#loading').waitFor({state:'hidden',timeout:90000});
 await menu.locator('body').evaluate((element,biome)=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&globalThis.qaWaterWorld?.state,null,{timeout:240000});
 if(process.env.WG_WATER_NEAR)await page.evaluate(near=>{qaWaterWorld.camera.near=near;qaWaterWorld.camera.updateProjectionMatrix();},Number(process.env.WG_WATER_NEAR));
 if(process.env.WG_WATER_FIXED_TIME==='1')await page.evaluate(async()=>{const game=await import('/src/simulation/game.js');game.pause(qaWaterWorld.state,'qa-tree-comparison');qaWaterWorld.state.time=100;qaWaterWorld.state.elapsed=100;});
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
  const farGround=[];w.scene.traverse(m=>{if(m.userData.qaSampling)farGround.push(m.userData.qaSampling);});const regional=[];w.scene.traverse(m=>{if(m.userData.regionalWaterSurface)regional.push({visible:m.visible,vertices:m.geometry.attributes.position.count,clock:m.material.userData.paintUniforms.uTime.value,coverageValues:[...new Set(Array.from(w.renderer.properties.get(m.material).uniforms?.uRegionalMask?.value?.image?.data??[]).filter((_,i)=>i%4===3))].sort((a,b)=>a-b)});});const waters=[];w.scene.traverse(m=>{if(m.userData.nativeFluid)waters.push({kind:m.userData.nativeFluid,vertices:m.geometry?.attributes.position.count,bounds:m.geometry?.boundingBox});});
  return {biome:w.state.biome,regional,farGround,runtime:w.spatialSession?.runtime??null,crossOriginIsolated:globalThis.crossOriginIsolated,seed:w.state.seed,channels:w.state.mangroveChannels===true,network:w.state.mangroveNetwork===true,visualSearch:w.visualSearch,coverage:w.groundDetails?.audit?.()??null,target:o.toArray(),camera:w.camera.position.toArray(),points,waters,depthPrecision:{near:w.camera.near,far:w.camera.far,bits:w.renderer.getContext().getParameter(w.renderer.getContext().DEPTH_BITS)},fieldKeys:Object.keys(f),snapshot:JSON.stringify(w.state)};
 });
 await writeFile(out+'/report.json',JSON.stringify({farMaskStep:Number(process.env.WG_FAR_MASK_STEP??4),farGeometryStep:Number(process.env.WG_FAR_GEOMETRY_STEP??32),data,errors},null,2));
 await page.evaluate(()=>{const w=qaWaterWorld,t=w.controls.target;w.camera.position.set(t.x+75,t.y+95,t.z+95);w.camera.lookAt(t);w.camera.updateMatrixWorld(true);});
 await page.waitForTimeout(2000);
 if(process.env.WG_ANGULAR_LOD==='1'){await page.waitForFunction(()=>{const a=qaWaterWorld.farVegetation?.adapters;return a?.length&&a.every(x=>!x.preparationPending());},null,{timeout:90000});await page.waitForTimeout(1500);const lod=await page.evaluate(()=>qaWaterWorld.farVegetation.adapters.map(a=>({status:a.preparationStatus(),stats:a.stats})));await writeFile(out+'/angular-lod.json',JSON.stringify(lod,null,2));}
 await page.screenshot({path:out+'/elevated.png'});
 await writeFile(out+'/elevated-coverage.json',JSON.stringify(await page.evaluate(()=>({camera:qaWaterWorld.camera.position.toArray(),target:qaWaterWorld.controls.target.toArray(),coverage:qaWaterWorld.groundDetails?.audit?.(),range:qaWaterWorld.groundDetails?.farDistance})),null,2));
 if(process.env.WG_FERN_RANGE){
  const range=Number(process.env.WG_FERN_RANGE);if(!Number.isFinite(range)||range<48||range>200)throw Error('Invalid fern range');
  await page.evaluate(range=>{const q=qaWaterWorld.groundDetails;if(q?.cardStudy?.representation!=='native-holly-fern-balanced')throw Error('Approved ferns required');q.farDistance=range;q.uniforms.uCoverageFar.value=range;q.dirty=true;},range);
  await page.waitForTimeout(2000);await page.screenshot({path:out+'/elevated-ferns.png'});
  await writeFile(out+'/elevated-ferns.json',JSON.stringify(await page.evaluate(()=>({coverage:qaWaterWorld.groundDetails.audit(),range:qaWaterWorld.groundDetails.farDistance})),null,2));
 }
 if(process.env.WG_ANGULAR_MOTION==='1'){
  const motion=await page.evaluate(async(travel)=>{
   const w=qaWaterWorld,t=w.controls.target.clone(),frames=[],samples=[];let previous=performance.now(),start=previous;
   await new Promise(resolve=>{const tick=now=>{frames.push(now-previous);previous=now;const u=Math.min(1,(now-start)/24000),phase=(1-Math.cos(u*Math.PI*4))/2;
    const dx=travel?144*Math.sin(u*Math.PI):0;w.controls.target.set(t.x+dx,t.y,t.z);w.camera.position.set(t.x+dx+35+40*phase,t.y+25+90*phase,t.z+45+50*phase);w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld(true);w.syncChunks();
    if(!samples.length||now-start-samples.at(-1).ms>=500)samples.push({ms:now-start,chunks:w.chunks.size,chunkQueue:w.chunkStream.queue.length,chunkPreparing:w.chunkStream.preparing.size,chunkStats:{...w.chunkStream.stats},gpuMemory:{...w.renderer.info.memory},pending:w.farVegetation.adapters.filter(a=>a.preparationPending()).length,trees:w.farVegetation.adapters.map(a=>a.stats.standby?.trees??0),errors:w.farVegetation.adapters.flatMap(a=>[...a.stats.errors,...(a.stats.standby?.errors??[])])});
    if(u<1)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});
   frames.sort((a,b)=>a-b);return {frames:frames.length,p50:frames[Math.floor(frames.length*.5)],p95:frames[Math.floor(frames.length*.95)],p99:frames[Math.floor(frames.length*.99)],max:frames.at(-1),samples};
  },process.env.WG_ANGULAR_TRAVEL==='1');
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
 if(process.env.WG_TREE_DETAIL==='1'){
  const detail=await page.evaluate(()=>{const w=qaWaterWorld,t=w.controls.target;const trees=w.farVegetation.adapters.flatMap(a=>a.layer.current.trees).filter(v=>Number.isFinite(v.x)&&Number.isFinite(v.z));trees.sort((a,b)=>Math.hypot(a.x-t.x,a.z-t.z)-Math.hypot(b.x-t.x,b.z-t.z)||a.x-b.x||a.z-b.z);if(!trees.length)throw Error('No tree for detail view');const v=trees[0],y=w.nav.field.surface(v.x,v.z);t.set(v.x,y+3,v.z);w.camera.position.set(v.x+18,y+13,v.z+24);w.camera.lookAt(t);w.camera.updateMatrixWorld(true);w.syncChunks();return {tree:v.id,x:v.x,z:v.z,target:t.toArray(),camera:w.camera.position.toArray()};});
  await page.waitForTimeout(8000);await page.waitForFunction(()=>qaWaterWorld.farVegetation.adapters.every(a=>!a.preparationPending()),null,{timeout:90000});await page.waitForTimeout(1500);await page.screenshot({path:out+'/detail.png'});await writeFile(out+'/detail.json',JSON.stringify(detail,null,2));
 }
 if(process.env.WG_WATER_BED_AUDIT==='1'){
  const audit=await page.evaluate((offset)=>{
   const w=qaWaterWorld,near=[],far=[];w.scene.traverse(m=>{if(!m.userData.nativeFluid&&!m.userData.regionalWaterSurface)return;const u=w.renderer.properties.get(m.material)?.uniforms;if(!u?.qaBed)return;const row={kind:m.userData.regionalWaterSurface?'regional':m.userData.nativeFluid,bounds:u.qaBedBounds.value.toArray(),range:u.qaBedRange.value.toArray(),image:u.qaBed.value.image};(m.userData.regionalWaterSurface?far:near).push(row);});
   const sample=(bed,x,z)=>{const [mx,mz,sx,sz]=bed.bounds,im=bed.image,fx=(x-mx)/sx*(im.width-1),fz=(z-mz)/sz*(im.height-1);if(fx<0||fz<0||fx>im.width-1||fz>im.height-1)return null;const ix=Math.floor(fx),iz=Math.floor(fz),tx=fx-ix,tz=fz-iz,c=[];for(let k=0;k<4;k++){const get=(a,b)=>im.data[(Math.min(b,im.height-1)*im.width+Math.min(a,im.width-1))*4+k];c[k]=(get(ix,iz)*(1-tx)+get(ix+1,iz)*tx)*(1-tz)+(get(ix,iz+1)*(1-tx)+get(ix+1,iz+1)*tx)*tz;}return {height:bed.range[0]+(c[0]*256+c[1])/65535*bed.range[1],distance:c[2]/255*4,aux:c[3]/255*4};};
   const rows=[],t=w.controls.target;for(let z=t.z-80+offset*.61;z<=t.z+80;z+=2)for(let x=t.x-80+offset*.37;x<=t.x+80;x+=2){const info=w.nav.field.waterInfo(x,z);if(!info.inside)continue;const a=near.map(b=>sample(b,x,z)).find(Boolean),b=far.map(b=>sample(b,x,z)).find(Boolean);if(a&&b)rows.push({x,z,mask:info.mask,expected:info.level-Math.max(0,info.mask-.61)*3,near:a,far:b,heightDelta:b.height-a.height,shoreDelta:b.distance-a.distance});}
   return {rows,near:near.map(({image,...r})=>({...r,width:image.width,height:image.height})),far:far.map(({image,...r})=>({...r,width:image.width,height:image.height}))};
  },process.env.WG_WATER_BED_OFFGRID==='1'?1:0);await writeFile(out+'/bed-audit.json',JSON.stringify(audit,null,2));
 }
 if(process.env.WG_WATER_COMPOSITION==='1'){
  const changed=await page.evaluate(()=>{const w=qaWaterWorld,materials=new Set();w.scene.traverse(m=>{if((m.userData.nativeFluid||m.userData.regionalWaterSurface)&&m.material)materials.add(m.material);});for(const material of materials){const compile=material.onBeforeCompile,key=material.customProgramCacheKey();material.onBeforeCompile=(s,r)=>{compile.call(material,s,r);if(!s.fragmentShader.includes('#include <opaque_fragment>'))throw Error('Missing water output');s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a=1.;\n#include <opaque_fragment>');};material.customProgramCacheKey=()=>key+':qa-opaque-composition';material.needsUpdate=true;}return materials.size;});
  await page.waitForTimeout(2000);await page.screenshot({path:out+'/opaque-water-diagnostic.png'});await writeFile(out+'/composition.json',JSON.stringify({changed,diagnosticOnly:true,scope:'Force water alpha to one, preserving RGB shader and geometry. Not a candidate visual change.'}));
 }
 if(process.env.WG_WATER_DEPTH_TEST==='1'){
  const changed=await page.evaluate(()=>{let n=0;qaWaterWorld.scene.traverse(m=>{if(m.userData.regionalWaterSurface){m.material.depthTest=false;m.material.depthWrite=false;m.renderOrder=1000;n++;}});return n;});
  await page.waitForTimeout(500);await page.screenshot({path:out+'/regional-no-depth-test.png'});await writeFile(out+'/depth-test.json',JSON.stringify({changed,diagnosticOnly:true}));
 }
 if(process.env.WG_WATER_TERRAIN_AUDIT==='1'){
  const result=await page.evaluate(async()=>{const THREE=await import('/node_modules/three/build/three.module.js'),w=qaWaterWorld,near=[],far=[];w.scene.updateMatrixWorld(true);w.scene.traverse(m=>{if(m.userData.ground)near.push(m);if(m.userData.farGround)far.push(m);});const ray=new THREE.Raycaster(),rows=[],t=w.controls.target;ray.ray.direction.set(0,-1,0);for(let z=t.z-80+.61;z<t.z+80;z+=4)for(let x=t.x-80+.37;x<t.x+80;x+=4){const info=w.nav.field.waterInfo(x,z);if(!info.inside)continue;ray.ray.origin.set(x,100,z);const a=ray.intersectObjects(near,false)[0],b=ray.intersectObjects(far,false)[0];rows.push({x,z,level:info.level,mask:info.mask,near:a?.point.y,far:b?.point.y});}return {rows,nearMeshes:near.length,farMeshes:far.length};});await writeFile(out+'/terrain-audit.json',JSON.stringify(result,null,2));
  await page.evaluate(()=>qaWaterWorld.scene.traverse(m=>{if(m.userData.ground)m.visible=false;}));await page.waitForTimeout(300);await page.screenshot({path:out+'/without-near-ground.png'});
 }
 if(process.env.WG_WATER_HIDE_HORIZON==='1'){
  const layers=await page.evaluate(()=>{const rows=[];qaWaterWorld.scene.traverse(m=>{if(m.userData.nativeHorizon){rows.push({kind:m.userData.nativeHorizon,visible:m.visible,vertices:m.geometry?.attributes.position.count});m.visible=false;}});return rows;});await page.waitForTimeout(300);await page.screenshot({path:out+'/without-horizon.png'});await writeFile(out+'/horizon-layers.json',JSON.stringify(layers,null,2));
 }
 if(process.env.WG_WATER_PIXEL_AUDIT==='1'){
  const result=await page.evaluate(async()=>{const THREE=await import('/node_modules/three/build/three.module.js'),w=qaWaterWorld,meshes=[],ray=new THREE.Raycaster();w.scene.updateMatrixWorld(true);w.scene.traverse(m=>{if(m.userData.ground||m.userData.farGround||m.userData.nativeFluid||m.userData.regionalWaterSurface)meshes.push(m);});return Array.from({length:24*14},(_,i)=>[20+(i%24)*40,140+Math.floor(i/24)*40]).map(([x,y])=>{ray.setFromCamera(new THREE.Vector2(x/1280*2-1,1-y/720*2),w.camera);return {pixel:[x,y],hits:ray.intersectObjects(meshes,false).slice(0,5).map(h=>({point:h.point.toArray(),distance:h.distance,tags:{ground:h.object.userData.ground,far:h.object.userData.farGround,fluid:h.object.userData.nativeFluid,regional:h.object.userData.regionalWaterSurface},material:h.object.material.uuid,transparent:h.object.material.transparent,uniforms:Object.fromEntries(Object.entries(h.object.material.userData.paintUniforms??{}).filter(([k])=>['uTime','uNight','uExposure','uWaterScale','uAmplitude','uInk0','uInk1','uFluidClip'].includes(k)).map(([k,v])=>[k,v.value?.toArray?v.value.toArray():v.value])),field:w.nav.field.waterInfo(h.point.x,h.point.z)}))};});});await writeFile(out+'/pixel-audit.json',JSON.stringify(result,null,2));
 }
 if(process.env.WG_WATER_DEBUG_BED==='1'){
  const changed=await page.evaluate(()=>{let n=0;qaWaterWorld.scene.traverse(m=>{if(!(m.userData.nativeFluid||m.userData.regionalWaterSurface))return;const material=m.material,compile=material.onBeforeCompile,key=material.customProgramCacheKey();material.onBeforeCompile=(s,r)=>{compile.call(material,s,r);if(!s.fragmentShader.includes('float qaDepth='))throw Error('Missing depth diagnostic anchor');s.fragmentShader=s.fragmentShader.replace('#include <opaque_fragment>','#include <opaque_fragment>\ngl_FragColor=vec4(clamp(qaDepth/1.17,0.,1.),qaTexel.b,0.,1.);');};material.customProgramCacheKey=()=>key+':qa-bed-channels';material.needsUpdate=true;n++;});return n;});await page.waitForTimeout(2000);await page.screenshot({path:out+'/bed-channels.png'});await writeFile(out+'/bed-channels.json',JSON.stringify({changed,red:'optical depth / 1.17',green:'shore distance / 4',diagnosticOnly:true}));
 }
 if(process.env.WG_WATER_UNSHADOWED==='1'){
  const changed=await page.evaluate(()=>{let n=0;qaWaterWorld.scene.traverse(m=>{if(!(m.userData.nativeFluid||m.userData.regionalWaterSurface))return;const material=m.material,compile=material.onBeforeCompile,key=material.customProgramCacheKey();material.onBeforeCompile=(s,r)=>{compile.call(material,s,r);const target='outgoingLight=sRGBTransferEOTF(vec4(nativeFluid4(';if(!s.fragmentShader.includes(target))throw Error('Missing lighting diagnostic anchor');s.fragmentShader=s.fragmentShader.replace(target,'fluidVisibility=1.;'+target);};material.customProgramCacheKey=()=>key+':qa-no-water-shadow';material.needsUpdate=true;n++;});return n;});await page.waitForTimeout(2000);await page.screenshot({path:out+'/unshadowed-water.png'});await writeFile(out+'/unshadowed-water.json',JSON.stringify({changed,diagnosticOnly:true}));
 }
 if(process.env.WG_REGIONAL_ALL==='1'){
  await page.evaluate(()=>{qaWaterWorld.scene.traverse(m=>{if(m.userData.nativeFluid)m.visible=false;if(m.userData.regionalWaterSurface){const compile=m.material.onBeforeCompile,key=m.material.customProgramCacheKey();m.material.onBeforeCompile=(s,r)=>{compile(s,r);s.fragmentShader=s.fragmentShader.replace('if(all(greaterThanEqual(regionalXZ','if(false&&all(greaterThanEqual(regionalXZ');};m.material.customProgramCacheKey=()=>key+':qa-all';m.material.needsUpdate=true;}});});
  await page.waitForTimeout(500);await page.screenshot({path:out+'/regional-all.png'});
 }
 if(process.env.WG_WATER_PROGRAM==='1'){
  const audit=await page.evaluate(()=>{const w=qaWaterWorld,items=[];w.scene.traverse(m=>{if(!m.userData.regionalWaterSurface&&m.userData.nativeFluid!=='chunk')return;const mat=m.material,p=w.renderer.properties.get(mat),program=p.currentProgram,u=mat.userData.paintUniforms,ancestors=[];for(let a=m;a;a=a.parent)ancestors.push({name:a.name,visible:a.visible});const boundUniforms=Object.fromEntries(Object.entries(p.uniforms??{}).filter(([k])=>/qaBed|fog|GlobalWaterSlope|uWorldOrigin/.test(k)).map(([k,v])=>[k,v.value?.isTexture?{uuid:v.value.uuid,width:v.value.image?.width,height:v.value.image?.height,first:Array.from(v.value.image?.data?.slice(0,16)??[]),minFilter:v.value.minFilter,magFilter:v.value.magFilter,colorSpace:v.value.colorSpace}:v.value?.toArray?v.value.toArray():v.value]));items.push({boundUniforms,regional:!!m.userData.regionalWaterSurface,ancestors,drawRange:m.geometry.drawRange,program:program?.id,key:mat.customProgramCacheKey(),transparent:mat.transparent,opacity:mat.opacity,uniforms:Object.fromEntries(Object.entries(u??{}).map(([k,v])=>[k,v.value?.isTexture?{uuid:v.value.uuid}:v.value?.toArray?v.value.toArray():v.value])),vertex:program?w.renderer.getContext().getShaderSource(program.vertexShader):null,fragment:program?w.renderer.getContext().getShaderSource(program.fragmentShader):null});});return items;});
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
