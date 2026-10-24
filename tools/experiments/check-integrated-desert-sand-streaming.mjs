import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const control=false,out='docs/qa/global-visual-lab/desert-aerial-sand/integration-streaming';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media,baja').split(','))for(const biome of (process.env.WG_COVER_BIOMES??'desierto').split(',')){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});




 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 await page.route('**/src/app/main.js*',async route=>{const response=await route.fetch(),body=await response.text();if(!body.includes('async function boot()'))throw Error('Close anchor missing');await route.fulfill({response,body:body.replace('async function boot()','globalThis.qaCloseWorld=clearWorld;async function boot()')})});
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&visualLab=global-lighting&sandRelief=1');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});





 const steps=[];
 await page.evaluate(()=>{const w=window.qaCampaignWorld;w.controls.target.x+=50;w.controls.target.z+=30;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;window.qaSandOrigin=w.controls.target.toArray();});
 for(const [label,dz] of [['start',0],['away144',144],['away288',288],['return',0]]){

  await page.evaluate(async dz=>{const w=window.qaCampaignWorld,[x,y,z]=window.qaSandOrigin;w.controls.target.set(x,dz===0?y:w.nav.field.surface(x,z+dz)+.9,z+dz);w.camera.position.copy(w.controls.target).add({x:32,y:26,z:32});w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();w.render(.016)},dz);
  for(const phase of ['day','night']){
   const result=await page.evaluate(async({label,phase})=>{
    const THREE=await import('/node_modules/three/build/three.module.js');const w=window.qaCampaignWorld;w.state.day=1;w.state.time=phase==='day'?150:350;w.render(.016);
    const materials=[...new Set(w.terrainMeshes.map(m=>m.material))],horizon=[];w.horizon.group.traverse(o=>{if(o.userData.nativeHorizon==='terrain')horizon.push(o.material)});
    const audit=list=>list.map(m=>{const lib=m.isMeshBasicMaterial?THREE.ShaderLib.basic:THREE.ShaderLib.standard,shader={...lib,uniforms:THREE.UniformsUtils.clone(lib.uniforms)};m.onBeforeCompile(shader,w.renderer);return {normalOnly:shader.fragmentShader.includes('if(!desert)tile=textureGrad'),macroInk:shader.fragmentShader.includes('fwidth(sandGeometricNormal)'),params:m.userData.biomeGround.uGroundParams.value.toArray()};});
    const gl=w.renderer.getContext();return {label,phase,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),chunks:[...w.chunks.keys()].sort(),resident:audit(materials),horizon:audit(horizon),compiled:w.renderer.info.programs.filter(p=>gl.getShaderSource(p.fragmentShader)?.includes('fwidth(sandGeometricNormal)')).length,glError:gl.getError(),memory:{...w.renderer.info.memory},data:w.renderer.domElement.toDataURL('image/png').split(',')[1]};
   },{label,phase});
   if(!control&&label!=='base'&&(!result.compiled||!result.resident.length||!result.horizon.length||[...result.resident,...result.horizon].some(m=>!m.normalOnly||!m.macroInk||Math.abs(m.params[0]-1/30)>1e-8||m.params[2]!==1||m.params[3]!==0)))throw Error('Incomplete sand binding');
   if(result.glError){const {data,...diagnostic}=result;await writeFile(`${out}/failure-${quality}.json`,JSON.stringify({diagnostic,errors},null,2)+'\n');throw Error('WebGL error '+result.glError+' '+errors.join('\n'));}
   const file=`${quality}-${label}-${phase}.png`;await writeFile(`${out}/${file}`,Buffer.from(result.data,'base64'));delete result.data;steps.push({...result,file});
  }
 }
 const first=steps.find(s=>s.label==='start'&&s.phase==='day'),last=steps.find(s=>s.label==='return'&&s.phase==='day'),away=steps.find(s=>s.label==='away288');
 if(JSON.stringify(first.chunks)===JSON.stringify(away.chunks)||JSON.stringify(first.chunks)!==JSON.stringify(last.chunks)||JSON.stringify(first.camera)!==JSON.stringify(last.camera))throw Error('Invalid stream/return');
 const disposal=await page.evaluate(async()=>{const w=window.qaCampaignWorld,ground=w.biomeGround,map=ground.textures[1],source=await w.assets.cache.get('/assets/visual-lab/aerial_beach_01-normal.pngfalse');let cloneDisposals=0,sourceDisposals=0;map.addEventListener('dispose',()=>cloneDisposals++);source?.addEventListener('dispose',()=>sourceDisposals++);window.qaCloseWorld();w.dispose();return {disposed:w.disposed,groundDisposed:ground.disposed,remainingTextures:ground.textures.length,remainingMasks:ground.masks.size,cloneDisposals,sourceDisposals,sourceObserved:!!source}});
 if(!disposal.disposed||!disposal.groundDisposed||disposal.remainingTextures||disposal.remainingMasks||disposal.cloneDisposals!==1||!disposal.sourceObserved||disposal.sourceDisposals!==1)throw Error('Sand release failed');
 await writeFile(`${out}/${quality}.json`,JSON.stringify({control,steps,disposal,errors},null,2)+'\n');if(errors.length)throw Error(errors.join('\n'));console.log(quality,'streaming verified');await page.close();
 }}finally{await browser.close()}
