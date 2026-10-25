import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='docs/qa/production-integration-20261025/horizon-focus-motion';await mkdir(out,{recursive:true});
const biome=process.env.WG_LIGHT_BIOME??'manglares';
const browser=await chromium.launch({channel:'chrome',headless:true});const records=[];
try{for(const [run,arm] of ['off','on','off','on'].entries()){
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'&&errors.length<20)errors.push(m.text());});
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();const body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World hook absent');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaLightingWorld=this;this.raycaster=new')});});
 await page.addInitScript(()=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',farVegetation:true,sfx:0,music:0})));
 await page.goto('http://localhost:5190/?qa-seed=712');await page.waitForSelector('#native-menu');const menu=page.frameLocator('#native-menu');await menu.locator('#loading').waitFor({state:'hidden',timeout:90000});
 await menu.locator('body').evaluate((_,biome)=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaLightingWorld?.state,null,{timeout:240000});

 const result=await page.evaluate(async arm=>{
  const w=window.qaLightingWorld,gl=w.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
  w.horizonFocus.enabled=arm==='on';
  const origin=w.controls.target.clone(),oldCamera=w.updateCamera,oldDraw=w.drawWorldFrame;
  const cpu=[],gpu=[],interval=[],pending=[];let frames=0,last=0,disjoint=false;
  const before={time:w.state.time,pauses:[...w.state.pauses],textures:w.renderer.info.memory.textures};
  w.updateCamera=()=>{const a=Math.min(frames,420)/420*Math.PI*2;const x=origin.x+Math.sin(a)*95,z=origin.z+(1-Math.cos(a))*60;const y=w.nav.field.surface(x,z)+1;w.controls.target.set(x,y,z);w.camera.position.set(x+22,y+8+Math.sin(a)*4,z+18);w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();};
  let resolve;const done=new Promise(r=>resolve=r);
  w.drawWorldFrame=function(...args){frames++;const measured=frames>60&&frames<=420;const q=ext&&measured?gl.createQuery():null;if(q)gl.beginQuery(ext.TIME_ELAPSED_EXT,q);const start=performance.now();try{return oldDraw.apply(this,args);}finally{const end=performance.now();if(measured){cpu.push(end-start);if(last)interval.push(start-last);}last=start;if(q){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(q);}if(ext){disjoint ||= gl.getParameter(ext.GPU_DISJOINT_EXT);while(pending.length&&gl.getQueryParameter(pending[0],gl.QUERY_RESULT_AVAILABLE)){const item=pending.shift();gpu.push(gl.getQueryParameter(item,gl.QUERY_RESULT)/1e6);gl.deleteQuery(item);}}if(frames>420&&!pending.length)resolve();}};
  try{await Promise.race([done,new Promise((_,reject)=>setTimeout(()=>reject(Error('Motion timeout')),120000))]);}finally{w.drawWorldFrame=oldDraw;w.updateCamera=oldCamera;for(const q of pending)gl.deleteQuery(q);}
  const debug=gl.getExtension('WEBGL_debug_renderer_info');
  return {arm,before,after:{time:w.state.time,pauses:[...w.state.pauses],textures:w.renderer.info.memory.textures},cpu,gpu,interval,disjoint,glError:gl.getError(),focus:{...w.horizonFocus.stats},renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};
 },arm);
 records.push(result);await page.screenshot({path:`${out}/${biome}-${run}-${arm}.png`});
 await writeFile(`${out}/${biome}.json`,JSON.stringify({scope:'Fresh campaign per ABAB arm, same seed and 420-frame camera path, first 60 frames warmup; natural simulation state retained and pauses reported. CPU measures draw submission, GPU complete world draw; interval is draw cadence, not physical presentation. Streaming enabled; changing scene work can differ with asynchronous readiness.',records,errors},null,2));
 if(errors.length||result.glError||result.disjoint||result.focus.disabledReason)throw Error('Motion validation failed: '+JSON.stringify({errors,result}));
 console.log(biome,run,arm,'motion passed');await page.close();
}}finally{await browser.close();}
