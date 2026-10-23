import {globalClosureQuery} from './global-closure-recipe-20261022.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const motion=process.env.WG_WIND_CAMERA??'moving';if(!['moving','fixed'].includes(motion))throw Error('Unknown camera mode');
const selectedBiome='manglares';const sourceDir=`docs/qa/global-visual-lab/${selectedBiome==='gran-canon'?'gran-canon-populated-native-camera-20261022':selectedBiome==='desierto'?'desert-populated-frozen-20261022':selectedBiome+'-populated-frozen-20261022'}`;const out=process.env.WG_REVIEW_OUT??'docs/qa/global-visual-lab/fern-lod-lifecycle-20261023';await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
const fixture=JSON.parse(await readFile(selectedBiome==='desierto'?'docs/qa/global-visual-lab/desert-populated-closure-20261022/native-fixture.json':`${sourceDir}/native-fixture.json`,'utf8'));
const pose=JSON.parse(await readFile(`${sourceDir}/captures.json`,'utf8')).records.find(r=>r.variant==='native'&&r.phase==='day').frames[0];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const variant of (process.env.WG_VARIANT_SEQUENCE??'native').split(','))for(const biome of [selectedBiome]){
 const port=5190;
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();const body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('Observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});
 for(const file of ['tools/experiments/qa-campaign-frame-measure-endpoint-20261023.js','tests/browser/gpu-timer.js'])await page.route('**/'+file,async route=>route.fulfill({contentType:'text/javascript',body:await readFile(file,'utf8')}));
 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:true})),quality);

 await page.addInitScript(text=>localStorage.setItem('wild-guardians:slot:opening',text),fixture.timing.navigationContext.state);
 await page.route('**/src/app/main.js*',async route=>{const response=await route.fetch();let body=await response.text();const a="world.render(0);loadingOverlay?.dispose();",b="Game.pause(state,'menu');world.render(0);loadingOverlay?.dispose();";if(body.split(a).length!==2)throw Error('Pre-game pause anchor missing');body=body.replace(a,b).replace('} catch(e){if(loadingToken===loadingGeneration)', '} catch(e){globalThis.qaFarLoadError=String(e.stack??e);if(loadingToken===loadingGeneration)');await route.fulfill({response,body});});
 await page.goto(`http://127.0.0.1:${port}/?qa-seed=712&`+(globalClosureQuery(biome)+'&mangroveFerns=holly'));
 await page.waitForSelector('#native-menu',{timeout:60000}).catch(e=>{throw Error(errors.join('\n')+'\n'+e.message)});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'load-slot',slotId:'opening'},location.origin),biome);
 await page.waitForFunction(()=>globalThis.qaFarLoadError||(document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state),null,{timeout:180000}).catch(e=>{throw Error(errors.join('\n')+'\n'+e.message)});
 const loadError=await page.evaluate(()=>globalThis.qaFarLoadError);if(loadError)throw Error(loadError);
 await page.evaluate(expected=>{if(Math.abs(window.qaCampaignWorld.state.elapsed-expected)>1e-8)throw Error('Fixture advanced before pause');},JSON.parse(fixture.timing.navigationContext.state).elapsed);
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const url=performance.getEntriesByType('resource').map(e=>e.name).find(n=>new URL(n).pathname==='/src/simulation/game.js');if(!url)throw Error('Canonical Game unavailable');const {pause}=await import(url);pause(w.state,'menu');w.simElapsed=w.state.elapsed;w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});


 for(const phase of phases){
 const result=await page.evaluate(async({pose,phase})=>{
 const w=qaCampaignWorld,q=w.groundDetails,rows=[],captures=[];const elapsed=w.state.elapsed;
 w.state.time=phase==='day'?150:350;w.state.day=1;
 async function settle(){w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();for(let i=0;i<40;i++){await new Promise(requestAnimationFrame);w.render(0);}await w.whenChunksReady();}
 function audit(label){const shadow=w.scene.getObjectByName('fern-prebaked-shadow');if(!shadow||shadow.geometry.instanceCount!==q.meshes[1].mesh.geometry.instanceCount||shadow.visible!==q.meshes[1].mesh.visible)throw Error('LOD shadow desynchronized');if(q.stats.overflow)throw Error('Coverage overflow');if(w.renderer.getContext().getError())throw Error('GL error');rows.push({label,quality:w.quality,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),chunks:[...w.chunks.keys()].sort(),memory:{...w.renderer.info.memory},near:q.near,far:q.far,visible:q.group.visible,shadowVisible:shadow.visible,atlasCount:3,screenLod:q.screenLod});}
 function place(dx,top=false){w.controls.target.set(pose.target[0]+dx,pose.target[1],pose.target[2]);w.camera.position.set(top?pose.target[0]+dx:pose.camera[0]+dx,top?pose.target[1]+38:pose.camera[1],top?pose.target[2]+.1:pose.camera[2]);w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();}
 for(let cycle=0;cycle<2;cycle++){
 for(const quality of ['media','baja','muy_baja','alta','media']){w.qualitySetting(quality);place(0,true);await settle();audit('quality-'+cycle+'-'+quality);if(quality==='muy_baja'&&q.group.visible)throw Error('Very low cover visible');if(quality==='baja'&&q.near!==0)throw Error('Low near geometry');if(cycle===1&&['media','baja'].includes(quality))captures.push({name:phase+'-'+quality+'-'+rows.length,data:w.renderer.domElement.toDataURL().split(',')[1]});}
 place(0);await settle();audit('start-'+cycle);
 for(let step=1;step<=32;step++){const dx=step<=16?step*6:(32-step)*6;place(dx);w.syncChunks();w.render(0);await new Promise(requestAnimationFrame);audit('move-'+cycle+'-'+step);}
 await settle();audit('return-'+cycle);
 }
 if(w.state.elapsed!==elapsed)throw Error('Simulation advanced');return {rows,captures,elapsed};
 },{pose,phase});
 for(const c of result.captures){await writeFile(out+'/'+c.name+'.png',Buffer.from(c.data,'base64'));delete c.data;}
 if(errors.length)throw Error(errors.join('\n'));records.push({phase,...result,errors:[...errors]});await writeFile(out+'/audit.json',JSON.stringify({note:'Native LOD, paused scene, live visual clocks; two quality cycles and 96m out/back streaming paths per phase. Settled endpoints, intermediate frames may have streaming pending. Resource counts are not VRAM bytes or proof of absence of every leak.',records},null,2));console.log(phase,'validated');
 }
 await page.close();
 }}finally{await browser.close()}
