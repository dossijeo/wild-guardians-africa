import {globalNativeQuery} from './global-native-recipe-20261022.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';


const out=process.env.WG_REVIEW_OUT??'docs/qa/global-visual-lab/far-transition-incremental-20261022';await mkdir(out,{recursive:true});const records=[];const phases=['day','night'];
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const quality of (process.env.WG_COVER_QUALITY??'media').split(','))for(const biome of (process.env.WG_REVIEW_BIOMES??'sabana').split(',')){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});const errors=[];
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});page.on('console',m=>{if(m.type()==='error'||/GL_INVALID|CONTEXT_LOST|error X/.test(m.text()))errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.route('**/src/rendering/scene.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('this.raycaster=new','globalThis.qaCampaignWorld=this;this.raycaster=new');await route.fulfill({response,body});});
 await page.route('**/tools/experiments/far-impostor-prototype.js*',async route=>{const response=await route.fetch();let body=await response.text();const anchor='if(toon||prelitAtlas)material.toneMapped=false;';if(!body.includes(anchor))throw Error('Impostor hook missing');body="import {installOrderedFarTransition} from './qa-incremental-far-transition-20261022.js';\nimport {registerFarTransition} from './qa-far-transition-materials-20261022.js';\n"+body.replace(anchor,anchor+"registerFarTransition(material,'impostor');").replace('let modelGeometry,modelMaterial,models,originalColor;', 'installOrderedFarTransition(impostors);let modelGeometry,modelMaterial,models,originalColor;');await route.fulfill({response,body});});
 await page.route('**/tools/experiments/native-tree-standby.js*',async route=>{const response=await route.fetch();let body=await response.text();const anchor='geometryView(source.geometry,capacity),source.material,capacity';if(!body.includes(anchor))throw Error('Standby hook missing');body="import {cloneStandbyTransition} from './qa-far-transition-materials-20261022.js';\n"+body.replace(anchor,'geometryView(source.geometry,capacity),cloneStandbyTransition(source.material),capacity').replace('mesh.dispose();mesh.geometry.dispose();','mesh.dispose();mesh.geometry.dispose();mesh.material.dispose();').replace('mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);','mesh.userData.materialRegistryExcluded=true;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);');await route.fulfill({response,body});});
 await page.route('**/src/app/main.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('} catch(e){if(loadingToken===loadingGeneration)', '} catch(e){globalThis.qaFarLoadError=String(e.stack??e);if(loadingToken===loadingGeneration)');await route.fulfill({response,body});});
 await page.route('**/src/rendering/shader-failure.js*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('throw failure.current;', 'globalThis.qaShaderFailure=failure.current.details;throw failure.current;');await route.fulfill({response,body});});
 await page.addInitScript(quality=>localStorage.setItem('wild-guardians:settings',JSON.stringify({quality,farVegetation:true})),quality);
 await page.goto('http://127.0.0.1:5190/?qa-seed=712&spatialFar=1&'+globalNativeQuery+'&waterPalette=regional&riverBank=soil&mangroveShore=sediment'+'&waterEdges=natural'+'&waterCore=opaque');
 await page.waitForSelector('#native-menu',{timeout:60000});const frame=page.frames().find(f=>f.url().includes('/menu/'))??await page.waitForEvent('framenavigated',{predicate:f=>f.url().includes('/menu/'),timeout:60000});
 await frame.waitForLoadState('load');await frame.waitForFunction(()=>document.body.innerText.toUpperCase().includes('JUEGO NUEVO'));
 await frame.evaluate(biome=>parent.postMessage({type:'wild-guardians:menu',action:'start',biome,culture:'mapungubwe'},location.origin),biome);
 await page.waitForFunction(()=>globalThis.qaFarLoadError||(document.querySelector('#stage[aria-busy="false"]')&&window.qaCampaignWorld?.state),null,{timeout:180000}).catch(async e=>{await writeFile(out+'/load-failure.json',JSON.stringify(await page.evaluate(()=>({text:document.body.innerText,far:globalThis.qaCampaignWorld?.farVegetation?.stats,adapters:globalThis.qaCampaignWorld?.farVegetation?.adapters?.map(a=>({stats:a.stats,pending:a.preparationStatus()}))})),null,2));throw Error(errors.join('\n')+'\n'+e.message)});
 const failure=await page.evaluate(()=>globalThis.qaFarLoadError&&(globalThis.qaFarLoadError+'\n'+JSON.stringify(globalThis.qaShaderFailure)));if(failure){await writeFile(out+'/load-failure.json',JSON.stringify({error:failure},null,2));throw Error(failure);}
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;const {pause}=await import('/src/simulation/game.js');pause(w.state,'menu');w.state.elapsed=2;w.simElapsed=2;w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};});

 await page.evaluate(()=>{const w=window.qaCampaignWorld,update=w.materialRegistry.update.bind(w.materialRegistry);w.materialRegistry.update=()=>update(0)});




 await page.evaluate(({biome,canyonTarget})=>{
 const w=window.qaCampaignWorld;
 if(biome==='sabana')w.controls.target.set(135,9.400129699707032,45);
 if(biome==='gran-rio')w.controls.target.set(87.83156862745099,7.077262442364413,15.827254901960785);
 if(biome==='gran-canon')w.controls.target.fromArray(canyonTarget);
 if(biome!=='gran-canon'&&biome!=='desierto'){const f=w.nav.field,o=w.controls.target.clone();let best=null;for(let z=-100;z<=100;z+=2)for(let x=-100;x<=100;x+=2){const px=o.x+x,pz=o.z+z,info=f.waterInfo(px,pz);if(info.inside&&(!best||x*x+z*z<best.d))best={x:px,z:pz,d:x*x+z*z};}if(best)w.controls.target.set(best.x,f.surface(best.x,best.z)+.9,best.z);}
 if(w.groundDetails.audit)w.groundDetails.timeOverride=2;
 },{biome,canyonTarget:[-47.868919372558594, 3.259999895095825, 102]});
 await page.evaluate(async()=>{const w=window.qaCampaignWorld;w.controls.target.y=w.nav.field.surface(w.controls.target.x,w.controls.target.z)+.9;const o=w.controls.target.toArray();window.qaSandPath=[[22,16,18],[6,34,6],[-18,9,22]].map(([x,y,z])=>[o[0]+x,Math.max(o[1]+y,w.nav.field.surface(o[0]+x,o[2]+z)+1.2),o[2]+z]);w.camera.position.fromArray(window.qaSandPath[0]);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();});



 await page.evaluate(async()=>{const {prepareOrderedFarTransitions}=await import('/tools/experiments/qa-incremental-far-transition-20261022.js');const scene=qaCampaignWorld.scene,old=scene.onBeforeRender;scene.onBeforeRender=function(...args){old.apply(this,args);prepareOrderedFarTransitions(...args)};});
 for(const phase of phases){
  await page.evaluate(phase=>{const w=qaCampaignWorld;w.state.time=phase==='day'?150:350;w.state.day=1},phase);
  for(const variant of ['full','incremental']){
   await page.evaluate(async variant=>{const {setFarTransitionSmooth}=await import('/tools/experiments/qa-far-transition-materials-20261022.js');setFarTransitionSmooth(true);const {setOrderedFarTransition,setIncrementalFarPacking}=await import('/tools/experiments/qa-incremental-far-transition-20261022.js');setOrderedFarTransition(true);setIncrementalFarPacking(variant==='incremental');},variant);
   const result=await page.evaluate(async()=>{
    const w=qaCampaignWorld;w.camera.position.fromArray(qaSandPath[2]);w.syncChunks();await w.whenChunksReady();await w.horizon.whenReady();
    const {prepareInitialFarWorld}=await import('/src/app/far-world-loading.js');await prepareInitialFarWorld(w);
    for(let i=0;i<90;i++){await new Promise(requestAnimationFrame);w.render(0)}
    const meshes=[];w.scene.traverse(m=>{if(m.name!=='qa-opaque-far'&&m.geometry?.attributes.aTreeBase&&m.material?.fragmentShader?.includes('vDensityFade'))meshes.push(m)});
    if(!meshes.length)throw Error('No impostors found');
    const snapshots=meshes.map(m=>({mesh:m,attrs:Object.entries((m.userData.qaSourceGeometry??m.geometry).attributes).filter(([,a])=>a.isInstancedBufferAttribute).map(([key,a])=>({key,a,data:a.array.slice()}))}));
    const shots=[];
    try{
     for(const order of ['original','reversed','restored']){
      for(const {mesh,attrs} of snapshots)for(const {a,data} of attrs){
       if(order==='reversed'){for(let i=0;i<a.count;i++)for(let k=0;k<a.itemSize;k++)a.array[i*a.itemSize+k]=data[(a.count-1-i)*a.itemSize+k];}
       else a.array.set(data);a.needsUpdate=true;
      }
      w.renderer.info.reset();w.drawWorldFrame();
      shots.push({order,calls:w.renderer.info.render.calls,triangles:w.renderer.info.render.triangles,glError:w.renderer.getContext().getError(),data:w.renderer.domElement.toDataURL('image/png').split(',')[1]});
     }
    }finally{for(const {attrs}of snapshots)for(const {a,data}of attrs){a.array.set(data);a.needsUpdate=true}}
    const {orderedFarStats}=await import('/tools/experiments/qa-incremental-far-transition-20261022.js');return {packing:{...orderedFarStats},meshes:meshes.length,instances:meshes.reduce((s,m)=>s+m.geometry.instanceCount,0),camera:w.camera.position.toArray(),shots};
   });
   const dir=`${out}/${biome}-${quality}-${variant}-${phase}`;await mkdir(dir,{recursive:true});
   for(const shot of result.shots){await writeFile(dir+'/'+shot.order+'.png',Buffer.from(shot.data,'base64'));delete shot.data;}
   records.push({biome,quality,phase,variant,...result,errors:[...errors]});
   await writeFile(out+'/captures.json',JSON.stringify({note:'Same-frame draw order sensitivity diagnostic: reverse all per-instance impostor attributes, draw, restore. No world or material changes within each triplet.',records},null,2)+'\n');console.log(biome,phase,variant,'order captured');
  }
 }
 await page.close();
 }}finally{await browser.close()}
