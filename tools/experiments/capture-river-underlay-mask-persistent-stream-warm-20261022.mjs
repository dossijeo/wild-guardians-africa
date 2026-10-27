import {globalNativeQuery} from './global-native-recipe-20261022.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/river-underlay-mask-persistent-stream-warm-20261022';await mkdir(out,{recursive:true});const records=[];const phases=['day-cold','day-warm'];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const biome of (process.env.WG_REVIEW_BIOMES??'gran-rio').split(','))for(const variant of ['control','persistent']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];page.on("console",m=>{if(m.type()==="error")console.error(m.text())});page.on("pageerror",e=>console.error(e.message));
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 if(variant==='filtered')await page.route('**/src/rendering/continuous-grass.js*',async route=>{const response=await route.fetch();let body=await response.text();const anchor='textureLod(uCoverageColor,tileUV,2.)';if(!body.includes(anchor))throw Error('Coverage pigment anchor missing');body=body.replace(anchor,'textureLod(uCoverageColor,tileUV,5.)');await route.fulfill({response,body});});
 if(variant!=='baseline-off')await page.route('**/src/rendering/global-river-soil.js*',async route=>{const response=await route.fetch();let body=await response.text();
 body=body.replace('uniform sampler2D uQaSoilBase,uQaSoilNormal,uQaSoilARH;', 'uniform sampler2D uQaSoilBase,uQaSoilNormal,uQaSoilARH;uniform vec2 uQaCoverageUnderlay;uniform sampler2D uQaCoverageMask;');const before='materialCover410=amount;';
 const after=`materialCover410=amount;float selectedCover=texture(uQaCoverageMask,((worldP.xz-uGroundRect.xy)/.5+.5)/97.).r;float coveredNear=smoothstep(.02,.30,selectedCover)*uGroundMapped*uQaCoverageUnderlay.x*(1.-smoothstep(uQaCoverageUnderlay.y-18.,uQaCoverageUnderlay.y,length(cameraPosition.xz-worldP.xz)))*smoothstep(.20,.32,ctx.r)*smoothstep(.20,.32,ctx.b)*(1.-smoothstep(.08,.25,wear));
 tex=textureGrad(uGroundDetailMap,uv,dx*mix(1.,8.,coveredNear),dy*mix(1.,8.,coveredNear)).rgb;`;
 body=body.replace('if(!source.includes(before))throw', 'if(!source.includes(before))console.error(before);if(!source.includes(before))throw');body=body.replace('const edits=[','const edits=['+JSON.stringify([before,variant==='control'?after.replace('float coveredNear=','float coveredNear=0.*'):after])+',');await route.fulfill({response,body});});
 if(variant!=='baseline-off'){
 await page.route('**/src/rendering/biome-ground.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('this.assertOpen();\n    const bo=chunkBounds(cx,cz);','this.assertOpen();if(!this.qaEmptyCoverage){const texture=new THREE.DataTexture(new Uint8Array([0]),1,1,THREE.RedFormat);texture.needsUpdate=true;this.masks.add(texture);this.qaEmptyCoverage={value:texture};}\n    const bo=chunkBounds(cx,cz);');body=body.replace('return {...(this.riverSoil?', 'return {uQaCoverageMask:{value:this.qaEmptyCoverage.value},uQaCoverageUnderlay:(this.qaCoverageUnderlay??={value:new THREE.Vector2(0,48)}),...(this.riverSoil?');await route.fulfill({response,body});});
 await page.route('**/src/rendering/continuous-grass.js*',async route=>{const response=await route.fetch();let body=await response.text();body="import {syncSelectedGrassMask,disposeSelectedGrassMask} from '/tools/experiments/qa-selected-grass-mask-20261022.js';\n"+body;body=body.replace('q.stats.selectionMs+=performance.now()-start;', 'syncSelectedGrassMask(world,q,bins);q.stats.selectionMs+=performance.now()-start;');body=body.replace('q.disposed=true;q.enabled=false;', 'disposeSelectedGrassMask(q);q.disposed=true;q.enabled=false;');body=body.replace('if(q.disposed)return;q.uniforms.uCoverageTime', 'if(q.disposed)return;world.biomeGround.qaCoverageUnderlay?.value.set(q.group.visible&&q.variant!=="A"&&q.quality!=="muy_baja"&&!q.stats.overflow?1:0,q.farDistance);q.uniforms.uCoverageTime');body=body.replace('q.disposed=true;q.enabled=false;', 'q.disposed=true;world.biomeGround.qaCoverageUnderlay?.value.set(0,q.farDistance);q.enabled=false;');await route.fulfill({response,body});});
 }
 await page.route('**/tools/experiments/qa-selected-grass-mask-20261022.js*',async route=>{const response=await route.fetch({url:'http://127.0.0.1:5190/tools/experiments/qa-selected-grass-mask-'+'persistent'+'-20261022.js'});await route.fulfill({response});});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});





 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&'+globalNativeQuery);
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000}).catch(async e=>{console.error(await page.locator('body').innerText());console.error(errors);console.error(await page.evaluate(()=>window.qaCampaignWorld?.shaderFailure?.current?.details));throw e});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.state.elapsed=2;w.simElapsed=2;w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 
 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});




 await page.evaluate(({biome,canyonTarget})=>{
 const w=window.qaCampaignWorld;
 if(biome==='sabana')w.controls.target.set(135,9.400129699707032,45);
 if(biome==='gran-rio')w.controls.target.set(87.83156862745099,7.077262442364413,15.827254901960785);
 if(biome==='gran-canon')w.controls.target.fromArray(canyonTarget);
 if(w.groundDetails.audit)w.groundDetails.timeOverride=2;
 },{biome,canyonTarget:[-47.868919372558594, 3.259999895095825, 102]});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;const o=w.controls.target.toArray();window.qaSandPath=[[22,16,18],[6,34,6],[-18,9,22]].map(([x,y,z])=>[o[0]+x,Math.max(o[1]+y,w.nav.field.surface(o[0]+x,o[2]+z)+1.2),o[2]+z]);w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();});

  for(const phase of phases){
   const dir=`${out}/${biome}-${quality}-${variant}-${phase}`;await mkdir(dir,{recursive:true});const frames=[];
   await page.evaluate(async phase=>{const w=window.qaCampaignWorld;w.state.time=phase.startsWith('day')?150:350;w.state.day=1;w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();for(const group of w.chunks.values())for(const batch of group.userData.lodBatches??[])batch.key=null;w.render(1/30);await Promise.all([...w.objects.values()].map(o=>o.userData.actorReady).filter(Boolean));for(let i=0;i<12;i++)w.render(1/30)},phase);
   for(let i=0;i<5;i++){
    const frame=await page.evaluate(async i=>{const w=window.qaCampaignWorld;window.qaStreamOrigin??=w.controls.target.toArray();const origin=window.qaStreamOrigin,offset=[0,48,96,48,0][i];w.controls.target.set(origin[0]+offset,origin[1],origin[2]);w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;w.camera.position.copy(w.controls.target).add({x:22,y:16,z:18});w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();for(let settle=0;settle<12;settle++)w.render(1/30);const masks=w.groundDetails.persistentMask.raster.selectedMasks;const stale=[...masks.keys()].filter(k=>!w.chunks.has(k));if(stale.length)throw Error('Stale mask chunks '+stale);for(const [k,e]of masks){const material=w.chunks.get(k).children.find(m=>m.userData.ground)?.material;if(material?.userData.biomeGround.uQaCoverageMask.value!==e.texture)throw Error('Mask ownership mismatch '+k);}if(!w.sky.atmosphere)throw Error('Native atmosphere option not enabled');const maskHashes=[...masks].map(([key,e])=>{let hash=2166136261;for(const byte of e.data)hash=Math.imul(hash^byte,16777619);return [key,hash>>>0]}).sort();return {i,maskHashes,chunkKeys:[...w.chunks.keys()],maskKeys:[...masks.keys()],stale,palette:globalThis.qaEnvironmentPalette??null,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),time:w.state.time,glError:w.renderer.getContext().getError(),coverage:w.groundDetails.audit?.()??null,underlay:w.biomeGround.qaCoverageUnderlay?.value.toArray()??null,selectedMask:w.groundDetails.selectedMaskStats??null,settings:{riverYards:w.biomeGround.riverYards,moss:w.biomeGround.mangroveMoss,substrate:w.biomeGround.mangroveSubstrate,canyonSoft:w.biomeGround.canyonSandSoft,canyonNormals:w.horizon?.smoothCanyonNormals,desertMeso:w.toon.desertMeso},memory:{...w.renderer.info.memory},calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,data:w.renderer.domElement.toDataURL('image/png').split(',')[1]}},i);
    if(frame.glError)throw Error('WebGL error '+frame.glError);await writeFile(`${dir}/${String(i).padStart(4,'0')}.png`,Buffer.from(frame.data,'base64'));delete frame.data;frames.push(frame);
   }
   if(errors.length)throw Error(errors.join('\n'));records.push({biome,quality,variant,phase,initialLodReset:true,frames,errors:[...errors]});await writeFile(out+'/captures.json',JSON.stringify({study:'Persistent River underlay: settled 96-unit round-trip streaming, no timing claim.',seed:712,resolution:[1280,720],views:['origin','48','96','48-return','origin-return'],note:'Real paused campaign settlement, seed 712; identical poses and visual time, settled chunks. Static artistic review, not a performance benchmark.',records},null,2)+'\n');console.log(biome,quality,variant,phase,'captured');
  }
 await page.close();
 }}finally{await browser.close()}
