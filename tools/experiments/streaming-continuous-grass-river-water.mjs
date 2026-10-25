import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/continuous-grass-river/shore-triangles';await mkdir(out,{recursive:true});const records=[];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const biome of ['gran-rio']){
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
 const w=window.qaCampaignWorld,{applyMaterialStudy}=await import('/tools/experiments/qa-continuous-grass-river.js');
 const pose=async(x=87.83156862745099)=>{w.controls.target.set(x,7.077262442364413,15.827254901960785);w.camera.position.set(x+22,23.077262442364413,33.827254901960785);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();w.render(.016)};
 await pose();await applyMaterialStudy(w,'C');w.render(.016);const q=w.qaContinuousGrass;
 const digest=()=>{let h=2166136261;for(const e of q.meshes){const a=e.mesh.geometry.attributes.coverageAnchor.array;for(let i=0;i<e.mesh.geometry.instanceCount*4;i++)h=Math.imul(h^Math.round(a[i]*10000),16777619)}return h>>>0};
 const waterAudit=()=>{let tested=0,inside=0,minShore=Infinity;for(const e of q.meshes){const a=e.mesh.geometry.attributes.coverageAnchor.array;for(let i=0;i<e.mesh.geometry.instanceCount;i++){const info=w.nav.field.waterInfo(a[i*4],a[i*4+2]);tested++;inside+=Number(info.inside);minShore=Math.min(minShore,info.shore);}}return {tested,inside,minShore};};
 const riverX=w.nav.field.riverX(15.827254901960785)+10;const riverY=w.nav.field.surface(riverX,15.827254901960785)+.4;w.controls.target.set(riverX,riverY,15.827254901960785);w.camera.position.set(riverX+22,riverY+16,33.827254901960785);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();w.render(.016);const shore={audit:q.audit(),water:waterAudit()};await pose();const initial={audit:q.audit(),digest:digest(),water:waterAudit()},motion=[];
 for(let i=0;i<120;i++){await new Promise(requestAnimationFrame);const angle=i/119*Math.PI*2;w.camera.position.set(109.83156862745099+Math.sin(angle)*8,23.077262442364413,33.827254901960785+Math.sin(angle)*5);const before={...q.stats},t=performance.now();w.render(.016);motion.push({cpuMs:performance.now()-t,selectionMs:q.stats.selectionMs-before.selectionMs,buildMs:q.stats.buildMs-before.buildMs,near:q.near,far:q.far,overflow:q.stats.overflow})}
 await pose();const afterMotion={audit:q.audit(),digest:digest()};
 const t=performance.now();await pose(375.83156862745099);const away={elapsedMs:performance.now()-t,audit:q.audit(),water:waterAudit()};
 const t2=performance.now();await pose();const returned={elapsedMs:performance.now()-t2,audit:q.audit(),digest:digest(),water:waterAudit()};
 const beforeInvalidate=digest();q.markDirtyAt();q.flush();w.render(.016);const invalidation={sameDistribution:digest()===beforeInvalidate,audit:q.audit()};
 const memory={renderer:{...w.renderer.info.memory},heap:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize}:null,residentCandidateNumbers:[...q.tiles.values()].reduce((n,t)=>n+t.items.length*10,0),heightBytes:[...q.chunks.values()].reduce((n,c)=>n+c.h.byteLength,0)};
 if(initial.digest!==returned.digest||initial.digest!==afterMotion.digest)throw Error('Streaming altered deterministic distribution');if([shore,initial,away,returned].some(r=>r.water.inside))throw Error('Coverage root inside authoritative water');if(motion.some(r=>r.overflow))throw Error('Instance overflow');
 return {shore,initial,afterMotion,away,returned,invalidation,motion,memory,note:'waterInfo queries are validation-only, outside timing; no new runtime renderer queries. Timings are diagnostic, not isolated performance benchmarks while another review renderer is open.',glError:w.renderer.getContext().getError()};
 });
 await writeFile(out+'/streaming-'+quality+'.json',JSON.stringify({result,errors},null,2));console.log(quality,result.initial.digest,result.returned.digest,errors);
 await page.close();
 }}finally{await browser.close()}
