import {globalClosureQuery} from './global-closure-recipe-20261022.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const selectedBiome=process.env.WG_FIXTURE_BIOME??'gran-rio';
const out=`docs/qa/global-visual-lab/${selectedBiome}-crop-soil-stream-20261022`;await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
const fixture=JSON.parse(await readFile(`docs/qa/global-visual-lab/${selectedBiome}-populated-frozen-20261022/native-fixture.json`,'utf8'));
const snapshot=fixture.timing.navigationContext.state;
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const biome of (selectedBiome).split(',')){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new');await route.fulfill({response,body});});
 await page.route('**/src/app/main.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('world.render(0);loadingOverlay?.dispose();',"Game.pause(state,'menu');world.render(0);loadingOverlay?.dispose();");body=body.replace('} catch(e){if(loadingToken===loadingGeneration)', '} catch(e){globalThis.qaFarLoadError=String(e.stack??e);if(loadingToken===loadingGeneration)');await route.fulfill({response,body});});
 await page.route('**/src/rendering/shader-failure.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('throw failure.current;', 'globalThis.qaShaderFailure=failure.current.details;throw failure.current;');await route.fulfill({response,body});});
 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:true})),quality);
 await page.addInitScript(text=>localStorage.setItem('wild-guardians:slot:opening',text),snapshot);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&'+globalClosureQuery(biome)+'&cropSoil=local');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'load-slot',slotId:'opening'},location.origin),biome);
 await page.waitForFunction(()=>globalThis.qaFarLoadError||(document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state),null,{timeout:180000}).catch(async e=>{await writeFile(out+'/load-failure.json',JSON.stringify(await page.evaluate(()=>({text:document.body.innerText,far:globalThis.qaCampaignWorld?.farVegetation?.stats,adapters:globalThis.qaCampaignWorld?.farVegetation?.adapters?.map(a=>({stats:a.stats,pending:a.preparationStatus()}))})),null,2));throw Error(errors.join('\n')+'\n'+e.message)});
 const failure=await page.evaluate(()=>globalThis.qaFarLoadError&&(globalThis.qaFarLoadError+'\n'+JSON.stringify(globalThis.qaShaderFailure)));if(failure){await writeFile(out+'/load-failure.json',JSON.stringify({error:failure},null,2));throw Error(failure);}
 await page.evaluate(expected=>{if(Math.abs(window.qaCampaignWorld.state.elapsed-expected)>1e-8)throw Error('Fixture advanced before pause');},JSON.parse(snapshot).elapsed);
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.simElapsed=w.state.elapsed;w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});




 await page.evaluate(({biome,canyonTarget})=>{
 const w=window.qaCampaignWorld;
 if(w.groundDetails.audit)w.groundDetails.timeOverride=2;
 },{biome,canyonTarget:[-47.868919372558594, 3.259999895095825, 102]});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;const o=w.controls.target.toArray();window.qaSandPath=[[22,16,18],[6,34,6],[-18,9,22]].map(([x,y,z])=>[o[0]+x,Math.max(o[1]+y,w.nav.field.surface(o[0]+x,o[2]+z)+1.2),o[2]+z]);w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();});

 const result=await page.evaluate(async()=>{const w=qaCampaignWorld;w.state.time=150;w.state.day=1;const before=JSON.stringify({plants:w.state.plants,elapsed:w.state.elapsed,workers:w.state.workers}),base=w.controls.target.clone(),eye=w.camera.position.clone(),records=[],images=[],initial=new Map(),timings=[];const chunk=w.groundDetails.chunk;w.groundDetails.chunk=function(...args){const t=performance.now();try{return chunk.apply(this,args);}finally{timings.push(performance.now()-t);}};
 try{for(const [step,offset]of [0,192,0,192,0].entries()){w.controls.target.copy(base);w.controls.target.x+=offset;w.camera.position.copy(eye);w.camera.position.x+=offset;w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();const {prepareInitialFarWorld}=await import('/src/app/far-world-loading.js');await prepareInitialFarWorld(w);let stable=0,last='',start=performance.now();while(stable<60){await new Promise(requestAnimationFrame);w.render(0);const sig=JSON.stringify([w.renderer.info.render.calls,w.renderer.info.render.triangles,w.renderer.info.memory]);stable=!w.farVegetation.adapters.some(a=>a.preparationPending())&&sig===last?stable+1:0;last=sig;if(performance.now()-start>120000)throw Error('Stream not stable');}
 let maskDiff=0,compared=0;for(const [key,g]of w.chunks){const mask=g.children.find(m=>m.userData.ground)?.material.userData.biomeGround?.uGroundMask.value.image.data;if(!mask)continue;if(step===0)initial.set(key,new Uint8Array(mask));else if(offset===0){const original=initial.get(key);if(!original)continue;compared++;for(let i=0;i<mask.length;i++)if(mask[i]!==original[i])maskDiff++;}}
 records.push({step,offset,maskDiff,compared,chunks:[...w.chunks.keys()].sort(),memory:{...w.renderer.info.memory},coverage:w.groundDetails.audit(),calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,glError:w.renderer.getContext().getError()});images.push(w.renderer.domElement.toDataURL('image/png').split(',')[1]);}
 return {records,images,timings,stateUnchanged:before===JSON.stringify({plants:w.state.plants,elapsed:w.state.elapsed,workers:w.state.workers})};}finally{w.groundDetails.chunk=chunk;}});
 for(let i=0;i<result.images.length;i++)await writeFile(out+`/${i}.png`,Buffer.from(result.images[i],'base64'));delete result.images;
 result.errors=errors;await writeFile(out+'/stream.json',JSON.stringify(result,null,2));const first=result.records[0];for(const r of result.records.slice(1)){if(r.offset===0&&(JSON.stringify(r.chunks)!==JSON.stringify(first.chunks)||r.compared!==first.chunks.length))throw Error('Incomplete return mask comparison');if(r.offset!==0&&first.chunks.every(k=>r.chunks.includes(k)))throw Error('No chunks unloaded');}if(errors.length||!result.stateUnchanged||result.records.some(r=>r.glError||r.maskDiff||r.coverage.stats.overflow))throw Error('Stream audit failed');console.log('Streaming masks, state and GL checks passed');await page.close();
 }}finally{await browser.close()}
