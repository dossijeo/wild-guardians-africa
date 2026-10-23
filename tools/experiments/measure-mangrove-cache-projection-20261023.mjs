import {globalClosureQuery} from './global-closure-recipe-20261022.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const motion=process.env.WG_WIND_CAMERA??'moving';if(!['moving','fixed'].includes(motion))throw Error('Unknown camera mode');
const selectedBiome='manglares';const sourceDir=`docs/qa/global-visual-lab/${selectedBiome==='gran-canon'?'gran-canon-populated-native-camera-20261022':selectedBiome==='desierto'?'desert-populated-frozen-20261022':selectedBiome+'-populated-frozen-20261022'}`;const out=process.env.WG_REVIEW_OUT??'docs/qa/global-visual-lab/mangrove-cache-projection-20261023';await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
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


 await page.evaluate(async pose=>{const w=qaCampaignWorld;w.controls.target.fromArray(pose.target);w.camera.position.fromArray(pose.camera);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();for(let i=0;i<30;i++){await new Promise(requestAnimationFrame);w.render(0);}},pose);
 const audit=await page.evaluate(async()=>{const {MangroveCacheProjection}=await import('/tools/experiments/qa-mangrove-cache-projection-20261023.js');const w=qaCampaignWorld,planner=new MangroveCacheProjection(w),rows=[];const target=w.controls.target.clone();for(const [view,offset]of [['normal',[22,16,18]],['near',[11,8,9]],['elevated',[0,38,.1]]]){planner.history.clear();for(let i=0;i<120;i++){w.camera.position.set(target.x+offset[0]+8*Math.sin(i/119*Math.PI*2),target.y+offset[1],target.z+offset[2]);w.camera.lookAt(target);w.camera.updateMatrixWorld();rows.push({view,frame:i,camera:w.camera.position.toArray(),...planner.plan()});}}return rows;});
 if(errors.length)throw Error(errors.join('\n'));await writeFile(out+'/audit.json',JSON.stringify({audit,errors},null,2));console.log('Projection rows',audit.length);await page.close();
 }}finally{await browser.close()}
