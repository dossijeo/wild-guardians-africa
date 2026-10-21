import {installSkyDepth} from './qa-sky-horizon-cloud-mask-20261021.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='docs/qa/global-visual-lab/loading-contact-20261021';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('pageerror',e=>errors.push(e.message));const biome='sabana';const variant=process.env.WG_LOADING_VARIANT??'base';
try{
if(true){
 await installSkyDepth(page);
 await page.route('**/src/rendering/loading-mist.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes("'#e6d5b5'"))throw Error('Mist anchor missing');body=body.replace("'#e6d5b5'","'#c9bc9c'").replace('mix(.86,.96,distant)','mix(.76,.92,distant)');await route.fulfill({response,body});});
}

 if(variant==='garden'){
 await page.route('**/src/rendering/loading-diorama.js*',async route=>{
 const response=await route.fetch();let body=await response.text();
 const original="mountains.arcLayout.slice(0,3).map((arc,index)=>({...arc,angle:Math.atan2(-4.8,-6.4)+(index-1)*.45,height:index===1?6.5:4.6,baseY:-1.4}))";
 if(!body.includes(original))throw Error('Loading mountains layout anchor missing');
 body=body.replace(original,"mountains.arcLayout.slice(1,2).map(arc=>({...arc,angle:Math.atan2(-4.8,-6.4),height:6.5,baseY:-1.4}))");
 body=body.replace('smoothstep(.02,.4,vBackdropHeight)*c.a','smoothstep(.02,.6,vBackdropHeight)*c.a*(1.-uBackdropNight)');
 await route.fulfill({response,body});});
 await page.route('**/src/rendering/loading-focus-light.js*',async route=>{const response=await route.fetch();const body=(await response.text()).replace('mix(1.30,3.00,uLoadingFocusNight)','mix(1.30,2.30,uLoadingFocusNight)');await route.fulfill({response,body});});
 }
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});}); await page.goto('http://127.0.0.1:5190/?qa-seed=712');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});

await page.evaluate(async variant=>{
 const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.render=()=>{};
 const {LoadingDiorama}=await import('/src/rendering/loading-diorama.js');
 const d=window.qaLoading=new LoadingDiorama(w,{reducedMotion:true});await d.prepare();d.show({day:1,time:150,biome:'sabana'});if(variant==='garden'){d.mist.night.set('#102d5b');d.mist.day.set('#dac5a0');d.backdrop.root.traverse(mesh=>{if(!mesh.isMesh)return;const uv=mesh.geometry.attributes.uv;let lo=1,hi=0;for(let i=0;i<uv.count;i++){lo=Math.min(lo,uv.getX(i));hi=Math.max(hi,uv.getX(i));}const a=n=>n.toFixed(8);mesh.material.fragmentShader=mesh.material.fragmentShader.replace('c.a*(1.-uBackdropNight)',`c.a*(1.-uBackdropNight)*smoothstep(${a(lo)},${a(lo+(hi-lo)*.18)},vBackdropUv.x)*(1.-smoothstep(${a(hi-(hi-lo)*.18)},${a(hi)},vBackdropUv.x))`);mesh.material.needsUpdate=true;});}
 if(variant==='contact'||variant==='garden')window.qaContact=(await import('/tools/experiments/qa-loading-contact-20261021.js')).installLoadingContact(d);
 const {LoadingOverlay}=await import('/src/ui/loading-overlay.js');
 const {createLoadingFrameLoader}=await import('/src/ui/loading-ornament-loader.js');
 const {createFrameImageLoader}=await import('/src/ui/frame-image-loader.js');const {ASSETS}=await import('/src/ui/native-hud.js');
 const frameImages=await createLoadingFrameLoader(createFrameImageLoader(ASSETS))();
 const overlay=window.qaLoadingOverlay=new LoadingOverlay({locale:'es',frameImages,onCancel:()=>window.qaCancelled=true});
 document.querySelector('#stage').classList.add('world-loading');document.querySelector('#stage').append(overlay.element);
 window.qaSnapshot={progress:.75,pending:['animals'],ready:false,unchangedFor:0};
 for(let i=0;i<90;i++)d.render(1/30,.75);
},variant);
const records=[];
for(const phase of ['day','night']){
 const r=await page.evaluate(phase=>{const d=window.qaLoading;d.state.time=phase==='day'?150:350;d.world.renderer.info.autoReset=false;d.world.renderer.info.reset();d.render(0,.75);window.qaLoadingOverlay.render(window.qaSnapshot,.75,{night:d.night});return {phase,camera:d.camera.position.toArray(),plants:d.plants.plants.length,calls:d.world.renderer.info.render.calls,triangles:d.world.renderer.info.render.triangles,error:d.world.renderer.getContext().getError(),data:d.world.canvas.toDataURL('image/png').split(',')[1]}},phase);
 await writeFile(`${out}/${variant}-${phase}.png`,Buffer.from(r.data,'base64'));delete r.data;records.push(r);await page.screenshot({path:`${out}/${variant}-${phase}-ui.png`});
}
let interaction=null;
if(variant==='garden'){
 const point=await page.evaluate(async()=>{const d=window.qaLoading;d.state.time=150;d.render(0,.75);const p=d.camera.position.clone().set(2.5,.09,0).project(d.camera);const r=d.world.canvas.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};});
 await page.mouse.click(point.x,point.y);
 interaction=await page.evaluate(()=>{const d=window.qaLoading;for(let i=0;i<35;i++)d.render(1/30,.75);return {plants:d.plants.plants.length,roots:window.qaContact.uniforms.uLoadingRootCount.value,progress:window.qaLoadingOverlay.track.getAttribute('aria-valuenow')};});
 if(interaction.plants!==5||interaction.roots!==5)throw Error('Plant event did not update contact registry');
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>{const d=window.qaLoading;d.render(0,.75);window.qaLoadingOverlay.render(window.qaSnapshot,.75,{night:d.night,pointer:'touch'});});
 await page.screenshot({path:`${out}/garden-portrait-ui.png`});
 await page.click('#loading-cancel');interaction.cancelled=await page.evaluate(()=>window.qaCancelled===true);
 if(!interaction.cancelled)throw Error('Cancel callback failed');
 await writeFile(`${out}/garden-interaction.json`,JSON.stringify(interaction,null,2)+'\n');
}
await writeFile(`${out}/${variant}-captures.json`,JSON.stringify({note:'Actual LoadingDiorama rendered after campaign preparation; deterministic presentation capture, not load-time measurement. Includes real LoadingOverlay, screenshots suffixed ui; total render counters include sky and mist.',records,errors},null,2)+'\n');
console.log(JSON.stringify({records,errors}));
}finally{await browser.close()}
