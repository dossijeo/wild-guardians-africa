import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.env.WG_WATER_OUT??'docs/qa/post-beasts-20261026/water-before';
const seed=Number(process.env.WG_WATER_SEED??37);
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
try{
 if(process.env.WG_FAR_MASK_STEP||process.env.WG_FAR_GEOMETRY_STEP){const mask=Number(process.env.WG_FAR_MASK_STEP??4),geometry=Number(process.env.WG_FAR_GEOMETRY_STEP??32);if(![1,2,4].includes(mask)||![8,16,32].includes(geometry))throw Error('Unsupported far ground sample step');await page.route('**/src/rendering/far-vegetation-profile.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('groundColorStep:4',`groundColorStep:${mask}`).replace('groundStep:32',`groundStep:${geometry}`)});});}
 if(process.env.WG_NETWORK_VARIANT==='8')await page.route('**/src/app/wild-engine-world.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('state.mangroveChannels=true','state.mangroveNetwork=true')});});
 await page.route('**/tools/experiments/native-far-ground.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('const mesh=new THREE.Mesh(geometry,material);','const mesh=new THREE.Mesh(geometry,material);mesh.userData.qaSampling={step:data.step,mapStep:data.colorMap?.step,vertices:data.positions.length/3,mapWidth:data.colorMap?.width};')});});
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('this.raycaster=new','globalThis.qaWaterWorld=this;this.raycaster=new')});});
 await page.addInitScript(()=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',music:0,sfx:0})));
 await page.goto((process.env.WG_QA_URL??'http://127.0.0.1:5218')+'/?qa-seed='+seed+(process.env.WG_ANGULAR_LOD==='1'?'&farAngularLod=1':''),{waitUntil:'domcontentloaded',timeout:90000});
 const menu=page.frameLocator('#native-menu');await menu.locator('#loading').waitFor({state:'hidden',timeout:90000});
 await menu.locator('body').evaluate(()=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome:'manglares',culture:'mapungubwe'},location.origin));
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
  const farGround=[];w.scene.traverse(m=>{if(m.userData.qaSampling)farGround.push(m.userData.qaSampling);});const waters=[];w.scene.traverse(m=>{if(m.userData.nativeFluid)waters.push({kind:m.userData.nativeFluid,vertices:m.geometry?.attributes.position.count,bounds:m.geometry?.boundingBox});});
  return {farGround,runtime:w.spatialSession?.runtime??null,crossOriginIsolated:globalThis.crossOriginIsolated,seed:w.state.seed,channels:w.state.mangroveChannels===true,network:w.state.mangroveNetwork===true,visualSearch:w.visualSearch,coverage:w.groundDetails?.audit?.()??null,target:o.toArray(),camera:w.camera.position.toArray(),points,waters,fieldKeys:Object.keys(f),snapshot:JSON.stringify(w.state)};
 });
 await writeFile(out+'/report.json',JSON.stringify({farMaskStep:Number(process.env.WG_FAR_MASK_STEP??4),farGeometryStep:Number(process.env.WG_FAR_GEOMETRY_STEP??32),data,errors},null,2));
 await page.evaluate(()=>{const w=qaWaterWorld,t=w.controls.target;w.camera.position.set(t.x+75,t.y+95,t.z+95);w.camera.lookAt(t);w.camera.updateMatrixWorld(true);});
 await page.waitForTimeout(2000);
 if(process.env.WG_ANGULAR_LOD==='1'){await page.waitForFunction(()=>{const a=qaWaterWorld.farVegetation?.adapters;return a?.length&&a.every(x=>!x.preparationPending());},null,{timeout:90000});await page.waitForTimeout(1500);const lod=await page.evaluate(()=>qaWaterWorld.farVegetation.adapters.map(a=>({status:a.preparationStatus(),stats:a.stats})));await writeFile(out+'/angular-lod.json',JSON.stringify(lod,null,2));}
 await page.screenshot({path:out+'/elevated.png'});
 if(process.env.WG_WATER_HIDE_FAR==='1'){await page.evaluate(()=>{qaWaterWorld.scene.traverse(m=>{if(m.userData.farGround)m.visible=false;});});await page.waitForTimeout(300);await page.screenshot({path:out+'/elevated-without-far-ground.png'});}
 console.log(JSON.stringify({seed:data.seed,target:data.target,wet:data.points.filter(p=>p.water.inside).length,total:data.points.length,waters:data.waters.length,errors}));
}catch(error){await writeFile(out+'/failure.json',JSON.stringify({error:String(error),errors,text:await page.locator('body').innerText().catch(()=>null)},null,2));await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw error;}finally{await page.unrouteAll({behavior: 'wait'});await browser.close();}
