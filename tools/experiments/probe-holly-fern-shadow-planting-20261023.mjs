import {globalReviewedQuery} from './global-reviewed-recipe-20261022.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out=process.env.WG_REVIEW_OUT??'docs/qa/global-visual-lab/holly-fern-shadow-planting-20261023';await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const treatment of (process.env.WG_CARD_TREATMENTS??'original,cards').split(','))for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const biome of (process.env.WG_REVIEW_BIOMES??'manglares').split(',')){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new');await route.fulfill({response,body});});
 await page.route('**/src/app/main.js*',async route=>{const response=await route.fetch();let body=await response.text();const anchor='world.render(0);loadingOverlay?.dispose();';if(!body.includes(anchor))throw Error('Early pause anchor missing');body=body.replace(anchor,"Game.pause(state,'menu');world.render(0);loadingOverlay?.dispose();");body=body.replace('} catch(e){if(loadingToken===loadingGeneration)', '} catch(e){globalThis.qaFarLoadError=String(e.stack??e);if(loadingToken===loadingGeneration)');await route.fulfill({response,body});});
 await page.route('**/src/rendering/shader-failure.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('throw failure.current;', 'globalThis.qaShaderFailure=failure.current.details;throw failure.current;');await route.fulfill({response,body});});
 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:true})),quality);
 if(treatment==='fringe')await page.route('**/src/rendering/continuous-grass.js*',async route=>{const response=await route.fetch();let body=await response.text();
 const anchor='q.stats.candidates++;';if(body.split(anchor).length!==2)throw Error('Candidate anchor mismatch');body=body.replace(anchor,anchor+"const fringe=mangrove?.15*clamp((noise(x*.43,z*.43,seed^18597)-.35)/.45,0,1):0;const wearLimit=.25+fringe;");
 body=body.replace('||wear>.25||','||wear>wearLimit||').replace('if(edgeWear>.27)break;','if(edgeWear>wearLimit+.02)break;').replace('if(edgeWear>.27){q.stats.masked++;continue;}','if(edgeWear>wearLimit+.02){q.stats.masked++;continue;}').replace('cover,mangrove?wear:moisture,','cover,mangrove?(wear>.25||edgeWear>.27?.06:wear):moisture,');await route.fulfill({response,body});});
 await page.route('**/tools/experiments/qa-holly-fern-shadow-resident-guarded-20261023.js',async route=>route.fulfill({contentType:'text/javascript',body:await readFile('tools/experiments/qa-holly-fern-shadow-resident-guarded-20261023.js','utf8')}));
 await page.route('**/tools/experiments/holly-fern-smooth-frond-geometry-20261023.js',async route=>route.fulfill({contentType:'text/javascript',body:await readFile('tools/experiments/holly-fern-smooth-frond-geometry-20261023.js','utf8')}));
 for(const file of ['qa-holly-fern-shadow-10hz-20261023.js'])await page.route('**/tools/experiments/'+file,async route=>route.fulfill({contentType:'text/javascript',body:await readFile('tools/experiments/'+file,'utf8')}));
 if(treatment==='cards')await page.route('**/src/rendering/continuous-grass.js*',async route=>{
 const response=await route.fetch();let body=await response.text();
 const a='let edgeWear=wear;',b='edgeWear=Math.max(edgeWear,sample(c,x+dx*(q.edgePadding/.6),z+dz*(q.edgePadding/.6)).ctx[3]);';
 if(!body.includes(a)||!body.includes(b))throw Error('Fern edge footprint anchor missing');
 body=body.replace(' const old=world.scene.onBeforeRender',` q.qaShadowRegion=(x,z,r)=>{const result=[];for(const c of q.chunks.values())for(let tx=Math.floor((c.cx*48-24)/8);tx<(c.cx*48+24)/8;tx++)for(let tz=Math.floor((c.cz*48-24)/8);tz<(c.cz*48+24)/8;tz++){if(Math.hypot(tx*8+4-x,tz*8+4-z)>r+6)continue;for(const p of tile(c,tx,tz).items)if(Math.hypot(p[0]-x,p[2]-z)<=r)result.push(p);}return result;}; const old=world.scene.onBeforeRender`);body=body.replaceAll('mangrove?(low?.6:.5)','mangrove?(low?.75:.65)');body=body.replace(a,'let edgeWear=wear,fernEdgeCover=cover;').replace(b,'const fernProbe=sample(c,x+dx*(q.edgePadding/.6),z+dz*(q.edgePadding/.6)).ctx;fernEdgeCover=Math.min(fernEdgeCover,fernProbe[0]);edgeWear=Math.max(edgeWear,fernProbe[3]);');
 body=body.replace(' items.push([x,s.y+.006,z,',` if(mangrove){const edge=Math.max(clamp((.42-fernEdgeCover)/.32,0,1),clamp((edgeWear-.06)/.21,0,1));q.stats.fernEdgeEligible=(q.stats.fernEdgeEligible??0)+(edge>0?1:0);q.stats.fernInterior=(q.stats.fernInterior??0)+(edge===0?1:0);if(hashCell(seed,ix,iz,21931)/4294967296<.30*edge){q.stats.fernEdgeRemoved=(q.stats.fernEdgeRemoved??0)+1;continue;}}
 items.push([x,s.y+.006,z,`);
 await route.fulfill({response,body});
 });
 await page.route('**/src/rendering/african-toon.js*',async route=>{const response=await route.fetch();let body=await response.text();const anchor='outgoingLight=toLinear4(filmic4(groundLit));';if(!body.includes(anchor))throw Error('Ground light anchor absent');body=body.replace('vec3 groundAlbedo=toLinear4(clamp(groundColor,0.,1.));','vec3 groundAlbedo=toLinear4(clamp(groundColor,0.,1.));if(uBiome>1.5&&uBiome<2.5)groundAlbedo=mix(groundAlbedo,vec3(dot(groundAlbedo,vec3(.2126,.7152,.0722)))*vec3(1.06,1.02,.91),.25);');body=body.replace(anchor,'if(uBiome>1.5&&uBiome<2.5)groundLit*=1.-.45*(1.-groundVisibility)*(1.-uNight);'+anchor);await route.fulfill({response,body});});
 const fixture=JSON.parse(await readFile('docs/qa/global-visual-lab/manglares-populated-frozen-20261022/native-fixture.json','utf8'));await page.addInitScript(text=>localStorage.setItem('wild-guardians:slot:opening',text),fixture.timing.navigationContext.state);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&'+globalReviewedQuery(biome));
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'load-slot',slotId:'opening'},location.origin),biome);
 await page.waitForFunction(()=>globalThis.qaFarLoadError||(document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state),null,{timeout:180000}).catch(async e=>{await writeFile(out+'/load-failure.json',JSON.stringify(await page.evaluate(()=>({text:document.body.innerText,far:globalThis.qaCampaignWorld?.farVegetation?.stats,adapters:globalThis.qaCampaignWorld?.farVegetation?.adapters?.map(a=>({stats:a.stats,pending:a.preparationStatus()}))})),null,2));throw Error(errors.join('\n')+'\n'+e.message)});
 const failure=await page.evaluate(()=>globalThis.qaFarLoadError&&(globalThis.qaFarLoadError+'\n'+JSON.stringify(globalThis.qaShaderFailure)));if(failure){await writeFile(out+'/load-failure.json',JSON.stringify({error:failure},null,2));throw Error(failure);}
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.simElapsed=w.state.elapsed;w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});
 if(treatment==='cards')await page.evaluate(async()=>{const {applyHollyFern}=await import('/tools/experiments/qa-holly-fern-shadow-resident-guarded-20261023.js');await applyHollyFern(qaCampaignWorld);});




 await page.evaluate(({biome,canyonTarget})=>{
 const w=window.qaCampaignWorld;
 if(biome==='sabana')w.controls.target.set(135,9.400129699707032,45);
 if(biome==='gran-rio')w.controls.target.set(87.83156862745099,7.077262442364413,15.827254901960785);
 if(biome==='gran-canon')w.controls.target.fromArray(canyonTarget);
 if(biome!=='gran-canon'&&biome!=='desierto'){const f=w.nav.field,o=w.controls.target.clone();let best=null;for(let z=-100;z<=100;z+=2)for(let x=-100;x<=100;x+=2){const px=o.x+x,pz=o.z+z,info=f.waterInfo(px,pz);if(info.inside&&(!best||x*x+z*z<best.d))best={x:px,z:pz,d:x*x+z*z};}if(best)w.controls.target.set(best.x,f.surface(best.x,best.z)+.9,best.z);}
 if(w.groundDetails.audit)w.groundDetails.timeOverride=2;
 },{biome,canyonTarget:[-47.868919372558594, 3.259999895095825, 102]});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;const o=w.controls.target.toArray();window.qaSandPath=[[7,3,6],[22,16,18],[-18,9,22]].map(([x,y,z])=>[o[0]+x,Math.max(o[1]+y,w.nav.field.surface(o[0]+x,o[2]+z)+1.2),o[2]+z]);w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();});

 const result=await page.evaluate(async()=>{const w=qaCampaignWorld,q=w.groundDetails;const gameUrl=performance.getEntriesByType('resource').map(e=>e.name).find(n=>/\/src\/simulation\/game\.js(?:\?|$)/.test(n));if(!gameUrl)throw Error('Canonical game module unavailable');const Game=await import(gameUrl);q.timeOverride=2;w.render(0);const eye=w.camera.position,items=[...q.tiles.values()].flatMap(t=>t.items).sort((a,b)=>Math.hypot(a[0]-eye.x,a[2]-eye.z)-Math.hypot(b[0]-eye.x,b[2]-eye.z));const p=items.find(p=>w.nav.placement(p[0],p[2],.4).valid&&!w.state.plants.some(c=>c.alive&&Math.hypot(c.x-p[0],c.z-p[2])<1.1));if(!p)throw Error('No legal covered planting point');
 const inspect=()=>({shadow:{...q.residentShadowStudy},nearby:[...q.tiles.values()].flatMap(t=>t.items).filter(a=>Math.hypot(a[0]-p[0],a[2]-p[2])<1.2).length,plants:w.state.plants.length,money:JSON.stringify(w.state.ledger.balance),cache:{...w.releaseNativeShadow.cache.stats}});
 const observed=[];const off=Game.observeGameEvents(w.state,e=>observed.push(e.type));const before=inspect();const imageBefore=w.renderer.domElement.toDataURL('image/png').split(',')[1];Game.resume(w.state,'menu');if(w.state.pauses.length)throw Error('Pauses: '+w.state.pauses.join(','));Game.plant(w.state,'qa-fern-shadow-plant','mijo',p[0],p[2],w.nav);Game.pause(w.state,'menu');w.sync(0);for(let i=0;i<3;i++)w.render(0);const after=inspect();const imageAfter=w.renderer.domElement.toDataURL('image/png').split(',')[1];off();return {observed,dirty:q.occupancyDirty,enabled:q.enabled,disposed:q.disposed,modules:performance.getEntriesByType('resource').map(e=>e.name).filter(n=>n.includes('/simulation/game.js')),point:p.slice(0,3),before,after,imageBefore,imageAfter,glError:w.renderer.getContext().getError()};});
 for(const name of ['imageBefore','imageAfter']){await writeFile(out+'/'+name+'.png',Buffer.from(result[name],'base64'));delete result[name];}if(errors.length)throw Error(errors.join('\n'));await writeFile(out+'/planting.json',JSON.stringify({result,errors},null,2));console.log(JSON.stringify(result));await page.close();
 }}finally{await browser.close()}
