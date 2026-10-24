import {globalClosureQuery} from './global-closure-recipe-20261022.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const selectedBiome='manglares';const sourceDir=`docs/qa/global-visual-lab/${selectedBiome==='gran-canon'?'gran-canon-populated-native-camera-20261022':selectedBiome==='desierto'?'desert-populated-frozen-20261022':selectedBiome+'-populated-frozen-20261022'}`;const out=process.env.WG_REVIEW_OUT??'docs/qa/global-visual-lab/holly-fern-shadow-cache-probe-20261023';await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
const fixture=JSON.parse(await readFile(selectedBiome==='desierto'?'docs/qa/global-visual-lab/desert-populated-closure-20261022/native-fixture.json':`${sourceDir}/native-fixture.json`,'utf8'));
const pose=JSON.parse(await readFile(`${sourceDir}/captures.json`,'utf8')).records.find(r=>r.variant==='native'&&r.phase==='day').frames[0];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const variant of (process.env.WG_VARIANT_SEQUENCE??'original').split(','))for(const biome of [selectedBiome]){
 const port=5190;
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();const body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('Observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});
 for(const file of ['tools/experiments/qa-campaign-frame-measure-endpoint-20261023.js','tests/browser/gpu-timer.js','tools/experiments/holly-fern-smooth-frond-geometry-20261023.js','tools/experiments/qa-holly-fern-relief-leaflight-20261023.js'])await page.route('**/'+file,async route=>route.fulfill({contentType:'text/javascript',body:await readFile(file,'utf8')}));
 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:true})),quality);

 await page.addInitScript(text=>localStorage.setItem('wild-guardians:slot:opening',text),fixture.timing.navigationContext.state);
 await page.route('**/src/app/main.js*',async route=>{const response=await route.fetch();let body=await response.text();const a="world.render(0);loadingOverlay?.dispose();",b="Game.pause(state,'menu');world.render(0);loadingOverlay?.dispose();";if(body.split(a).length!==2)throw Error('Pre-game pause anchor missing');body=body.replace(a,b);await route.fulfill({response,body});});
 await page.route('**/src/rendering/continuous-grass.js*',async route=>{
 const response=await route.fetch();let body=await response.text();
 const a='let edgeWear=wear;',b='edgeWear=Math.max(edgeWear,sample(c,x+dx*(q.edgePadding/.6),z+dz*(q.edgePadding/.6)).ctx[3]);';
 if(!body.includes(a)||!body.includes(b))throw Error('Fern edge footprint anchor missing');
 body=body.replaceAll('mangrove?(low?.6:.5)','mangrove?(low?.75:.65)');body=body.replace(a,'let edgeWear=wear,fernEdgeCover=cover;').replace(b,'const fernProbe=sample(c,x+dx*(q.edgePadding/.6),z+dz*(q.edgePadding/.6)).ctx;fernEdgeCover=Math.min(fernEdgeCover,fernProbe[0]);edgeWear=Math.max(edgeWear,fernProbe[3]);');
 body=body.replace(' items.push([x,s.y+.006,z,',` if(mangrove){const edge=Math.max(clamp((.42-fernEdgeCover)/.32,0,1),clamp((edgeWear-.06)/.21,0,1));q.stats.fernEdgeEligible=(q.stats.fernEdgeEligible??0)+(edge>0?1:0);q.stats.fernInterior=(q.stats.fernInterior??0)+(edge===0?1:0);if(hashCell(seed,ix,iz,21931)/4294967296<.30*edge){q.stats.fernEdgeRemoved=(q.stats.fernEdgeRemoved??0)+1;continue;}}
 items.push([x,s.y+.006,z,`);
 await route.fulfill({response,body});
 });
 await page.route('**/src/rendering/african-toon.js*',async route=>{const response=await route.fetch();let body=await response.text();const anchor='outgoingLight=toLinear4(filmic4(groundLit));';if(!body.includes(anchor))throw Error('Ground light anchor absent');body=body.replace('vec3 groundAlbedo=toLinear4(clamp(groundColor,0.,1.));','vec3 groundAlbedo=toLinear4(clamp(groundColor,0.,1.));if(uBiome>1.5&&uBiome<2.5)groundAlbedo=mix(groundAlbedo,vec3(dot(groundAlbedo,vec3(.2126,.7152,.0722)))*vec3(1.06,1.02,.91),.25);');body=body.replace(anchor,'if(uBiome>1.5&&uBiome<2.5)groundLit*=1.-.45*(1.-groundVisibility)*(1.-uNight);'+anchor);await route.fulfill({response,body});});
 await page.route('**/src/rendering/shadow-cache.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('const values = [],','let qaObject=null;const values = [],').replace('scene.traverseVisible(object => {','scene.traverseVisible(object => {qaObject=object;').replace('} catch { return null; }',"} catch(error) {const key=String(error.message)+' / '+qaObject?.name+' / '+qaObject?.type;globalThis.qaShadowFailures??={};globalThis.qaShadowFailures[key]=(globalThis.qaShadowFailures[key]??0)+1;globalThis.qaShadowExample??={name:qaObject?.name,uuid:qaObject?.uuid,material:qaObject?.material?.name,before:String(qaObject?.onBeforeShadow),after:String(qaObject?.onAfterShadow),declared:String(qaObject?.userData?.nativeShadowCallback),parents:[qaObject?.parent?.name,qaObject?.parent?.parent?.name,qaObject?.parent?.parent?.parent?.name]};return null; }");await route.fulfill({response,body});});
 await page.goto(`http://127.0.0.1:${port}/?qa-seed=712&`+globalClosureQuery(biome));
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'load-slot',slotId:'opening'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000}).catch(e=>{throw Error(errors.join('\n')+'\n'+e.message)});
 await page.evaluate(expected=>{if(Math.abs(window.qaCampaignWorld.state.elapsed-expected)>1e-8)throw Error('Fixture advanced before pause');},JSON.parse(fixture.timing.navigationContext.state).elapsed);
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.simElapsed=w.state.elapsed;w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});
 await page.evaluate(async()=>{const {applyHollyFern}=await import('/tools/experiments/qa-holly-fern-relief-leaflight-20261023.js');await applyHollyFern(qaCampaignWorld);});
 await page.evaluate(variant=>{const w=qaCampaignWorld;for(const e of w.groundDetails.meshes)e.mesh.castShadow=variant==='cards';w.releaseNativeShadow.cache.invalidate();},variant);




 await page.evaluate(async pose=>{const w=qaCampaignWorld;w.controls.target.fromArray(pose.target);window.qaSandPath=[pose.camera];w.camera.position.fromArray(pose.camera);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();},pose);
 const result=await page.evaluate(async()=>{const w=qaCampaignWorld;for(let i=0;i<120;i++){w.render(1/30);await new Promise(requestAnimationFrame);}return {example:globalThis.qaShadowExample,failures:globalThis.qaShadowFailures,cache:w.releaseNativeShadow.cache.stats};});await writeFile(out+'/probe.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 for(const enabled of [false,true]){const capture=await page.evaluate(enabled=>{const w=qaCampaignWorld;w.groundDetails.timeOverride=2;w.releaseNativeShadow.cache.enabled=enabled;w.releaseNativeShadow.cache.invalidate();for(let i=0;i<3;i++)w.render(0);return {data:w.renderer.domElement.toDataURL('image/png').split(',')[1],cache:{...w.releaseNativeShadow.cache.stats},glError:w.renderer.getContext().getError()};},enabled);await writeFile(out+'/cache-'+enabled+'.png',Buffer.from(capture.data,'base64'));delete capture.data;await writeFile(out+'/cache-'+enabled+'.json',JSON.stringify(capture,null,2));}
 await page.close();
 }}finally{await browser.close()}
