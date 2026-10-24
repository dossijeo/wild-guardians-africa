import {globalNativeQuery} from './global-native-recipe-20261022.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out=process.env.WG_REVIEW_OUT??'docs/qa/global-visual-lab/full-background-review-20261022';await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const biome of (process.env.WG_REVIEW_BIOMES??'sabana,gran-rio,manglares,desierto,volcanes,gran-canon').split(','))for(const variant of ['after']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 if(variant==='before')await page.route('**/src/rendering/natural-water-edges.js*',async route=>{
 const response=await route.fetch();let body=(await response.text()).replace("if(world.state.biome==='manglares'){","if(false){");const anchor='};material.customProgramCacheKey=';if(!body.includes(anchor))throw Error('Depth material hook missing');
 const replacement="vec2 bodyUV=(worldPatternPosition(worldP).xz-qaBedBounds.xy)/qaBedBounds.zw;bodyUV=(bodyUV*(qaBedSize-1.)+.5)/qaBedSize;vec2 bodyRG=texture2D(qaBed,bodyUV).rg;float bodyHeight=qaBedRange.x+dot(bodyRG,vec2(65280.,255.))/65535.*qaBedRange.y;float bodyDepth=max(0.,worldP.y-bodyHeight);float bodyBlend=smoothstep(.10,.85,bodyDepth);vec3 base=mix(uInk0*.72,vec3(.16,.29,.22),bodyBlend);";
 body=body.replace(anchor,`shader.fragmentShader=shader.fragmentShader.replace('vec3 base=uInk0*.72;',${JSON.stringify(replacement)}).replace('base=mix(uInk0*.72,sediment,shallow*.85);','base=mix(base,sediment,shallow*.85);');`+anchor);
 await route.fulfill({response,body});});
 if(variant==='worldbank')await page.route('**/src/rendering/horizon.js*',async route=>{
 const response=await route.fetch();let body=await response.text();const anchor='this.group=group;this.scene.add(group);';if(!body.includes(anchor))throw Error('Horizon publish anchor missing');
 body="import {prepareCanyonWater,prepareAssetWater} from '/tools/experiments/qa-canyon-water-"+variant+"-20261022.js';\n"+body.replace(anchor,"for(const mesh of group.children)if(mesh.userData.nativeHorizon==='water'){prepareCanyonWater(globalThis.qaCampaignWorld,mesh.geometry,region.cx,region.cz,mesh.material);mesh.material=mesh.geometry.userData.qaMaterial??mesh.material;}"+anchor);await route.fulfill({response,body});
 });
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(variant==='worldbank'&&!body.includes('if(waterGeometry){prepareMangroveBank'))throw Error('Resident water anchor missing');if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:(variant==='worldbank'?"import {prepareCanyonWater,prepareAssetWater} from '/tools/experiments/qa-canyon-water-"+variant+"-20261022.js';\n"+body.replace('if(waterGeometry){prepareMangroveBank', 'if(waterGeometry){prepareCanyonWater(this,waterGeometry,cx,cz);prepareMangroveBank').replace('new THREE.Mesh(waterGeometry,waterMaterial)','new THREE.Mesh(waterGeometry,waterGeometry.userData.qaMaterial??waterMaterial)').replace("water.userData.nativePropSlot=i;if(this.naturalWaterEdges)prepareNaturalAssetWater(this,water,cx,cz);group.add(water);","water.userData.nativePropSlot=i;prepareAssetWater(this,water,cx,cz);group.add(water);"):body).replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:true})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&spatialFar=1&'+globalNativeQuery+'&waterPalette=regional&riverBank=soil&mangroveShore=sediment'+'&waterEdges=natural'+'&waterCore=opaque');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>globalThis.qaFarLoadError||(document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state),null,{timeout:180000}).catch(async e=>{await writeFile(out+'/load-failure.json',JSON.stringify(await page.evaluate(()=>({text:document.body.innerText,far:globalThis.qaCampaignWorld?.farVegetation?.stats,adapters:globalThis.qaCampaignWorld?.farVegetation?.adapters?.map(a=>({stats:a.stats,pending:a.preparationStatus()}))})),null,2));throw Error(errors.join('\n')+'\n'+e.message)});
 const failure=await page.evaluate(()=>globalThis.qaFarLoadError);if(failure){await writeFile(out+'/load-failure.json',JSON.stringify({error:failure},null,2));throw Error(failure);}
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.state.elapsed=2;w.simElapsed=2;w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});




 await page.evaluate(({biome,canyonTarget})=>{
 const w=window.qaCampaignWorld;
 if(biome==='sabana')w.controls.target.set(135,9.400129699707032,45);
 if(biome==='gran-rio')w.controls.target.set(87.83156862745099,7.077262442364413,15.827254901960785);
 if(biome==='gran-canon')w.controls.target.fromArray(canyonTarget);
 if(biome!=='gran-canon'&&biome!=='desierto'){const f=w.nav.field,o=w.controls.target.clone();let best=null;for(let z=-100;z<=100;z+=2)for(let x=-100;x<=100;x+=2){const px=o.x+x,pz=o.z+z,info=f.waterInfo(px,pz);if(info.inside&&(!best||x*x+z*z<best.d))best={x:px,z:pz,d:x*x+z*z};}if(best)w.controls.target.set(best.x,f.surface(best.x,best.z)+.9,best.z);}
 if(w.groundDetails.audit)w.groundDetails.timeOverride=2;
 },{biome,canyonTarget:[-47.868919372558594, 3.259999895095825, 102]});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;const o=w.controls.target.toArray();window.qaSandPath=[[22,16,18],[6,34,6],[-18,9,22]].map(([x,y,z])=>[o[0]+x,Math.max(o[1]+y,w.nav.field.surface(o[0]+x,o[2]+z)+1.2),o[2]+z]);w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();});

  for(const phase of phases){
   const dir=`${out}/${biome}-${quality}-${variant}-${phase}`;await mkdir(dir,{recursive:true});const frames=[];
   await page.evaluate(async phase=>{const w=window.qaCampaignWorld;w.state.time=phase==='day'?150:350;w.state.day=1;w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();for(const group of w.chunks.values())for(const batch of group.userData.lodBatches??[])batch.key=null;w.render(1/30);await Promise.all([...w.objects.values()].map(o=>o.userData.actorReady).filter(Boolean));for(let i=0;i<12;i++)w.render(1/30)},phase);
   for(let i=0;i<3;i++){
    const frame=await page.evaluate(async i=>{const w=window.qaCampaignWorld;w.camera.position.fromArray(window.qaSandPath[i]);w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();w.render(1/30);await Promise.all([...w.objects.values()].map(o=>o.userData.actorReady).filter(Boolean));const {prepareInitialFarWorld}=await import('/src/app/far-world-loading.js');await prepareInitialFarWorld(w);for(let settle=0;settle<12;settle++)w.render(1/30);if(!w.farVegetation?.enabled||!w.farVegetation.adapters.length||w.farVegetation.adapters.some(a=>!a.layer.current))throw Error('Full far background not ready '+JSON.stringify({enabled:w.farVegetation?.enabled,count:w.farVegetation?.adapters?.length,stats:w.farVegetation?.stats}));if(!w.scene.getObjectByName('biome-2d-backdrop')?.visible)throw Error('Mountain backdrop missing');if(!w.sky.atmosphere)throw Error('Native atmosphere option not enabled');return {farBackground:{mountainsVisible:w.scene.getObjectByName('biome-2d-backdrop').visible,enabled:w.farVegetation.enabled,stats:w.farVegetation.stats,adapters:w.farVegetation.adapters.map(a=>({ready:!!a.layer.current,stats:a.stats}))},origin:[w.renderOrigin.x,w.renderOrigin.z],i,palette:globalThis.qaEnvironmentPalette??null,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),time:w.state.time,glError:w.renderer.getContext().getError(),coverage:w.groundDetails.audit?.()??null,settings:{riverYards:w.biomeGround.riverYards,moss:w.biomeGround.mangroveMoss,substrate:w.biomeGround.mangroveSubstrate,canyonSoft:w.biomeGround.canyonSandSoft,canyonNormals:w.horizon?.smoothCanyonNormals,desertMeso:w.toon.desertMeso},memory:{...w.renderer.info.memory},calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,data:w.renderer.domElement.toDataURL('image/png').split(',')[1]}},i);
    if(frame.glError)throw Error('WebGL error '+frame.glError);await writeFile(`${dir}/${String(i).padStart(4,'0')}.png`,Buffer.from(frame.data,'base64'));delete frame.data;frames.push(frame);
   }
   if(errors.length)throw Error(errors.join('\n'));records.push({biome,quality,variant,phase,initialLodReset:true,frames,errors:[...errors]});await writeFile(out+'/captures.json',JSON.stringify({study:'Six-biome complete scene review including native far impostors and HQ mountain backdrops; no timing claim.',seed:712,resolution:[1280,720],views:['game','elevated','reverse'],note:'Real paused campaign settlement, seed 712; identical poses and visual time, settled chunks. Static artistic review, not a performance benchmark.',records},null,2)+'\n');console.log(biome,quality,variant,phase,'captured');
  }
 await page.close();
 }}finally{await browser.close()}
