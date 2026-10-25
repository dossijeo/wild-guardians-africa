import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='docs/qa/production-integration-20261025/lighting-pilot-bank';await mkdir(out,{recursive:true});
const biome=process.env.WG_LIGHT_BIOME??'manglares';
const browser=await chromium.launch({channel:'chrome',headless:true});const records=[];
try{for(const arm of ['original','warm']){
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();const body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World hook absent');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaLightingWorld=this;this.raycaster=new')});});
 if(arm==='warm'){
  await page.route('**/src/rendering/african-toon.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`\nconst qaOriginalMaterial=AfricanToon.prototype.material;
AfricanToon.prototype.material=function(m){const result=qaOriginalMaterial.call(this,m);if(m.userData.qaWarm)return result;m.userData.qaWarm=true;const compile=m.onBeforeCompile;m.onBeforeCompile=function(s,r){compile.call(this,s,r);s.fragmentShader=s.fragmentShader.replace('mix(vec3(3.65,3.30,2.78),','mix(vec3(3.88,3.26,2.48),');};return result;};\n`});});
  await page.route('**/src/rendering/biome-material-source.js*',async route=>{const response=await route.fetch();await route.fulfill({response,body:await response.text()+`\nfor(const name of ['savanna','grand_river','mangrove','volcanoes']){const p=ART_PROFILES[name];p.sun=p.sun.map((v,i)=>v*[1.10,1.015,.88][i]);}\n`});});
 }
 await page.addInitScript(()=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality:'media',farVegetation:true,sfx:0,music:0})));
 await page.goto('http://localhost:5190/?qa-seed=712');await page.waitForSelector('#native-menu');const menu=page.frameLocator('#native-menu');await menu.locator('#loading').waitFor({state:'hidden',timeout:90000});
 await menu.locator('body').evaluate((_,biome)=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaLightingWorld?.state,null,{timeout:240000});
 const setup=await page.evaluate(async()=>{const w=window.qaLightingWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.state.time=150;w.state.elapsed=2;w.simElapsed=2;w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();};const f=w.nav.field,o=w.controls.target.clone();let best=null;for(let z=-100;z<=100;z+=2)for(let x=-100;x<=100;x+=2){const px=o.x+x,pz=o.z+z;if(f.waterInfo(px,pz).inside&&(!best||x*x+z*z<best.d))best={x:px,z:pz,d:x*x+z*z};}if(best)w.controls.target.set(best.x,f.surface(best.x,best.z)+.9,best.z);const p=w.controls.target.clone();w.camera.position.set(p.x+22,p.y+16,p.z+18);w.syncChunks();await w.whenChunksReady();await w.horizon?.whenReady();const update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(2);return {camera:w.camera.position.toArray(),target:w.controls.target.toArray(),biome:w.state.biome,visualSearch:w.visualSearch};});
 for(const phase of ['day','night']){
  await page.evaluate(phase=>{const w=window.qaLightingWorld;w.state.time=phase==='day'?150:350;w.render(0);},phase);await page.waitForTimeout(1500);
  const file=`${biome}-${arm}-${phase}.png`;await page.screenshot({path:`${out}/${file}`});
  records.push({arm,phase,file,...setup,metrics:await page.evaluate(()=>{const w=window.qaLightingWorld;return {calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,memory:{...w.renderer.info.memory},coverage:w.groundDetails?.audit?.(),glError:w.renderer.getContext().getError()};}),errors:[...errors]});
 }
 await page.close();console.log(biome,arm,'captured');await writeFile(`${out}/${biome}.json`,JSON.stringify({scope:'Real campaign renderer, seed 712, same camera and visual time; QA route changes light constants only. No DOF or timing claim; fern baked LOD lighting deliberately unchanged to assess mismatch.',records},null,2));
}}finally{await browser.close();}
