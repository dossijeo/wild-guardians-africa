import {globalNativeQuery} from './global-native-recipe-20261022.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/shore-build-stages-20261022';await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const biome of (process.env.WG_REVIEW_BIOMES??'gran-canon,manglares').split(','))for(const variant of ['nativebank']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.route('**/src/rendering/natural-water-edges.js*',async route=>{
 const response=await route.fetch();let body=await response.text();
 const start='export function prepareNaturalWater(world,geometry,cx,cz,source){';
 const end='geometry.userData.naturalWaterBed={nx,nz,bytes:bytes.byteLength,minX,minZ,width,height,lo,span};';
 if(!body.includes(start)||!body.includes(end))throw Error('Shore profiler anchors changed');
 body=body.replace(start,start+'const qaStarted=performance.now();globalThis.qaShoreProfile??={samples:[],liveBytes:0,peakBytes:0};');
 body=body.replace('const samples=new Float32Array(nx*nz);','const qaBoundaryDone=performance.now();const samples=new Float32Array(nx*nz);').replace('const span=Math.max(.001,hi-lo)','const qaHeightDone=performance.now();const span=Math.max(.001,hi-lo)').replace('const texture=new THREE.DataTexture','const qaPackDone=performance.now();const texture=new THREE.DataTexture');
 body=body.replace(end,end+"const p=globalThis.qaShoreProfile;p.liveBytes+=bytes.byteLength;p.peakBytes=Math.max(p.peakBytes,p.liveBytes);p.samples.push({ms:performance.now()-qaStarted,boundaryMs:qaBoundaryDone-qaStarted,heightMs:qaHeightDone-qaBoundaryDone,packMs:qaPackDone-qaHeightDone,materialMs:performance.now()-qaPackDone,bytes:bytes.byteLength,nx,nz,cx,cz,vertices:pos.count});let released=false;texture.addEventListener('dispose',()=>{if(!released){released=true;p.liveBytes-=bytes.byteLength;}});");
 await route.fulfill({response,body});
 });
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();const body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('Observation anchor missing');await route.fulfill({response,body:body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});
 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&'+globalNativeQuery+'&riverBank=soil&mangroveShore=sediment&waterPalette=regional&waterEdges=natural');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000}).catch(e=>{throw Error(errors.join('\n')+'\n'+e.message)});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.state.elapsed=2;w.simElapsed=2;w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});




 await page.evaluate(({biome,canyonTarget})=>{
 const w=window.qaCampaignWorld;
 if(biome==='sabana')w.controls.target.set(135,9.400129699707032,45);
 if(biome==='gran-rio')w.controls.target.set(87.83156862745099,7.077262442364413,15.827254901960785);
 if(biome==='gran-canon')w.controls.target.fromArray(canyonTarget);
 if(biome==='gran-rio'){const z=102;w.controls.target.set(w.nav.field.riverX(z),w.nav.field.riverLevel,z);}

 if(w.groundDetails.audit)w.groundDetails.timeOverride=2;
 },{biome,canyonTarget:[-47.868919372558594, 3.259999895095825, 102]});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;const o=w.controls.target.toArray();window.qaSandPath=[[22,16,18],[6,34,6],[-18,9,22]].map(([x,y,z])=>[o[0]+x,Math.max(o[1]+y,w.nav.field.surface(o[0]+x,o[2]+z)+1.2),o[2]+z]);w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();});

  for(const phase of phases){
   const dir=`${out}/${biome}-${quality}-${variant}-${phase}`;await mkdir(dir,{recursive:true});const frames=[];
   await page.evaluate(async phase=>{const w=window.qaCampaignWorld;w.state.time=phase==='day'?150:350;w.state.day=1;w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();for(const group of w.chunks.values())for(const batch of group.userData.lodBatches??[])batch.key=null;w.render(1/30);await Promise.all([...w.objects.values()].map(o=>o.userData.actorReady).filter(Boolean));for(let i=0;i<12;i++)w.render(1/30)},phase);
   for(let i=0;i<5;i++){
    const frame=await page.evaluate(async i=>{const started=performance.now();const w=window.qaCampaignWorld;window.qaBankBaseTarget??=w.controls.target.toArray();const delta=[0,96,192,96,0][i];w.controls.target.fromArray(window.qaBankBaseTarget);w.controls.target.z+=delta;const dx=['gran-rio','gran-canon'].includes(w.state.biome)?w.nav.field.riverX(w.controls.target.z)-w.nav.field.riverX(window.qaBankBaseTarget[2]):0;w.controls.target.x+=dx;w.camera.position.fromArray(window.qaSandPath[0]);w.camera.position.x+=dx;w.camera.position.z+=delta;w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();w.render(1/30);if(!w.sky.atmosphere)throw Error('Native atmosphere option not enabled');return {shoreProfile:globalThis.qaShoreProfile?{samples:globalThis.qaShoreProfile.samples.splice(0),liveBytes:globalThis.qaShoreProfile.liveBytes,peakBytes:globalThis.qaShoreProfile.peakBytes}:null,settleMs:performance.now()-started,origin:[w.renderOrigin.x,w.renderOrigin.z],i,palette:globalThis.qaEnvironmentPalette??null,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),time:w.state.time,glError:w.renderer.getContext().getError(),coverage:w.groundDetails.audit?.()??null,settings:{riverYards:w.biomeGround.riverYards,moss:w.biomeGround.mangroveMoss,substrate:w.biomeGround.mangroveSubstrate,canyonSoft:w.biomeGround.canyonSandSoft,canyonNormals:w.horizon?.smoothCanyonNormals,desertMeso:w.toon.desertMeso},memory:{...w.renderer.info.memory},calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,data:w.renderer.domElement.toDataURL('image/png').split(',')[1]}},i);
    if(frame.glError)throw Error('WebGL error '+frame.glError);await writeFile(`${dir}/${String(i).padStart(4,'0')}.png`,Buffer.from(frame.data,'base64'));delete frame.data;frames.push(frame);
   }
   if(errors.length)throw Error(errors.join('\n'));records.push({biome,quality,variant,phase,initialLodReset:true,frames,errors:[...errors]});await writeFile(out+'/captures.json',JSON.stringify({study:'Six-biome native-only material and coverage review; no timing claim.',seed:712,resolution:[1280,720],views:['game','elevated','reverse'],note:'Real paused campaign settlement, seed 712; identical poses and visual time, settled chunks. Static artistic review, not a performance benchmark.',records},null,2)+'\n');console.log(biome,quality,variant,phase,'captured');
  }
 await page.close();
 }}finally{await browser.close()}
