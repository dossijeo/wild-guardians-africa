import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const depthMode=process.env.WG_BLUR_DEPTH??'capture';const out='docs/qa/production-integration-20261025/horizon-blur-'+depthMode;await mkdir(out,{recursive:true});
const biome=process.env.WG_LIGHT_BIOME??'manglares';
const browser=await chromium.launch({channel:'chrome',headless:true});const records=[];
try{for(const arm of ['original']){
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'&&errors.length<20)errors.push(m.text());});
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();const body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World hook absent');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaLightingWorld=this;this.raycaster=new')});});
 await page.addInitScript(()=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',farVegetation:true,sfx:0,music:0})));
 await page.goto('http://localhost:5190/?qa-seed=712');await page.waitForSelector('#native-menu');const menu=page.frameLocator('#native-menu');await menu.locator('#loading').waitFor({state:'hidden',timeout:90000});
 await menu.locator('body').evaluate((_,biome)=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaLightingWorld?.state,null,{timeout:240000});
 const setup=await page.evaluate(async()=>{const w=window.qaLightingWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.state.time=150;w.state.elapsed=2;w.simElapsed=2;w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();};const f=w.nav.field,o=w.controls.target.clone();let best=null;for(let z=-100;z<=100;z+=2)for(let x=-100;x<=100;x+=2){const px=o.x+x,pz=o.z+z;if(f.waterInfo(px,pz).inside&&(!best||x*x+z*z<best.d))best={x:px,z:pz,d:x*x+z*z};}if(best)w.controls.target.set(best.x,f.surface(best.x,best.z)+.9,best.z);const p=w.controls.target.clone();w.camera.position.set(p.x+22,p.y+16,p.z+18);w.syncChunks();await w.whenChunksReady();await w.horizon?.whenReady();const update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(2);return {camera:w.camera.position.toArray(),target:w.controls.target.toArray(),biome:w.state.biome,visualSearch:w.visualSearch};});
 await page.evaluate(async depthMode=>{const {installHorizonDepthBlur}=await import('/tools/experiments/horizon-depth-blur.js');window.qaBlur=installHorizonDepthBlur(window.qaLightingWorld,{depthMode});},depthMode);
 for(const phase of ['day','night'])for(const view of ['game','horizon']){
  await page.evaluate(({phase,view})=>{const w=window.qaLightingWorld,p=w.controls.target;w.state.time=phase==='day'?150:350;w.camera.position.set(p.x+22,p.y+(view==='game'?16:4),p.z+18);w.camera.lookAt(p);w.camera.updateMatrixWorld();}, {phase,view});
  for(const mode of ['off','blur','mask']){
   await page.evaluate(mode=>{window.qaBlur.enabled=mode!=='off';window.qaBlur.auditNext=mode==='blur';window.qaBlur.uniforms.debug.value=mode==='mask'?1:0;},mode);await page.waitForTimeout(1200);
   const file=`${biome}-${view}-${phase}-${mode}.png`;await page.screenshot({path:`${out}/${file}`});
   records.push({phase,view,mode,file,metrics:await page.evaluate(()=>{const w=window.qaLightingWorld;return {camera:w.camera.position.toArray(),target:w.controls.target.toArray(),lastPassCalls:w.renderer.info.render.calls,lastPassTriangles:w.renderer.info.render.triangles,blur:window.qaBlur.stats,glError:w.renderer.getContext().getError()};}),errors:[...errors]});
   if(records.at(-1).metrics.glError){await writeFile(`${out}/${biome}-failed.json`,JSON.stringify({records},null,2));throw Error('Depth blur produced a WebGL error; benchmark cancelled');}
  }
 }
 if(process.env.WG_BLUR_BENCH==='1'){
 const benchmark=await page.evaluate(async()=>{
  const w=window.qaLightingWorld,b=window.qaBlur,gl=w.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');if(!ext)return {unsupported:true};w.state.time=150;b.uniforms.debug.value=0;b.auditNext=false;
  const original=w.drawWorldFrame,rows=[];let active=null;
  w.drawWorldFrame=function(...args){if(!active)return original.apply(this,args);const s=active;s.frames++;const q=s.frames>30&&s.frames<=120?gl.createQuery():null;if(gl.getQuery(ext.TIME_ELAPSED_EXT,gl.CURRENT_QUERY))throw Error('Nested GPU query');if(q)gl.beginQuery(ext.TIME_ELAPSED_EXT,q);const t=performance.now();try{return original.apply(this,args);}finally{s.cpu.push(performance.now()-t);if(s.last)s.frame.push(t-s.last);s.last=t;if(q){gl.endQuery(ext.TIME_ELAPSED_EXT);s.pending.push(q);}if(gl.getParameter(ext.GPU_DISJOINT_EXT))s.disjoint=true;while(s.pending.length&&gl.getQueryParameter(s.pending[0],gl.QUERY_RESULT_AVAILABLE)){const q=s.pending.shift();s.gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);}if(s.frames>120&&!s.pending.length){active=null;s.resolve();}}};
  try{for(const arm of ['off','blur','off','blur']){b.enabled=arm==='blur';const s={arm,frames:0,cpu:[],gpu:[],frame:[],pending:[],disjoint:false};await Promise.race([new Promise(resolve=>{s.resolve=resolve;active=s;}),new Promise((_,reject)=>setTimeout(()=>reject(Error('Timer timeout')),45000))]);delete s.resolve;delete s.pending;s.cpu=s.cpu.slice(30,120);s.frame=s.frame.slice(30,120);rows.push(s);}}finally{w.drawWorldFrame=original;}
  const debug=gl.getExtension('WEBGL_debug_renderer_info');return {depthMode:b.depthMode,scope:'Resident paused campaign, ABAB, 30 warmup + 90 complete drawWorldFrame GPU queries per arm. Includes framebuffer color copy, selected depth source and blur. No streaming, no CPU readback audit.',renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),drawingBuffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],rows};
 });await writeFile(`${out}/${biome}-benchmark.json`,JSON.stringify(benchmark,null,2));
 }
 await page.close();console.log(biome,arm,'captured');await writeFile(`${out}/${biome}.json`,JSON.stringify({depthMode,scope:'QA-only depth-aware horizon blur. Existing color pipeline copied unchanged; selected depth source + 9-tap screen filter. Sky has empty depth and is excluded, including neighbor taps. No performance claim yet.',records},null,2));
}}finally{await browser.close();}
