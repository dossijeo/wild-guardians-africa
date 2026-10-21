import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='docs/qa/global-visual-lab/loading-native-shadow-equivalence-20261022';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch(),body=(await response.text()).replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new');await route.fulfill({response,body});});
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&loadingBeam=diffuse');await page.waitForSelector('#native-menu',{timeout:60000});const menu=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});await menu.waitForLoadState('load');await menu.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await menu.evaluate(()=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome:'sabana',culture:'mapungubwe'},location.origin));await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.render=()=>{};const {LoadingDiorama}=await import('/src/rendering/loading-diorama.js');const d=window.qaLoading=new LoadingDiorama(w,{reducedMotion:true});await d.prepare();d.show({day:1,time:150,biome:'sabana'});for(let i=0;i<90;i++)d.render(1/30,.75);});
 const records=[];
 for(const phase of ['day','night'])for(const force of [false,true]){
  const frame=await page.evaluate(({phase,force})=>{const d=window.qaLoading,r=d.world.renderer;d.state.time=phase==='day'?150:350;d.plants.time=1.5;d.orbit.reducedMotion=false;d.orbit.step=()=>.1;d.render(0,.75);r.info.autoReset=false;r.info.reset();r.shadowMap.needsUpdate=force;d.render(0,.75);return {phase,force,calls:r.info.render.calls,triangles:r.info.render.triangles,png:d.world.canvas.toDataURL('image/png').split(',')[1]};},{phase,force});
  await writeFile(`${out}/${phase}-${force?'refresh':'cache'}.png`,Buffer.from(frame.png,'base64'));delete frame.png;records.push(frame);
 }
 await writeFile(`${out}/equivalence-captures.json`,JSON.stringify({records,errors},null,2));console.log(JSON.stringify({records,errors}));
 await page.evaluate(()=>window.qaLoading.dispose());
}finally{await browser.close();await writeFile(`${out}/finished.flag`,'finished');}
