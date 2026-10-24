import {globalNativeQuery} from './global-native-recipe-20261022.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out='docs/qa/global-visual-lab/mangrove-bank-wetland-cost-20261022';await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const biome of (process.env.WG_REVIEW_BIOMES??'manglares').split(','))for(const variant of ['native','wetland','native','wetland']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 if(variant==='wetland')await page.route('**/src/rendering/horizon.js*',async route=>{const response=await route.fetch();let body=await response.text();const anchor='this.group=group;this.scene.add(group);';if(!body.includes(anchor))throw Error('Horizon anchor missing');body="import {prepareMangroveBank} from '/tools/experiments/qa-mangrove-bank-sediment-20261022.js';\n"+body.replace(anchor,"for(const mesh of group.children)if(mesh.userData.nativeHorizon==='water')prepareMangroveBank(globalThis.qaCampaignWorld,mesh.geometry,region.cx,region.cz,mesh.material);"+anchor);await route.fulfill({response,body});});
 if(variant==='wetland'){
 await page.route('**/src/rendering/biome-ground.js*',async route=>{const response=await route.fetch();let body=await response.text();const anchor='return {...(this.riverUnderlay?';if(!body.includes(anchor))throw Error('Ground anchor missing');body=body.replace(anchor,`const shoreData=new Uint8Array(35*35);for(let iz=0;iz<35;iz++)for(let ix=0;ix<35;ix++){const info=this.field.waterInfo(bo.minX+(ix-1)*1.5,bo.minZ+(iz-1)*1.5);shoreData[iz*35+ix]=Math.round(Math.min(1,info.shore/8)*255);}const shoreTexture=new THREE.DataTexture(shoreData,35,35,THREE.RedFormat);shoreTexture.minFilter=shoreTexture.magFilter=THREE.LinearFilter;shoreTexture.unpackAlignment=1;shoreTexture.needsUpdate=true;this.masks.add(shoreTexture);return {uQaWetBank:{value:shoreTexture},...(this.riverUnderlay?`);const disposeAnchor='if(--owners===0&&mask!==this.unmappedMask&&this.masks.delete(mask))mask.dispose();';if(!body.includes(disposeAnchor))throw Error('Ground ownership anchor missing');body=body.replace(disposeAnchor,'if(--owners===0){if(mask!==this.unmappedMask&&this.masks.delete(mask))mask.dispose();const shore=uniforms.uQaWetBank?.value;if(shore&&this.masks.delete(shore))shore.dispose();}');await route.fulfill({response,body});});
 await page.route('**/src/rendering/global-mangrove-substrate.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('uniform sampler2D uLayerSandBase,uLayerSandNormal,uLayerSandARH;','uniform sampler2D uQaWetBank;uniform sampler2D uLayerSandBase,uLayerSandNormal,uLayerSandARH;');const anchor='mossCover=mix(.38,.98,mossCover);';if(!body.includes(anchor))throw Error('Moss cover anchor missing');body=body.replace(anchor,anchor+`float shoreDistance=texture(uQaWetBank,ctxUV).r*8.;float bankWet=(1.-smoothstep(.2,3.2,shoreDistance))*uGroundMapped;bankWet*=smoothstep(.20,.75,patchNoise);mossCover=mix(mossCover,.18,bankWet*.85);`);await route.fulfill({response,body});});
 }
 // In-memory QA observation hook only. The repository and production app are unchanged.
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();if(!body.includes('this.raycaster=new'))throw Error('World observation anchor missing');await route.fulfill({response,body:(variant==='wetland'?"import {prepareMangroveBank} from '/tools/experiments/qa-mangrove-bank-sediment-20261022.js';\n"+body.replace('if(waterGeometry){const mesh=', 'if(waterGeometry){prepareMangroveBank(this,waterGeometry,cx,cz);const mesh='):body).replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new')});});





 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:false})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&'+globalNativeQuery);
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state,null,{timeout:180000});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.state.elapsed=2;w.simElapsed=2;w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});




 await page.evaluate(({biome,canyonTarget})=>{
 const w=window.qaCampaignWorld;
 if(biome==='manglares'){const field=w.nav.field,o=w.controls.target.clone();let best=null;for(let x=o.x-120;x<=o.x+120;x+=4)for(let z=o.z-120;z<=o.z+120;z+=4){const info=field.waterInfo(x,z),distance=Math.hypot(x-o.x,z-o.z);if(info.inside||info.shore>2||distance<30)continue;let wet=0;for(let k=0;k<8;k++)wet+=field.waterInfo(x+Math.cos(k*Math.PI/4)*12,z+Math.sin(k*Math.PI/4)*12).inside?1:0;const score=Math.abs(wet-4)*20+distance*.02+info.shore;if(!best||score<best.score)best={x,z,score,wet,shore:info.shore};}if(!best)throw Error('No representative bank found');window.qaBankSite=best;w.controls.target.set(best.x,field.surface(best.x,best.z)+.9,best.z);}
 if(biome==='sabana')w.controls.target.set(135,9.400129699707032,45);
 if(biome==='gran-rio')w.controls.target.set(87.83156862745099,7.077262442364413,15.827254901960785);
 if(biome==='gran-canon')w.controls.target.fromArray(canyonTarget);
 if(w.groundDetails.audit)w.groundDetails.timeOverride=2;
 },{biome,canyonTarget:[-47.868919372558594, 3.259999895095825, 102]});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;const o=w.controls.target.toArray();window.qaSandPath=[[22,16,18],[6,34,6],[-18,9,22]].map(([x,y,z])=>[o[0]+x,Math.max(o[1]+y,w.nav.field.surface(o[0]+x,o[2]+z)+1.2),o[2]+z]);w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();});

  for(const phase of phases){
   const dir=`${out}/${biome}-${quality}-${variant}-${phase}`;await mkdir(dir,{recursive:true});const frames=[];
   await page.evaluate(async phase=>{const w=window.qaCampaignWorld;w.state.time=phase==='day'?150:350;w.state.day=1;w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();for(const group of w.chunks.values())for(const batch of group.userData.lodBatches??[])batch.key=null;w.render(1/30);await Promise.all([...w.objects.values()].map(o=>o.userData.actorReady).filter(Boolean));for(let i=0;i<12;i++)w.render(1/30)},phase);
   const result=await page.evaluate(async()=>{
    const w=window.qaCampaignWorld;w.qaContinuousGrass=w.groundDetails;const {measureCampaign}=await import('/tools/experiments/qa-campaign-frame-measure.js');
    await w.whenChunksReady();await w.horizon.whenReady();const originalSync=w.syncChunks;w.syncChunks=()=>{};const original=w.render;let index=0;const base=window.qaSandPath[0];
    const moving=function(...args){const t=index++/149*Math.PI*2;w.camera.position.set(base[0]+Math.sin(t)*4,base[1],base[2]+(Math.cos(t)-1)*4);return original.apply(this,args);};
    try{w.render=moving;const gpu=await measureCampaign(w,{gpuEnabled:true,samples:90,warmup:60});index=0;w.render=moving;const cadence=await measureCampaign(w,{samples:90,warmup:60});return {gpu,cadence};}finally{w.render=original;w.syncChunks=originalSync;}
   });
   if(errors.length)throw Error(errors.join('\n'));records.push({variant,phase,...result,errors:[...errors]});await writeFile(out+'/benchmarks.json',JSON.stringify({seed:712,note:"native/wetland/native/wetland, media, identical 4-unit moving camera path; baseline uses native water/soil, wetland adds sediment plus shore substrate mask. 60 warmup + 90 samples per pass; GPU query and cadence measured separately. Paused simulation, resident scene with syncChunks suspended in both arms; not streaming latency.",records},null,2));console.log(variant,phase,'measured');
  }
 await page.close();
 }}finally{await browser.close()}
