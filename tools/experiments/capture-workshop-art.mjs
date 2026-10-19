import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
const out='docs/qa/global-visual-lab/workshop-art';
await mkdir(out,{recursive:true});
await sharp(`${out}/mapu-0-color-art.png`).webp({quality:95,effort:6}).toFile('public/assets/visual-lab/mapu-0-color-art.webp');
const variants=(process.env.WG_ART_VARIANTS??'0,village-repacked,village-art').split(',');
const browser=await chromium.launch({channel:'chrome',headless:true});
const records=[];
try{
for(const variant of variants){
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(`http://127.0.0.1:5189/tests/browser/african-toon.html?case=1&q=media&visualLab=${variant}&visualLabReference=1`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.qaVisualReference&&document.querySelector('#status')?.textContent.includes('/30 ·'),null,{timeout:120000});
 for(const camera of ['medium','close']){
  await page.waitForFunction(()=>!document.querySelector('#villageClose').disabled);
  await page.locator('#villageClose').evaluate(e=>e.click());
  await page.waitForFunction(()=>!document.querySelector('#night').disabled);
  await page.evaluate(camera=>{
   const w=window.qaVisualReference.world,mesh=w.objects.get(w.state.villages[0].id).children.find(m=>m.isMesh);
   const center=mesh.geometry.boundingBox.getCenter(mesh.position.clone()).applyMatrix4(mesh.matrixWorld);
   w.controls.target.copy(center);w.camera.position.copy(center).add(camera==='medium'?{x:9,y:6.5,z:11}:{x:3.3,y:2.6,z:4.1});
   w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld();};w.render(.016);
  },camera);
  for(const phase of ['day','night']){
   const time=phase==='day'?150:350;
   if(await page.evaluate(()=>window.qaVisualReference.world.state.time)!==time)await page.locator('#night').evaluate(e=>e.click());
   await page.waitForFunction(t=>window.qaVisualReference.world.state.time===t,time);
   await page.waitForTimeout(500);
   await page.locator('#benchmark').evaluate(e=>e.click());
   await page.waitForFunction(()=>{try{return !!JSON.parse(document.querySelector('#benchmarkReport').textContent).submittedCalls;}catch{return false;}},null,{timeout:120000});
   await page.waitForFunction(()=>!document.querySelector('#night').disabled);
   const perf=JSON.parse(await page.locator('#benchmarkReport').textContent());
   await page.locator('#benchmarkReport').evaluate(e=>e.textContent='');
   await page.locator('#qaControls').evaluate(e=>e.open=false);
   await page.locator('#benchmarkPanel').evaluate(e=>e.hidden=true);
   const state=await page.evaluate(()=>{
    const w=window.qaVisualReference.world,m=w.objects.get(w.state.villages[0].id).children.find(m=>m.isMesh);
    const textures=new Set(),materials=new Set();w.scene.traverse(o=>{if(o.material)for(const mat of Array.isArray(o.material)?o.material:[o.material]){materials.add(mat.uuid);for(const value of Object.values(mat))if(value?.isTexture)textures.add(value.uuid);}});
    return {time:w.state.time,cameraPose:w.camera.position.toArray(),target:w.controls.target.toArray(),memory:{...w.renderer.info.memory},sceneMaterials:materials.size,sceneTextures:textures.size,buildingMaterials:Array.isArray(m.material)?m.material.length:1,buildingTexture:[m.material.map.image.width,m.material.map.image.height],buildingGeometryBytes:m.geometry.index.array.byteLength+(m.geometry.attributes.position.data?.array.byteLength??0)};
   });
   const filename=`${variant}-${camera}-${phase}.webp`;
   await sharp(await page.locator('canvas#world').screenshot()).webp({quality:95,effort:5}).toFile(`${out}/${filename}`);
   records.push({variant,camera,phase,filename,...state,drawCalls:perf.submittedCalls.mean,triangles:perf.submittedTriangles?.mean,cpuMs:perf.cpuSubmissionMs.mean,gpuMs:perf.gpuElapsedMs?.mean??null,errors:[...errors]});
   console.log(variant,camera,phase,records.at(-1).gpuMs);
  }
 }
 await page.close();
}
}finally{await browser.close();}
await writeFile(`${out}/capture-report.json`,JSON.stringify({renderer:'Chrome hardware WebGL2; QA fixture, not campaign',viewport:[1280,720],records},null,2)+'\n');
