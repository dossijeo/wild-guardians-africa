import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/continuous-grass-occupancy';await mkdir(out,{recursive:true});const records=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const biome of ['sabana']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&visualLab=global-lighting');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'qa-visual');w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});



 const result=await page.evaluate(async()=>{
 const w=window.qaCampaignWorld,{emit}=await import('/src/simulation/game.js');
 w.controls.target.set(135,9.400129699707032,45);w.camera.position.set(157,25.400129699707032,63);w.state.time=150;w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();
 await (await import('/tools/experiments/qa-continuous-grass.js')).applyMaterialStudy(w,'C');w.render(.016);const q=w.qaContinuousGrass;
 const anchors=()=>q.meshes.flatMap(e=>{const a=e.mesh.geometry.attributes.coverageAnchor.array;return Array.from({length:e.mesh.geometry.instanceCount},(_,i)=>[a[i*4],a[i*4+1],a[i*4+2]]);});
 const digest=()=>JSON.stringify(anchors());const initial=digest();let marks=0;const mark=q.markDirtyAt;q.markDirtyAt=(...args)=>{marks++;return mark(...args)};
 const noises=['CropHit','CropMatured','StructureHit'];
 const baseline=[];for(const type of noises){const before=marks;emit(w.state,type,{});baseline.push({type,marks:marks-before});q.flush();w.render(.016);}
 await (await import('/tools/experiments/qa-continuous-grass-occupancy.js')).applyMaterialStudy(w,'C');q.flush();w.render(.016);
 const filtered=[];for(const type of noises){const before=marks;emit(w.state,type,{});filtered.push({type,marks:marks-before});q.flush();w.render(.016);}
 if(filtered.some(r=>r.marks))throw Error('Non-occupancy event invalidated cover');
 const target=anchors()[0];if(!target)throw Error('No coverage probe available');const {createPlant}=await import('/src/simulation/crops.js'),{BALANCE}=await import('/src/simulation/balance.js');const plant=createPlant('qa-coverage-probe',BALANCE.crops[0].id,target[0],target[2],'qa-coverage-center');
 const beforeCount=anchors().length;w.state.plants.push(plant);emit(w.state,'CropPlaced',{targetId:plant.id});q.flush();w.render(.016);
 const remaining=anchors(),intrusions=remaining.filter(a=>Math.hypot(a[0]-plant.x,a[2]-plant.z)<2.2-1e-5).length;
 if(intrusions||remaining.length>=beforeCount)throw Error('Crop exclusion did not remove coverage');
 plant.alive=false;emit(w.state,'CropDestroyed',{targetId:plant.id});q.flush();w.state.plants.splice(w.state.plants.indexOf(plant),1);w.render(.016);
 const restored=digest()===initial;if(!restored)throw Error('Occupancy restoration changed deterministic distribution');
 const selectionBefore=q.stats.selectionCount;for(let i=0;i<20;i++)w.render(.016);const stationarySelections=q.stats.selectionCount-selectionBefore;if(stationarySelections)throw Error('Stationary scene repeated selection');
 return {baseline,filtered,probe:{x:plant.x,z:plant.z,beforeCount,occupiedCount:remaining.length,intrusions,restored},stationarySelections,glError:w.renderer.getContext().getError(),audit:q.audit()};
 });
 await writeFile(out+'/occupancy-'+quality+'.json',JSON.stringify({result,errors,note:'Synthetic crop fixture in isolated paused QA world; tests renderer occupancy invalidation, not gameplay placement or simulation rules.'},null,2)+'\n');if(errors.length||result.glError)throw Error('Browser errors');console.log(quality,JSON.stringify(result.probe),result.filtered);
 await page.close();
 }}finally{await browser.close()}
