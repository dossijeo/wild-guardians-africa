import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='docs/qa/global-visual-lab/mangrove-mud-moss-toon-interior/streaming';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media,baja').split(',')){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1}),errors=[],steps=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch(),body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('Observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});
 await page.route('**/src/app/main.js*',async route=>{const response=await route.fetch(),body=await response.text();if(!body.includes('async function boot()'))throw Error('Close anchor missing');await route.fulfill({response,body:body.replace('async function boot()','globalThis.qaCloseWorld=clearWorld;async function boot()')});});
 await page.addInitScript(q=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:q,farVegetation:false})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&visualLab=global-lighting');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(()=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome:'manglares',culture:'mapungubwe'},location.origin));
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};const update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0);await(await import('/tools/experiments/qa-mangrove-mud-moss-toon-interior.js')).applyMaterialStudy(w);window.qaOrigin=w.controls.target.toArray();window.qaDisposals=[];window.qaSeen=new WeakSet();window.qaObserve=()=>{for(const group of w.chunks.values())for(const mesh of group.children){if(mesh.name!=='mangrove-mud-patches'||qaSeen.has(mesh.geometry))continue;qaSeen.add(mesh.geometry);const record={geometry:0,material:0};qaDisposals.push(record);mesh.geometry.addEventListener('dispose',()=>record.geometry++);mesh.material.addEventListener('dispose',()=>record.material++);}};qaObserve();});
 for(const [label,dz] of [['start',0],['away144',144],['away288',288],['return',0]]){
  await page.evaluate(async dz=>{const w=qaCampaignWorld,[x,y,z]=qaOrigin;w.controls.target.set(x,dz===0?y:w.nav.field.surface(x,z+dz)+.9,z+dz);w.camera.position.copy(w.controls.target).add({x:32,y:26,z:32});w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();qaObserve();},dz);
  for(const phase of ['day','night'])for(const enabled of [false,true]){
   const result=await page.evaluate(async({phase,enabled})=>{const w=qaCampaignWorld;w.qaMudBlend.setEnabled(enabled);w.state.day=1;w.state.time=phase==='day'?150:350;for(let i=0;i<12;i++)w.render(.016);return {camera:w.camera.position.toArray(),target:w.controls.target.toArray(),chunks:[...w.chunks.keys()].sort(),audit:w.qaMudBlend.audit(),memory:{...w.renderer.info.memory},calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,glError:w.renderer.getContext().getError(),disposed:qaDisposals.filter(r=>r.geometry).length,data:w.renderer.domElement.toDataURL('image/png').split(',')[1]};},{phase,enabled});
   const file=`${quality}-${label}-${phase}-${enabled?'B':'A'}.png`;await writeFile(`${out}/${file}`,Buffer.from(result.data,'base64'));delete result.data;steps.push({label,phase,enabled,file,...result});if(result.glError)throw Error('WebGL error');
  }
 }
 const disposal=await page.evaluate(()=>{const w=qaCampaignWorld;qaCloseWorld();w.dispose();return {worldDisposed:w.disposed,bound:w.qaMudBlend.audit().bound,records:qaDisposals,masks:w.biomeGround.masks.size,textures:w.biomeGround.textures.length};});
 await writeFile(`${out}/${quality}.json`,JSON.stringify({steps,disposal,errors},null,2)+'\n');
 if(errors.length||disposal.bound||!disposal.worldDisposed||disposal.masks||disposal.textures||disposal.records.some(r=>r.geometry!==1||r.material!==1))throw Error('Lifecycle audit failed; see JSON');
 console.log(JSON.stringify({quality,frames:steps.length,disposed:disposal.records.length,errors}));await page.close();
}}finally{await browser.close()}
