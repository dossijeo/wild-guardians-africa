import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.env.WG_DAYLIGHT_OUTPUT??'docs/qa/production-integration-20261025/lighting-final';await mkdir(out,{recursive:true});
const biome=process.env.WG_LIGHT_BIOME??'manglares';
const browser=await chromium.launch({channel:'chrome',headless:true});const records=[];
try{for(const [run,arm] of (process.env.WG_DAYLIGHT_BENCH==='1'?['original','warm','original','warm']:['original','warm']).entries()){
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();const body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World hook absent');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaLightingWorld=this;this.raycaster=new')});});
 await page.addInitScript(()=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',farVegetation:true,sfx:0,music:0})));
 await page.goto('http://localhost:5190/?qa-seed=712&horizonFocus=0&finalDaylight='+(arm==='original'?'0':'1'));await page.waitForSelector('#native-menu');const menu=page.frameLocator('#native-menu');await menu.locator('#loading').waitFor({state:'hidden',timeout:90000});
 await menu.locator('body').evaluate((_,biome)=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaLightingWorld?.state,null,{timeout:240000});
 const setup=await page.evaluate(async()=>{const w=window.qaLightingWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.state.time=150;w.state.elapsed=2;w.simElapsed=2;w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();};const f=w.nav.field,o=w.controls.target.clone();let best=null;for(let z=-100;z<=100;z+=2)for(let x=-100;x<=100;x+=2){const px=o.x+x,pz=o.z+z;if(f.waterInfo(px,pz).inside&&(!best||x*x+z*z<best.d))best={x:px,z:pz,d:x*x+z*z};}if(best)w.controls.target.set(best.x,f.surface(best.x,best.z)+.9,best.z);const p=w.controls.target.clone();w.camera.position.set(p.x+22,p.y+16,p.z+18);w.syncChunks();await w.whenChunksReady();await w.horizon?.whenReady();const update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(2);return {camera:w.camera.position.toArray(),target:w.controls.target.toArray(),biome:w.state.biome,visualSearch:w.visualSearch};});

 if(process.env.WG_DAYLIGHT_BENCH==='1')await page.waitForTimeout(Number(process.env.WG_DAYLIGHT_SETTLE_MS??0));
 let timing=null;
 if(process.env.WG_DAYLIGHT_BENCH==='1')timing=await page.evaluate(async()=>{
  const w=window.qaLightingWorld,gl=w.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');if(!ext)return {unsupported:true};
  const original=w.drawWorldFrame,cpu=[],gpu=[],interval=[],pending=[];let count=0,last=0,disjoint=false,finish;
  const done=new Promise(r=>finish=r);
  w.drawWorldFrame=function(...args){count++;const measured=count>45&&count<=225,q=measured?gl.createQuery():null;if(q)gl.beginQuery(ext.TIME_ELAPSED_EXT,q);const start=performance.now();try{return original.apply(this,args);}finally{if(measured){cpu.push(performance.now()-start);if(last)interval.push(start-last);}last=start;if(q){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(q);}disjoint ||= gl.getParameter(ext.GPU_DISJOINT_EXT);while(pending.length&&gl.getQueryParameter(pending[0],gl.QUERY_RESULT_AVAILABLE)){const item=pending.shift();gpu.push(gl.getQueryParameter(item,gl.QUERY_RESULT)/1e6);gl.deleteQuery(item);}if(count>225&&!pending.length)finish();}};
  try{await Promise.race([done,new Promise((_,reject)=>setTimeout(()=>reject(Error('Daylight timer timeout')),60000))]);}finally{w.drawWorldFrame=original;for(const q of pending)gl.deleteQuery(q);}
  return {cpu,gpu,interval,disjoint,glError:gl.getError(),scope:'Resident paused scene, 45 warmup frames, 180 complete-draw GPU samples. No image readback during measurement.'};
 });
 if(timing&&(timing.disjoint||timing.glError))throw Error('Invalid timing run');
 for(const phase of ['day','night']){
  await page.evaluate(phase=>{const w=window.qaLightingWorld;w.state.time=phase==='day'?150:350;w.render(0);},phase);await page.waitForTimeout(1500);
  const file=`${biome}-${arm}-${phase}.png`;await page.screenshot({path:`${out}/${file}`});
  records.push({run,arm,phase,file,timing:phase==='day'?timing:null,...setup,metrics:await page.evaluate(()=>{const w=window.qaLightingWorld;return {calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,memory:{...w.renderer.info.memory},coverage:w.groundDetails?.audit?.(),glError:w.renderer.getContext().getError()};}),errors:[...errors]});
 }
 if(errors.length||records.some(r=>r.metrics.glError))throw Error('Lighting validation errors: '+JSON.stringify(errors));
 await page.close();console.log(biome,arm,'captured');await writeFile(`${out}/${biome}.json`,JSON.stringify({scope:'Real campaign renderer, seed 712, same camera and visual time; Integrated final daylight on/off with the same scene and time. DOF disabled in both arms to isolate lighting; no timing claim.',records},null,2));
}}finally{await browser.close();}
