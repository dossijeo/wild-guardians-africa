import {installSkyDepth} from './qa-sky-horizon-cloud-mask-20261021.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const native=true;const out='docs/qa/global-visual-lab/loading-native-region-20261022';await mkdir(out,{recursive:true});
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
const audit=await page.evaluate(async()=>{
 const d=window.qaLoading;window.qaParallel(true);
 const before={camera:d.camera.position.toArray(),zoom:d.camera.zoom,fov:d.camera.fov};
 for(let k=0;k<240;k++){const a=k*2.399963229728653,r=4.25*Math.sqrt(((k*73)%239)/239);const p=d.plants.plantNearby(r*Math.cos(a),r*Math.sin(a));if(p){d.diffuseBeam.plant();d.onPlant?.(p);}}
 for(let i=0;i<90;i++)d.render(1/30,1,{ready:true});
 return {before,after:{camera:d.camera.position.toArray(),zoom:d.camera.zoom,fov:d.camera.fov},mature:d.plants.mature,progress:d.plants.progress,plants:d.plants.plants.map(p=>({x:p.x,z:p.z})),initialFit:d.plants.plants.slice(0,4).map(p=>d.plants.validPosition(p.x,p.z))};
});
if(!audit.mature)throw Error('Mature fixture not ready');
if(JSON.stringify(audit.before)!==JSON.stringify(audit.after))throw Error('Camera changed');
const records=[];
for(const format of ['landscape','portrait']){
 await page.setViewportSize(format==='landscape'?{width:1280,height:720}:{width:390,height:844});
 for(const phase of ['day','night'])for(const degrees of [-10,0,10]){
  const r=await page.evaluate(({phase,degrees})=>{const d=window.qaLoading;d.state.time=phase==='day'?150:350;d.orbit.phase=Math.asin(degrees/10);d.render(0,1,{ready:true});d.world.renderer.info.autoReset=false;d.world.renderer.info.reset();d.render(0,1,{ready:true});window.qaLoadingOverlay.render({...window.qaSnapshot,progress:1},1,{night:d.night,accepting:false});return {camera:d.camera.position.toArray(),zoom:d.camera.zoom,fov:d.camera.fov,count:d.plants.plants.length,calls:d.world.renderer.info.render.calls,triangles:d.world.renderer.info.render.triangles,glError:d.world.renderer.getContext().getError()};},{phase,degrees});
  records.push({format,phase,degrees,...r});await page.screenshot({path:`${out}/${format}-${phase}-${degrees}.png`});
 }
}
await writeFile(`${out}/audit.json`,JSON.stringify({audit,records,errors},null,2));console.log(JSON.stringify({audit,records,errors}));
}finally{await browser.close()}
