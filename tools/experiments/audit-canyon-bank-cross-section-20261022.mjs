import {globalNativeQuery} from './global-native-recipe-20261022.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/canyon-bank-cross-section-20261022';await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const biome of (process.env.WG_REVIEW_BIOMES??'gran-canon').split(','))for(const variant of ['baseline']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 if(variant!=='baseline')await page.route('**/src/rendering/horizon.js*',async route=>{
 const response=await route.fetch();let body=await response.text();const anchor='this.group=group;this.scene.add(group);';if(!body.includes(anchor))throw Error('Horizon publish anchor missing');
 body="import {prepareCanyonWater} from '/tools/experiments/qa-canyon-water-"+variant+"-20261022.js';\n"+body.replace(anchor,"for(const mesh of group.children)if(mesh.userData.nativeHorizon==='water')prepareCanyonWater(globalThis.qaCampaignWorld,mesh.geometry,region.cx,region.cz,mesh.material);"+anchor);await route.fulfill({response,body});
 });
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(variant!=='baseline'&&!body.includes('if(waterGeometry){prepareMangroveBank'))throw Error('Resident water anchor missing');if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:(variant!=='baseline'?"import {prepareCanyonWater} from '/tools/experiments/qa-canyon-water-"+variant+"-20261022.js';\n"+body.replace('if(waterGeometry){prepareMangroveBank', 'if(waterGeometry){prepareCanyonWater(this,waterGeometry,cx,cz);prepareMangroveBank'):body).replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&'+globalNativeQuery);
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
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


 const cross=await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {canyonFrame}=await import('/src/world/terrain.js');const Vector3=w.camera.position.constructor,Raycaster=w.raycaster.constructor;w.scene.updateMatrixWorld(true);const field=w.nav.field,z=w.controls.target.z,c=field.riverX(z),f=canyonFrame(field,z),ray=new Raycaster(),samples=[];
 for(let offset=-10;offset<=10;offset+=.25){const x=c+offset;ray.set(new Vector3(x,100,z),new Vector3(0,-1,0));const hits=ray.intersectObjects(w.terrainMeshes,false);samples.push({offset,x,z,fieldHeight:field.surface(x,z),meshHeight:hits[0]?.point.y??null,waterY:field.riverLevel,approxDepth:Math.max(0,.92-1.05*((t)=>t*t*(3-2*t))(Math.max(0,Math.min(1,(Math.abs(offset)-1.7)/(f.waterHalf+.6-1.7))))) });}
 return {seed:field.seed,center:c,z,waterHalf:f.waterHalf,samples};});
 await writeFile(out+'/cross-section.json',JSON.stringify(cross,null,2));console.log('cross-section measured');await page.close();
 }}finally{await browser.close()}

