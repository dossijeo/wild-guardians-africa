import {installSkyDepth} from './qa-sky-horizon-cloud-mask-20261021.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const native=false;const out='docs/qa/global-visual-lab/loading-central-mesa-20261022';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
const errors=[];page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error(m.text());}});page.on('pageerror',e=>errors.push(e.message));const biome='sabana';const variant='shadow';
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
 body=body.replace(original,"mountains.arcLayout.slice(1,2).map(arc=>({...arc,angle:Math.atan2(-4.8,-6.4),height:7,aspect:2.47,uv:[.06,.515625,.35,.984375],baseY:-2.6}))");
 body=body.replace("fogMix:.2,fogBaseMix:.8","fogMix:.45,fogBaseMix:.85");
 body=body.replace('smoothstep(.02,.4,vBackdropHeight)*c.a','smoothstep(.02,.6,vBackdropHeight)*c.a*(1.-uBackdropNight)');
 // Preserve the original fixed camera distance for each aspect.
 if(variant==='shadow')body=body.replace('try{world.renderer.shadowMap.enabled=false;world.renderer.autoClear=false','try{world.renderer.shadowMap.enabled=true;world.renderer.autoClear=false');
 await route.fulfill({response,body});});
 await page.route('**/src/rendering/loading-focus-light.js*',async route=>{const response=await route.fetch();const body=(await response.text()).replace('mix(1.30,3.00,uLoadingFocusNight)','mix(1.30,2.30,uLoadingFocusNight)');await route.fulfill({response,body});});
 }
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});}); await page.goto('http://127.0.0.1:5190/?qa-seed=712'+(native?'&loadingBeam=oblique':''));
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});

await page.evaluate(async variant=>{
 const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.render=()=>{};
 const {LoadingDiorama}=await import('/src/rendering/loading-diorama.js');
 const d=window.qaLoading=new LoadingDiorama(w,{reducedMotion:true});await d.prepare();d.show({day:1,time:150,biome:'sabana'});if(variant==='garden'||variant==='shadow'){d.mist.night.set('#102d5b');d.mist.day.set('#dac5a0');d.backdrop.root.traverse(mesh=>{if(!mesh.isMesh)return;const uv=mesh.geometry.attributes.uv;let lo=1,hi=0;for(let i=0;i<uv.count;i++){lo=Math.min(lo,uv.getX(i));hi=Math.max(hi,uv.getX(i));}const a=n=>n.toFixed(8);mesh.material.fragmentShader=mesh.material.fragmentShader.replace('texture2D(uBackdropAtlas,vBackdropUv)','texture2D(uBackdropAtlas,vBackdropUv,2.5)').replace('c.a*(1.-uBackdropNight)',`c.a*(1.-uBackdropNight)*smoothstep(${a(lo)},${a(lo+(hi-lo)*.18)},vBackdropUv.x)*(1.-smoothstep(${a(hi-(hi-lo)*.18)},${a(hi)},vBackdropUv.x))`);mesh.material.needsUpdate=true;});}
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

if(native)await page.evaluate(()=>window.qaSetBeam=()=>{});else await page.evaluate(async()=>{window.qaSetBeam=(await import('/tools/experiments/qa-loading-beam-20261022.js')).installLoadingBeam(window.qaLoading)});
await page.evaluate(async()=>{window.qaLoading.world.renderer.debug.onShaderError=(gl,program,vs,fs)=>{throw Error(gl.getProgramInfoLog(program)+' '+gl.getShaderInfoLog(fs));};window.qaParallel=(await import('/tools/experiments/qa-loading-diffuse-contrast-20261022.js')).installParallelIsland(window.qaLoading)});
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
await writeFile(`${out}/captures.json`,JSON.stringify({note:'Actual diorama and UI. Paired original / parallel rays + island rim haze. Fixed camera per aspect, no automatic framing.',records,errors},null,2)+'\n');
console.log(JSON.stringify({records,errors}));
}finally{await browser.close()}
