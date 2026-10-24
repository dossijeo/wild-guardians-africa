import {globalNativeQuery} from './global-native-recipe-20261022.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/canyon-cover-footprint-stream-20261022';await mkdir(out,{recursive:true});const records=[];const phases=['day-cold','day-warm','night'];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const biome of (process.env.WG_REVIEW_BIOMES??'gran-canon').split(','))for(const variant of ['cover']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 if(variant!=='baseline')await page.route('**/src/rendering/blender-ground-details.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace("this.global=['global-grass','global-grass-beds'].includes(variant);","this.global=biome==='canyons'||['global-grass','global-grass-beds'].includes(variant);");if(variant!=='scatter'){
 const anchor='const density=Math.max(0,Math.min(.4,biomeDensity))*cluster;';if(!body.includes(anchor))throw Error('Density anchor missing');
 body=body.replace(anchor,`const shore=field.waterInfo(x,z).shore;
 const bank=Math.exp(-Math.pow(shore/5.5,2));
 const regional=(hashCell(seed,Math.floor(x/11),Math.floor(z/11),9271)>>>0)/4294967296;
 const density=this.biome==='canyons'?Math.min(.68,.004+bank*(regional>.42?.62:.035)):Math.max(0,Math.min(.4,biomeDensity))*cluster;`);
 }if(variant==='cover')body=body.replace("canyons:'canyons'","canyons:'canyons-bank-cover'");await route.fulfill({response,body});});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(variant!=='baseline')body=body.replace('this.groundDetails.enabled&&=this.visualLabGroundDetails;','this.groundDetails.enabled&&=(this.visualLabGroundDetails||state.biome===\'gran-canon\');');if(false&&!body.includes('if(waterGeometry){prepareMangroveBank'))throw Error('Resident water anchor missing');if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:(false?"import {prepareCanyonWater} from '/tools/experiments/qa-canyon-water-"+variant+"-20261022.js';\n"+body.replace('if(waterGeometry){prepareMangroveBank', 'if(waterGeometry){prepareCanyonWater(this,waterGeometry,cx,cz);prepareMangroveBank'):body).replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&'+globalNativeQuery+(variant==='deposits'?'&volcanicDeposits=broad':''));
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.state.elapsed=2;w.simElapsed=2;w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});




 await page.evaluate(({biome,canyonTarget})=>{
 const w=window.qaCampaignWorld;
 if(biome==='manglares'){const field=w.nav.field,o=w.controls.target.clone();let best=null;for(let x=o.x-120;x<=o.x+120;x+=4)for(let z=o.z-120;z<=o.z+120;z+=4){const info=field.waterInfo(x,z),distance=Math.hypot(x-o.x,z-o.z);if(info.inside||info.shore>2||distance<30)continue;let wet=0;for(let k=0;k<8;k++)wet+=field.waterInfo(x+Math.cos(k*Math.PI/4)*12,z+Math.sin(k*Math.PI/4)*12).inside?1:0;const score=Math.abs(wet-4)*20+distance*.02+info.shore;if(!best||score<best.score)best={x,z,score,wet,shore:info.shore};}if(!best)throw Error('No representative bank found');window.qaBankSite=best;w.controls.target.set(best.x,field.surface(best.x,best.z)+.9,best.z);}
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
    const frame=await page.evaluate(async i=>{const w=window.qaCampaignWorld;window.qaBankOrigin??=w.controls.target.toArray();const origin=window.qaBankOrigin,offset=[0,48,96,48,0][i];w.controls.target.set(origin[0]+offset,origin[1],origin[2]);w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;w.camera.position.copy(w.controls.target).add({x:22,y:16,z:18});w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();for(let settle=0;settle<12;settle++)w.render(1/30);if(!w.sky.atmosphere)throw Error('Native atmosphere option not enabled');const {auditBankCover}=await import('/tools/experiments/qa-canyon-cover-footprint-20261022.js');const footprint=auditBankCover(w);w.render(1/30);return {i,footprint,detailChunks:w.groundDetails.chunks.size,detailCount:w.groundDetails.count,chunkKeys:[...w.chunks.keys()],shoreMasks:[...w.biomeGround.masks].filter(t=>t.image?.width===35&&t.image?.data?.length===1225).length,groundMaskCount:w.biomeGround.masks.size,bankSite:window.qaBankSite??null,palette:globalThis.qaEnvironmentPalette??null,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),time:w.state.time,glError:w.renderer.getContext().getError(),coverage:w.groundDetails.audit?.()??null,settings:{riverYards:w.biomeGround.riverYards,moss:w.biomeGround.mangroveMoss,substrate:w.biomeGround.mangroveSubstrate,canyonSoft:w.biomeGround.canyonSandSoft,canyonNormals:w.horizon?.smoothCanyonNormals,desertMeso:w.toon.desertMeso},memory:{...w.renderer.info.memory},calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,data:w.renderer.domElement.toDataURL('image/png').split(',')[1]}},i);
    if(frame.glError)throw Error('WebGL error '+frame.glError);await writeFile(`${dir}/${String(i).padStart(4,'0')}.png`,Buffer.from(frame.data,'base64'));delete frame.data;frames.push(frame);
   }
   if(errors.length)throw Error(errors.join('\n'));records.push({biome,quality,variant,phase,initialLodReset:true,frames,errors:[...errors]});await writeFile(out+'/captures.json',JSON.stringify({study:'Volcanic deposits native streaming control; no timing claim.',seed:712,resolution:[1280,720],offsets:[0,48,96,48,0],note:'Real paused campaign settlement, seed 712; identical poses and visual time, settled chunks. Static artistic review, not a performance benchmark.',records},null,2)+'\n');console.log(biome,quality,variant,phase,'captured');
  }
 await page.close();
 }}finally{await browser.close()}
