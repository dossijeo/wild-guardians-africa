import {installMangroveHeightBlendRoute} from './qa-mangrove-height-blend-route.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/mangrove-full-integrated/streaming';await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of ['media'])for(const biome of ['manglares'])for(const variant of ['original','candidate']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 if(variant==='original')await installMangroveHeightBlendRoute(page,{height:true,calibrated:true,linearSoil:true,toonSoil:true,skipUnusedLighting:true});
 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712'+'&visualLab=global-lighting'+(variant==='candidate'?'&mangroveSubstrate=full':''));
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});




 await page.evaluate(async({biome,variant})=>{
 const w=window.qaCampaignWorld;
 if(biome==='sabana')w.controls.target.set(135,9.400129699707032,45);
 if(biome==='gran-rio')w.controls.target.set(87.83156862745099,7.077262442364413,15.827254901960785);
 if(biome==='gran-canon')await(await import('/tools/experiments/qa-water-view.js')).focusWater(w);
 {
  if(biome==='sabana'||biome==='gran-rio'){
   await(await import(biome==='sabana'?'/tools/experiments/qa-continuous-grass-occupancy.js':'/tools/experiments/qa-continuous-grass-river.js')).applyMaterialStudy(w,'C');
   w.qaContinuousGrass.timeOverride=2;w.qaContinuousGrass.uniforms.uCoverageWindStrength.value=8;
  }
  if(biome==='manglares'&&variant==='original')(await import('/tools/experiments/qa-mangrove-mud-moss-toon-interior.js')).applyMaterialStudy(w);
 }
 },{biome,variant});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;const o=w.controls.target.toArray();window.qaSandPath=[[22,16,18],[6,34,6],[-18,16,22]].map(([x,y,z])=>[o[0]+x,Math.max(o[1]+y,w.nav.field.surface(o[0]+x,o[2]+z)+1.2),o[2]+z]);w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();});


 for(const phase of phases){
  const rows=await page.evaluate(async phase=>{const w=window.qaCampaignWorld;w.state.time=phase==='day'?150:350;return(await import('/tools/experiments/qa-mangrove-integrated-roundtrip.js')).mudRoundtrip(w);},phase);
  for(const row of rows){await writeFile(`${out}/${quality}-${variant}-${phase}-${row.index}.png`,Buffer.from(row.data,'base64'));delete row.data;}
  records.push({quality,variant,phase,rows,errors:[...errors]});if(errors.length)throw Error(errors.join('\n'));
  await writeFile(out+'/captures.json',JSON.stringify({seed:712,records},null,2)+'\n');console.log(quality,variant,phase,'streamed');
 }
 const disposal=await page.evaluate(()=>{const w=window.qaCampaignWorld;w.render=()=>{};const mud=[...w.chunks.values()].flatMap(g=>g.children.filter(m=>m.name==='mangrove-mud-patches'));const counts=mud.map(()=>0);mud.forEach((m,i)=>m.geometry.addEventListener('dispose',()=>counts[i]++));const before=w.qaMudBlend?.audit().bound??mud.filter(m=>m.userData.globalMudBlend).length;const textures=w.biomeGround.layerTextures,textureCounts=textures.map(()=>0);textures.forEach((t,i)=>t.addEventListener('dispose',()=>textureCounts[i]++));w.dispose();return {before,counts,textureCount:textures.length,textureCounts,boundAfter:w.qaMudBlend?.audit().bound??null};});
 if(disposal.textureCounts.length!==3||disposal.textureCounts.some(n=>n!==1))throw Error('Layer disposal failed');
 if(disposal.counts.some(n=>n!==1)||disposal.boundAfter)throw Error('Disposal failed');
 await writeFile(`${out}/${quality}-${variant}-disposal.json`,JSON.stringify(disposal,null,2)+'\n');await page.close();
 }}finally{await browser.close()}
