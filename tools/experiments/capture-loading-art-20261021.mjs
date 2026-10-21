import {installSkyDepth} from './qa-sky-horizon-cloud-mask-20261021.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='docs/qa/global-visual-lab/loading-art-20261021';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));const biome='sabana';const variant=process.env.WG_LOADING_VARIANT??'base';
try{
if(variant==='atmosphere'){
 await installSkyDepth(page);
 await page.route('**/src/rendering/loading-mist.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes("'#e6d5b5'"))throw Error('Mist anchor missing');body=body.replace("'#e6d5b5'","'#c9bc9c'").replace('mix(.86,.96,distant)','mix(.76,.92,distant)');await route.fulfill({response,body});});
}

 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});}); await page.goto('http://127.0.0.1:5190/?qa-seed=712');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});

await page.evaluate(async()=>{
 const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.render=()=>{};
 const {LoadingDiorama}=await import('/src/rendering/loading-diorama.js');
 const d=window.qaLoading=new LoadingDiorama(w,{reducedMotion:true});await d.prepare();d.show({day:1,time:150,biome:'sabana'});
 for(let i=0;i<90;i++)d.render(1/30,.75);
});
const records=[];
for(const phase of ['day','night']){
 const r=await page.evaluate(phase=>{const d=window.qaLoading;d.state.time=phase==='day'?150:350;d.render(0,.75);return {phase,camera:d.camera.position.toArray(),plants:d.plants.plants.length,calls:d.world.renderer.info.render.calls,triangles:d.world.renderer.info.render.triangles,error:d.world.renderer.getContext().getError(),data:d.world.canvas.toDataURL('image/png').split(',')[1]}},phase);
 await writeFile(`${out}/${variant}-${phase}.png`,Buffer.from(r.data,'base64'));delete r.data;records.push(r);
}
await writeFile(`${out}/${variant}-captures.json`,JSON.stringify({note:'Actual LoadingDiorama rendered after campaign preparation; deterministic presentation capture, not load-time measurement. UI overlay excluded.',records,errors},null,2)+'\n');
console.log(JSON.stringify({records,errors}));
}finally{await browser.close()}
