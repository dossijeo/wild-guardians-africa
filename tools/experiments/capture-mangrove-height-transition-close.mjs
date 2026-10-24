import {installMangroveHeightBlendRoute} from './qa-mangrove-height-blend-route.mjs';
import {installRiverCoverPaletteRoute} from './qa-river-cover-palette-route.mjs';
import {installRiverWearRoute} from './river-wear-qa-route.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/mangrove-height-blend/transition-close';await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media,baja').split(','))for(const biome of (process.env.WG_REVIEW_BIOMES??'manglares').split(','))for(const variant of (process.env.WG_REVIEW_VARIANTS??'base,combined').split(',')){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message)});page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text())){errors.push(m.text());console.error(m.text())}});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 if(biome==='gran-rio')await installRiverCoverPaletteRoute(page,variant==='combined');
 if(biome==='gran-canon')await page.route('**/content/ground-materials.json*',async route=>{const response=await route.fetch(),tiles=await response.json();if(tiles.canyons.scale!==.2)throw Error('Unexpected canyon scale');tiles.canyons.scale=.08;await route.fulfill({response,json:tiles});});
 await installMangroveHeightBlendRoute(page,{height:variant==='combined',calibrated:true});
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
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;const origin=w.controls.target.clone(),field=w.nav.field;let best=null,score=Infinity;const occupied=(w.nav.obstacles??[]).flatMap(o=>o.footprint?.length?o.footprint:[o]).filter(o=>Number.isFinite(o.x)&&Number.isFinite(o.z));if(!occupied.length)throw Error('No obstacle coordinates for clear view');for(let dz=-96;dz<=96;dz+=2)for(let dx=-96;dx<=96;dx+=2){const x=origin.x+dx,z=origin.z+dz,y=field.surface(x,z);if(field.waterInfo(x,z).inside||y>origin.y+3||field.slope(x,z)>.12)continue;const clear=[[x,z],[x+9,z+9],[x+5,z+8]].every(([px,pz])=>!field.waterInfo(px,pz).inside&&field.surface(px,pz)<y+2&&occupied.every(o=>Math.hypot(o.x-px,o.z-pz)>9));if(!clear)continue;let ctx=null;for(const g of w.chunks.values()){const u=g.children.find(m=>m.userData.ground)?.material.userData.biomeGround;if(!u)continue;const r=u.uGroundRect.value,ix=Math.round((x-r.x)/r.z+1),iz=Math.round((z-r.y)/r.z+1);if(ix<1||ix>32||iz<1||iz>32)continue;const data=u.uGroundMask.value.image.data,at=(iz*35+ix)*4;ctx=Array.from(data.slice(at,at+4),v=>v/255);break;}if(!ctx)continue;const signal=ctx[1]*.64+ctx[0]*.18+.5*.18-ctx[3]*.10;if(signal<.30||signal>.39)continue;const d=dx*dx+dz*dz;if(d<score){score=d;best=[x,y+.3,z];}}if(!best)throw Error('No clear material transition for camera');w.controls.target.fromArray(best);const o=best;window.qaSandPath=[[9,5,9],[5,2,8]].map(([x,y,z])=>[o[0]+x,Math.max(o[1]+y,w.nav.field.surface(o[0]+x,o[2]+z)+1.2),o[2]+z]);const a=window.qaSandPath[0],b=window.qaSandPath[1];window.qaSandPath=[a,a.map((v,i)=>(v+b[i])*.5),b];w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();});

  for(const phase of phases){
   const dir=`${out}/${biome}-${quality}-${variant}-${phase}`;await mkdir(dir,{recursive:true});const frames=[];
   await page.evaluate(async phase=>{const w=window.qaCampaignWorld;w.state.time=phase==='day'?150:350;w.state.day=1;w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();for(const group of w.chunks.values())for(const batch of group.userData.lodBatches??[])batch.key=null;w.render(1/30);await Promise.all([...w.objects.values()].map(o=>o.userData.actorReady).filter(Boolean));for(let i=0;i<12;i++)w.render(1/30)},phase);
   for(let i=0;i<3;i++){
    const frame=await page.evaluate(async i=>{const w=window.qaCampaignWorld;w.camera.position.fromArray(window.qaSandPath[i]);w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();w.render(1/30);return {i,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),time:w.state.time,glError:w.renderer.getContext().getError(),coverage:w.qaContinuousGrass?.audit()??null,calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,data:w.renderer.domElement.toDataURL('image/png').split(',')[1]}},i);
    if(frame.glError)throw Error('WebGL error '+frame.glError);await writeFile(`${dir}/${String(i).padStart(4,'0')}.png`,Buffer.from(frame.data,'base64'));delete frame.data;frames.push(frame);
   }
   if(errors.length)throw Error(errors.join('\n'));records.push({biome,quality,variant,phase,initialLodReset:true,frames,errors:[...errors]});await writeFile(out+'/captures.json',JSON.stringify({study:'Linear moss and mud blend versus height-guided blend; same geometry and source masks',seed:712,resolution:[1280,720],views:['near','mid','oblique'],note:'Real paused campaign settlement, seed 712; identical poses and visual time, settled chunks. Static artistic review, not a performance benchmark.',records},null,2)+'\n');console.log(biome,quality,variant,phase,'captured');
  }
 await page.close();
 }}catch(error){for(const p of browser.contexts().flatMap(c=>c.pages()))console.error(await p.evaluate(()=>({text:document.body.innerText.slice(-2500),shader:window.qaCampaignWorld?.shaderFailure?.current?.details})).catch(()=>null));throw error;}finally{await browser.close()}
