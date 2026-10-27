import {installSkyDepth} from './qa-sky-horizon-cloud-mask-20261021.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='docs/qa/global-visual-lab/loading-framing-motion-20261021';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('pageerror',e=>errors.push(e.message));const biome='sabana';const variant='shadow';
try{
if(true){
 await installSkyDepth(page);
 await page.route('**/src/rendering/loading-mist.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes("'#e6d5b5'"))throw Error('Mist anchor missing');body=body.replace("'#e6d5b5'","'#c9bc9c'").replace('mix(.86,.96,distant)','mix(.76,.92,distant)');await route.fulfill({response,body});});
}

 if(variant==='garden'||variant==='shadow'){
 await page.route('**/src/rendering/loading-diorama.js*',async route=>{
 const response=await route.fetch();let body=await response.text();
 const original="mountains.arcLayout.slice(0,3).map((arc,index)=>({...arc,angle:Math.atan2(-4.8,-6.4)+(index-1)*.45,height:index===1?6.5:4.6,baseY:-1.4}))";
 if(!body.includes(original))throw Error('Loading mountains layout anchor missing');
 body=body.replace(original,"mountains.arcLayout.slice(1,2).map(arc=>({...arc,angle:Math.atan2(-4.8,-6.4),height:6.5,baseY:-1.4}))");
 body=body.replace('smoothstep(.02,.4,vBackdropHeight)*c.a','smoothstep(.02,.6,vBackdropHeight)*c.a*(1.-uBackdropNight)');
 body=body.replace('portrait?1.65:1','portrait?2.15:1');
 if(variant==='shadow')body=body.replace('try{world.renderer.shadowMap.enabled=false;world.renderer.autoClear=false','try{world.renderer.shadowMap.enabled=true;world.renderer.autoClear=false');
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
 const d=window.qaLoading=new LoadingDiorama(w,{reducedMotion:true});await d.prepare();d.show({day:1,time:150,biome:'sabana'});if(variant==='garden'||variant==='shadow'){d.mist.night.set('#102d5b');d.mist.day.set('#dac5a0');d.backdrop.root.traverse(mesh=>{if(!mesh.isMesh)return;const uv=mesh.geometry.attributes.uv;let lo=1,hi=0;for(let i=0;i<uv.count;i++){lo=Math.min(lo,uv.getX(i));hi=Math.max(hi,uv.getX(i));}const a=n=>n.toFixed(8);mesh.material.fragmentShader=mesh.material.fragmentShader.replace('c.a*(1.-uBackdropNight)',`c.a*(1.-uBackdropNight)*smoothstep(${a(lo)},${a(lo+(hi-lo)*.18)},vBackdropUv.x)*(1.-smoothstep(${a(hi-(hi-lo)*.18)},${a(hi)},vBackdropUv.x))`);mesh.material.needsUpdate=true;});}
 if(variant==='contact'||variant==='garden'||variant==='shadow')window.qaContact=(await import('/tools/experiments/qa-loading-contact-20261021.js')).installLoadingContact(d);
 if(variant==='shadow')window.qaLoadingShadow=(await import('/tools/experiments/qa-loading-shadow-20261021.js')).installLoadingShadow(d);
 const {LoadingOverlay}=await import('/src/ui/loading-overlay.js');
 const {createLoadingFrameLoader}=await import('/src/ui/loading-ornament-loader.js');
 const {createFrameImageLoader}=await import('/src/ui/frame-image-loader.js');const {ASSETS}=await import('/src/ui/native-hud.js');
 const frameImages=await createLoadingFrameLoader(createFrameImageLoader(ASSETS))();
 const overlay=window.qaLoadingOverlay=new LoadingOverlay({locale:'es',frameImages,onCancel:()=>window.qaCancelled=true});
 document.querySelector('#stage').classList.add('world-loading');document.querySelector('#stage').append(overlay.element);
 window.qaSnapshot={progress:.75,pending:['animals'],ready:false,unchangedFor:0};
 for(let i=0;i<90;i++)d.render(1/30,.75);
},variant);

await mkdir(`${out}/frames`,{recursive:true});
await page.evaluate(async()=>{const d=window.qaLoading;(await import('/tools/experiments/qa-loading-framing-smooth-20261021.js')).installLoadingFraming(d);d.orbit.setReducedMotion(false);d.state.time=150;d.render(0,.75);});
const frames=[];
for(let i=0;i<180;i++){
 const r=await page.evaluate(i=>{
  const d=window.qaLoading;
  if(i===30||i===90){const limit=i===30?11:18;for(let k=0;k<2000&&d.plants.plants.length<limit;k++){const a=k*2.399963229728653,r=4.25*Math.sqrt(((k*73)%1999)/1999);const p=d.plants.plant(r*Math.cos(a),r*Math.sin(a));if(p)d.onPlant?.(p);}}
  d.render(1/30,.75);window.qaLoadingOverlay.render(window.qaSnapshot,.75,{night:d.night,accepting:d.plants.plants.length<d.plants.capacity});
  const roots=d.plants.plants.map(p=>d.camera.position.clone().set(p.x,.09,p.z).project(d.camera));
  return {i,camera:d.camera.position.toArray(),distance:d.camera.position.distanceTo(d.focus),plants:d.plants.plants.length,rootsOutside:roots.filter(p=>Math.abs(p.x)>1||Math.abs(p.y)>1).length,angle:d.orbit.angle,glError:d.world.renderer.getContext().getError()};
 },i);frames.push(r);
 if(i%2===0)await page.screenshot({path:`${out}/frames/${String(i/2).padStart(4,'0')}.png`});
}
const poses=[];
for(const format of ['landscape','portrait']){
 await page.setViewportSize(format==='landscape'?{width:1280,height:720}:{width:390,height:844});
 for(const phase of ['day','night'])for(const angle of [-10,0,10]){
  const r=await page.evaluate(({phase,angle})=>{const d=window.qaLoading;d.orbit.setReducedMotion(true);d.orbit.phase=Math.asin(angle/10);d.state.time=phase==='day'?150:350;d.render(0,.75);window.qaLoadingOverlay.render(window.qaSnapshot,.75,{night:d.night,accepting:false});const roots=d.plants.plants.map(p=>d.camera.position.clone().set(p.x,.09,p.z).project(d.camera));return {camera:d.camera.position.toArray(),rootsOutside:roots.filter(p=>Math.abs(p.x)>1||Math.abs(p.y)>1).length,glError:d.world.renderer.getContext().getError()};},{phase,angle});
  poses.push({format,phase,angle,...r});await page.screenshot({path:`${out}/${format}-${phase}-${angle}.png`});
 }
}
await writeFile(`${out}/motion.json`,JSON.stringify({note:'Six seconds of deterministic simulation at 30 Hz, 90 screenshots at 15 Hz; offline playback, not realtime performance. Plant bursts are stress fixtures, not user clicks.',frames,poses,errors},null,2)+'\n');
console.log(JSON.stringify({frames:frames.length,maxOutside:Math.max(...frames.map(f=>f.rootsOutside)),poses,errors}));
}finally{await browser.close()}
