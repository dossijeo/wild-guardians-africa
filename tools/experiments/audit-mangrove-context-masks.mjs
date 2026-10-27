import {installMangroveContextRoute} from './qa-mangrove-context-route.mjs';
import {installRiverCoverPaletteRoute} from './qa-river-cover-palette-route.mjs';
import {installRiverWearRoute} from './river-wear-qa-route.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/mangrove-context/mask-audit';await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const biome of (process.env.WG_REVIEW_BIOMES??'manglares').split(','))for(const variant of (process.env.WG_REVIEW_VARIANTS??'base').split(',')){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message)});page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text())){errors.push(m.text());console.error(m.text())}});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 if(biome==='gran-rio')await installRiverCoverPaletteRoute(page,variant==='combined');
 if(biome==='gran-canon')await page.route('**/content/ground-materials.json*',async route=>{const response=await route.fetch(),tiles=await response.json();if(tiles.canyons.scale!==.2)throw Error('Unexpected canyon scale');tiles.canyons.scale=.08;await route.fulfill({response,json:tiles});});
 if(variant==='combined')await installMangroveContextRoute(page);
 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712'+'&visualLab=global-lighting&sandRelief=1'+(variant==='combined'?'&canyonSand=1&volcanicAsh=procedural':''));
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state||window.qaCampaignWorld?.shaderFailure?.current,null,{timeout:60000});
 await page.evaluate(()=>{const f=window.qaCampaignWorld?.shaderFailure?.current;if(f)throw Error(JSON.stringify(f.details));});
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
  if(biome==='gran-canon')(await import('/tools/experiments/qa-canyon-warm-floor-streaming.js')).applyMaterialStudy(w);
  if(biome==='manglares')(await import('/tools/experiments/qa-mangrove-mud-moss-toon-interior.js')).applyMaterialStudy(w);
 }
 },{biome,variant});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;const o=w.controls.target.toArray();window.qaSandPath=[[22,16,18],[6,34,6],[-18,9,22]].map(([x,y,z])=>[o[0]+x,Math.max(o[1]+y,w.nav.field.surface(o[0]+x,o[2]+z)+1.2),o[2]+z]);w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();});

 const audit=await page.evaluate(()=>{const w=window.qaCampaignWorld;const entries=[];for(const [key,g] of w.chunks){const m=g.children.find(m=>m.userData.ground);const u=m?.material.userData.biomeGround;if(!u)continue;const im=u.uGroundMask.value.image;const channels=[];for(let c=0;c<4;c++){const vs=Array.from(im.data).filter((_,i)=>i%4===c).sort((a,b)=>a-b);channels.push({min:vs[0],p10:vs[Math.floor(vs.length*.1)],p50:vs[Math.floor(vs.length*.5)],p90:vs[Math.floor(vs.length*.9)],max:vs.at(-1),mean:vs.reduce((a,b)=>a+b,0)/vs.length});}entries.push({key,mapped:u.uGroundMapped.value,rect:u.uGroundRect.value.toArray(),width:im.width,height:im.height,channels,data:Array.from(im.data)});}return {biome:w.state.biome,spatialSession:!!w.spatialSession,target:w.controls.target.toArray(),entries};});
 if(errors.length)throw Error(errors.join('\n'));await writeFile(out+'/masks.json',JSON.stringify({seed:712,quality,audit,errors},null,2)+'\n');console.log('Masks audited',audit.entries.length);await page.close();
 }}finally{await browser.close()}
