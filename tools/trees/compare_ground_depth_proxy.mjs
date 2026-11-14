import fs from 'node:fs';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE??'playwright');
const biome=process.env.REVIEW_BIOME??'sabana',browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/spatial-savanna.wasm*',route=>new URL(route.request().url()).search?route.continue():route.fulfill({path:'.cache/spatial-dynamic-test.wasm',contentType:'application/wasm'}));
 await page.goto('http://127.0.0.1:5175/tests/browser/guardian-combat.html?biome='+encodeURIComponent(biome)+'&culture=mapungubwe&lightingReview&productionFarWarm&wildEngineThreads=0&depthGroundProxy&treeReview');
 await page.waitForFunction(()=>window.treeReview&&document.querySelector('#status')?.textContent.includes('"ready": true'),null,{timeout:180000});
 const result=await page.evaluate(async({streamCheck})=>{
  const {DepthReadback}=await import('/tests/browser/depth-readback.js'),{withRenderOrigin,renderOriginBounds}=await import('/src/rendering/render-origin.js'),r=window.treeReview,w=r.world,review=window.depthGroundReview,pass=w.destructionPass,reader=new DepthReadback(w.renderer),rows=[];
  r.setManual(true);
  const center=r.state.structures.find(s=>s.kind==='center'),height=r.nav.field.surface(center.x,center.z),size={x:w.renderer.domElement.width,y:w.renderer.domElement.height};
  function sample(proxy){
   const saved=[];review.enabled=proxy;
   // Scene callbacks may make previously hidden batches visible during this
   // same draw. Mask the entire tree, including currently hidden descendants.
   if(!proxy)w.scene.traverse(o=>{if(!(o.isMesh||o.isLine||o.isPoints||o.isSprite)||o.userData.ground||o.userData.nativeHorizon==='terrain')return;saved.push([o,o.layers.mask]);o.layers.mask=0;});
   try{const before=w.renderer.info.programs.map(p=>p.cacheKey),start=performance.now();pass.captureDepth(w.camera,w.scene);const ms=performance.now()-start,added=w.renderer.info.programs.map(p=>p.cacheKey).filter(key=>!before.includes(key)),draws=w.renderer.info.render.calls,triangles=w.renderer.info.render.triangles;return {bytes:reader.read(pass.smokeDepth.depthTexture,size.x,size.y),ms,added,draws,triangles};}
   finally{for(const [o,mask] of saved)o.layers.mask=mask;}
  }
  function compare(a,b){let different=0,nonuniform=0;for(let i=0;i<a.length;i+=4){if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2]||a[i+3]!==b[i+3])different++;if(a[i]!==a[0]||a[i+1]!==a[1]||a[i+2]!==a[2]||a[i+3]!==a[3])nonuniform++;}return {different,nonuniform,pixels:a.length/4};}
  try{
   for(const [dx,dy,dz] of [[7,4,8],[35,18,20],[-40,12,-20]]){
    w.controls.target.set(center.x,height+1,center.z);w.camera.position.set(center.x+dx,height+dy,center.z+dz);w.controls.update();w.scene.updateMatrixWorld(true);w.camera.updateMatrixWorld(true);
    const a=sample(false),b=sample(true),c=sample(false);rows.push({camera:[dx,dy,dz],candidate:compare(a.bytes,b.bytes),control:compare(a.bytes,c.bytes),meshes:review.meshes});
   }
   withRenderOrigin({scene:w.scene,camera:w.camera,origin:{x:48,z:-48},minMax:()=>renderOriginBounds(w.scene),minSize:()=>[...w.terrainMeshes,...(w.horizon?.group?.children??[])].map(m=>m.material?.userData.biomeGround?.uGroundRect.value).filter(Boolean)},()=>{
    const a=sample(false),b=sample(true),c=sample(false);rows.push({camera:'offset-origin',candidate:compare(a.bytes,b.bytes),control:compare(a.bytes,c.bytes),meshes:review.meshes});
   });
   if(streamCheck){
    const before=new Set(w.chunks.keys()),deadline=performance.now()+90000;
    w.camera.position.x+=192;w.camera.position.z+=96;w.controls.target.x+=192;w.controls.target.z+=96;w.controls.update();
    let added=0,removed=0;
    do{
     w.syncChunks();await new Promise(resolve=>requestAnimationFrame(resolve));
     added=[...w.chunks.keys()].filter(key=>!before.has(key)).length;removed=[...before].filter(key=>!w.chunks.has(key)).length;
    }while((!added||!removed)&&performance.now()<deadline);
    if(!added||!removed)throw Error(`Streaming did not replace terrain: added=${added}, removed=${removed}`);
    w.scene.updateMatrixWorld(true);w.camera.updateMatrixWorld(true);
    const snapshot=()=>[...w.terrainMeshes,...(w.horizon?.group?.children??[]).filter(o=>o.userData.nativeHorizon==='terrain')].map(o=>({id:o.uuid,world:o.matrixWorld.toArray(),local:o.matrix.toArray(),visible:o.visible,parentVisible:o.parent?.visible,geometry:o.geometry.uuid,positionVersion:o.geometry.attributes.position?.version,material:o.material.uuid,uniforms:Object.fromEntries(Object.entries(o.material.userData.biomeGround??{}).flatMap(([k,u])=>{const v=u?.value;if(typeof v==='number'||typeof v==='boolean')return [[k,v]];if(v?.isVector2||v?.isVector3||v?.isVector4)return [[k,v.toArray()]];return [];}))}));
    const s0=snapshot(),a=sample(false),s1=snapshot(),b=sample(true),s2=snapshot(),c=sample(false),d=sample(false);
    rows.push({camera:'streaming',added,removed,candidate:compare(a.bytes,b.bytes),control:compare(a.bytes,c.bytes),candidateAfter:compare(c.bytes,b.bytes),settledControl:compare(c.bytes,d.bytes),captures:[a,b,c,d].map(({ms,added,draws,triangles})=>({ms,added,draws,triangles})),sceneChanges:{baseline:JSON.stringify(s0)!==JSON.stringify(s1),proxy:JSON.stringify(s1)!==JSON.stringify(s2),before:s0,afterBaseline:s1,afterProxy:s2},meshes:review.meshes});
   }
  }finally{reader.dispose();review.enabled=true;}
  return {authority:r.authority,network:r.state.mangroveNetwork??false,fallbacks:review.fallbacks,reason:review.reason,rows};
 },{streamCheck:process.env.STREAM_CHECK==='1'});
 const out=`docs/lighting/tree-near-retexture/performance/${biome}-ground-depth-proxy-readback${process.env.STREAM_CHECK==='1'?'-streaming':''}${process.env.RUN_SUFFIX??''}.json`;fs.writeFileSync(out,JSON.stringify({...result,errors},null,2));console.log(JSON.stringify({...result,rows:result.rows.map(({sceneChanges,...row})=>({...row,sceneChanges:sceneChanges?{baseline:sceneChanges.baseline,proxy:sceneChanges.proxy}:undefined})),errors}));
 if(errors.length||result.rows.some(row=>!row.candidate.nonuniform||row.control.different||row.candidate.different))process.exitCode=1;
}finally{await browser.close();}
