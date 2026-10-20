import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='docs/qa/global-visual-lab/grass-streaming';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),records=[];
try{for(const sceneCase of [1,6])for(const variant of ['grass-clumps','grass-streaming']){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});
 await page.goto(`http://127.0.0.1:5190/tests/browser/african-toon.html?case=${sceneCase}&q=media&visualLab=global-lighting&visualLabReference=1`);
 await page.waitForFunction(()=>window.qaVisualReference&&document.querySelector('#status').textContent.includes('/30 '),null,{timeout:120000});
 await page.evaluate(async variant=>{const w=window.qaVisualReference.world;await(await import('/tools/experiments/qa-'+variant+'.js')).applyMaterialStudy(w);w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};},variant);
 await page.addStyleTag({content:'header,#benchmarkPanel,#noise-spatial-panel{display:none!important}'});
 for(const [step,dz] of [0,288,-288].entries()){
  const info=await page.evaluate(async({dz,variant})=>{
   const w=window.qaVisualReference.world,d=w.groundDetails;w.controls.target.z+=dz;w.camera.position.z+=dz;w.syncChunks();await w.horizon.whenReady();w.syncChunks();await w.whenChunksReady();
   const samples=[];for(let i=0;i<45;i++){w.render(.016);samples.push({count:d.count,scales:d.qaActive?.map(p=>p.scale)??null});await new Promise(r=>setTimeout(r,16));}
   if(d.mesh.count>192||d.mesh.instanceMatrix.count!==192)throw Error('Population capacity exceeded');
   const chunks=[...w.chunks.keys()].sort(),detailChunks=[...d.chunks.keys()].sort();
   if(variant==='grass-streaming'&&JSON.stringify(chunks)!==JSON.stringify(detailChunks))throw Error('Resident/detail chunks diverged');
   return {camera:w.camera.position.toArray(),target:w.controls.target.toArray(),chunks,detailChunks,count:d.count,capacity:d.mesh.instanceMatrix.count,candidates:[...d.chunks.values()].flat().length,samples,geometry:w.renderer.info.memory.geometries,textures:w.renderer.info.memory.textures};
  },{dz,variant});
  for(const phase of ['day','night']){
   const time=phase==='day'?150:350;if(await page.evaluate(()=>window.qaVisualReference.state.time)!==time)await page.locator('#night').evaluate(e=>e.click());
   await page.waitForFunction(t=>window.qaVisualReference.state.time===t&&!document.querySelector('#night').disabled,time);
   await page.evaluate(()=>window.qaVisualReference.world.render(.016));
   const file=`case-${sceneCase}-${variant}-${step}-${phase}.png`;await page.locator('#world').screenshot({path:out+'/'+file});
   records.push({sceneCase,variant,step,dz,phase,time,file,errors:[...errors],...info});
  }
 }
 if(variant==='grass-streaming'){
  const lifecycle=await page.evaluate(()=>{const w=window.qaVisualReference.world,d=w.groundDetails;const before=JSON.stringify([...d.chunks]);const p=[...d.chunks.values()].flat()[0];d.markDirtyAt(p.x,p.z);const dirty=d.dirtyChunks.size;d.flush(w.nav.field,w.state);if(!dirty||JSON.stringify([...d.chunks])!==before)throw Error('Dirty refresh changed stable candidates');let geometry=0,material=0;d.geometry.addEventListener('dispose',()=>geometry++);d.material.addEventListener('dispose',()=>material++);d.dispose();d.dispose();if(geometry!==1||material!==1||d.chunks.size)throw Error('Resource release mismatch');return {dirty,stableRefresh:true,geometryDisposals:geometry,materialDisposals:material};});
  records.push({sceneCase,variant,lifecycle});
 }
 await page.close();console.log(sceneCase,variant);
}await writeFile(out+'/streaming.json',JSON.stringify(records,null,2)+'\n');}finally{await browser.close()}
