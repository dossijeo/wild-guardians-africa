import {installSkyDepth} from './qa-sky-horizon-cloud-mask-20261021.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const native=true;const out='docs/qa/global-visual-lab/loading-native-mesa-20261022';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
const errors=[];page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error(m.text());}});page.on('pageerror',e=>errors.push(e.message));const biome='sabana';const variant='shadow';
try{
if(true){
 await installSkyDepth(page);
 await page.route('**/src/rendering/loading-mist.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes("'#e6d5b5'"))throw Error('Mist anchor missing');body=body.replace("'#e6d5b5'","'#c9bc9c'").replace('mix(.86,.96,distant)','mix(.76,.92,distant)');await route.fulfill({response,body});});
}

 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});}); await page.goto('http://127.0.0.1:5190/?qa-seed=712'+(native?'&loadingBeam=diffuse':''));
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});

await page.evaluate(async variant=>{
 const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.render=()=>{};
 const {LoadingDiorama}=await import('/src/rendering/loading-diorama.js');
 const d=window.qaLoading=new LoadingDiorama(w,{reducedMotion:true});await d.prepare();d.show({day:1,time:150,biome:'sabana'});if(variant==='garden'||variant==='shadow'){d.mist.night.set('#102d5b');d.mist.day.set('#dac5a0');}
 if(variant==='contact'||variant==='garden'||variant==='shadow')window.qaContact=(await import('/tools/experiments/qa-loading-contact-20261021.js')).installLoadingContact(d);
 // Native diffuse option owns its shadow resources.
 const {LoadingOverlay}=await import('/src/ui/loading-overlay.js');
 const {createLoadingFrameLoader}=await import('/src/ui/loading-ornament-loader.js');
 const {createFrameImageLoader}=await import('/src/ui/frame-image-loader.js');const {ASSETS}=await import('/src/ui/native-hud.js');
 const frameImages=await createLoadingFrameLoader(createFrameImageLoader(ASSETS))();
 const overlay=window.qaLoadingOverlay=new LoadingOverlay({locale:'es',frameImages,onCancel:()=>window.qaCancelled=true});
 document.querySelector('#stage').classList.add('world-loading');document.querySelector('#stage').append(overlay.element);
 window.qaSnapshot={progress:.75,pending:['animals'],ready:false,unchangedFor:0};
 for(let i=0;i<90;i++)d.render(1/30,.75);
},variant);

if(native)await page.evaluate(()=>window.qaSetBeam=()=>{});else await page.evaluate(async()=>{window.qaSetBeam=(await import('/tools/experiments/qa-loading-beam-20261022.js')).installLoadingBeam(window.qaLoading)});
await page.evaluate(()=>{window.qaParallel=()=>{};});
await page.evaluate(()=>{const d=window.qaLoading,toggle=window.qaParallel,day=d.mist.day.clone();window.qaParallel=enabled=>{toggle(enabled);d.mist.day.copy(day);if(enabled){d.mist.day.set('#ead4b4');d.mist.material.fragmentShader=d.mist.material.fragmentShader.replace('edge*mix(.30,.28,uNight)','edge*mix(.08,.28,uNight)').replace('mix(1.,.70,edge)','mix(1.,mix(.96,.70,uNight),edge)');d.mist.material.needsUpdate=true;}};});
const records=[];
for(const format of ['landscape','portrait']){
 await page.setViewportSize(format==='landscape'?{width:1280,height:720}:{width:390,height:844});
 for(const phase of ['day','night'])for(const enabled of (native?[true]:[false,true])){
  const r=await page.evaluate(({phase,enabled})=>{const d=window.qaLoading;window.qaParallel(enabled);d.state.time=phase==='day'?150:350;for(let i=0;i<4;i++)d.render(0,.75);d.world.renderer.info.autoReset=false;d.world.renderer.info.reset();d.render(0,.75);window.qaLoadingOverlay.render(window.qaSnapshot,.75,{night:d.night});return {phase,enabled,camera:d.camera.position.toArray(),fov:d.camera.fov,zoom:d.camera.zoom,calls:d.world.renderer.info.render.calls,triangles:d.world.renderer.info.render.triangles,glError:d.world.renderer.getContext().getError()};},{phase,enabled});
  r.format=format;records.push(r);await page.screenshot({path:`${out}/${format}-${phase}-${enabled?'beam':'base'}.png`});
 }
}

const directionAudit=[];
for(const format of ['landscape','portrait']){
 await page.setViewportSize(format==='landscape'?{width:1280,height:720}:{width:390,height:844});
 for(const angle of [-10,0,10]){
  const row=await page.evaluate(({format,angle})=>{const d=window.qaLoading;window.qaParallel(true);d.orbit.phase=Math.asin(angle/10);d.render(0,.75);const light=d.sun.position.clone().sub(d.sun.target.position).normalize(),tip=d.camera.position.clone().set(0,2,0),shadow=tip.clone().addScaledVector(light,-(tip.y-.09)/light.y),a=tip.clone().project(d.camera),b=shadow.project(d.camera);const x=(a.x-b.x)*d.camera.aspect,y=a.y-b.y,dot=(x*.48+y)/(Math.hypot(x,y)*Math.hypot(.48,1));return {format,angle,dot,light:light.toArray(),zoom:d.camera.zoom,fov:d.camera.fov};},{format,angle});
  if(row.dot<.99999)throw Error('Beam and projected shadow direction disagree');directionAudit.push(row);
 }
}
await writeFile(`${out}/direction-audit.json`,JSON.stringify(directionAudit,null,2));
const handoff=await page.evaluate(()=>{const d=window.qaLoading,w=d.world;d.dispose();window.qaLoadingOverlay.dispose();document.querySelector('#stage').classList.remove('world-loading');w.render=Object.getPrototypeOf(w).render.bind(w);w.renderer.shadowMap.enabled=true;w.renderer.shadowMap.needsUpdate=true;w.renderer.info.reset();w.render(0);return {dioramaDisposed:d.disposed,worldDisposed:w.disposed??false,assetShadowDraws:w.releaseAssetShadows.stats.draws,assetShadowTriangles:w.releaseAssetShadows.stats.triangles,glError:w.renderer.getContext().getError()};});
if(!handoff.dioramaDisposed||handoff.worldDisposed||!handoff.assetShadowDraws||handoff.glError)throw Error('World shadow handoff failed: '+JSON.stringify(handoff));
await writeFile(`${out}/handoff.json`,JSON.stringify(handoff,null,2));
await page.screenshot({path:`${out}/world-after-handoff.png`});
await writeFile(`${out}/captures.json`,JSON.stringify({note:'Actual diorama and UI. Paired original / parallel rays + island rim haze. Fixed camera per aspect, no automatic framing.',records,errors},null,2)+'\n');
console.log(JSON.stringify({records,errors}));
}finally{await browser.close()}
