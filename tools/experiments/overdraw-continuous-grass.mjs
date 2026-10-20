import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/continuous-grass';await mkdir(out,{recursive:true});const records=[];
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



 for(const view of ['close','game','elevated'])for(const variant of ['B','C']){
 const result=await page.evaluate(async({view,variant})=>{
 const w=window.qaCampaignWorld,T=(await import('/tools/experiments/qa-continuous-grass.js')).THREE,r=w.renderer;
 w.controls.target.set(135,9.400129699707032,45);w.camera.position.set(...(view==='close'?[138,11.400129699707032,49]:view==='game'?[157,25.400129699707032,63]:[151,39.400129699707032,63]));w.state.time=150;
 w.syncChunks();await w.whenChunksReady();await (await import('/tools/experiments/qa-continuous-grass.js')).applyMaterialStudy(w,variant);w.render(.016);
 const q=w.qaContinuousGrass,target=new T.WebGLRenderTarget(1280,720,{depthBuffer:true}),oldTarget=r.getRenderTarget(),oldAuto=r.autoClear,oldColor=r.getClearColor(new T.Color()),oldAlpha=r.getClearAlpha(),oldBackground=w.scene.background;
 const materials=new Map(),visible=new Map(),grass=q.meshes.map(e=>e.mesh.material);
 w.scene.traverse(o=>{if(o.material)for(const m of(Array.isArray(o.material)?o.material:[o.material]))if(!materials.has(m))materials.set(m,{colorWrite:m.colorWrite,transparent:m.transparent,blending:m.blending,depthWrite:m.depthWrite});if(o.isMesh||o.isPoints||o.isLine)visible.set(o,o.visible)});
 const pixels=new Uint8Array(1280*720*4);
 try{
 r.setRenderTarget(target);r.autoClear=false;r.setClearColor(0,1);w.scene.background=null;r.clear();q.group.visible=false;
 for(const m of materials.keys())m.colorWrite=false;r.render(w.scene,w.camera);
 for(const[m,s]of materials)m.colorWrite=s.colorWrite;
 for(const o of visible.keys())o.visible=q.meshes.some(e=>e.mesh===o);
 q.group.visible=true;
 for(const m of grass){m.uniforms.uCoverageDiagnostic.value=1;m.transparent=true;m.blending=T.AdditiveBlending;m.depthWrite=false;}
 r.render(w.scene,w.camera);r.readRenderTargetPixels(target,0,0,1280,720,pixels);
 }finally{
 for(const[m,s]of materials)Object.assign(m,s);for(const[o,v]of visible)o.visible=v;for(const m of grass)m.uniforms.uCoverageDiagnostic.value=0;
 q.group.visible=true;w.scene.background=oldBackground;r.setRenderTarget(oldTarget);r.autoClear=oldAuto;r.setClearColor(oldColor,oldAlpha);target.dispose();
 }
 const hist=Array(17).fill(0);let sum=0,occupied=0;for(let i=0;i<pixels.length;i+=4){const n=Math.round(pixels[i]/16);hist[n]++;sum+=n;if(n)occupied++}
 return {view,variant,coverage:q.audit(),histogram:hist,grassPixelFraction:occupied/(1280*720),fragmentsPerScreenPixel:sum/(1280*720),fragmentsPerGrassPixel:sum/Math.max(1,occupied),saturatedPixels:hist[16],glError:r.getContext().getError()};
 },{view,variant});records.push({...result,quality});
 }
 await writeFile(out+'/overdraw-'+quality+'.json',JSON.stringify({note:'Potential grass overdraw: depth prepass of existing world, then additive blade rasterization with grass self-depth writes disabled. Lower bound when saturated >=16; actual early-Z opaque cost can be lower. No FPS claim.',records:records.filter(r=>r.quality===quality),errors},null,2));
 await page.close();
 }}finally{await browser.close()}
