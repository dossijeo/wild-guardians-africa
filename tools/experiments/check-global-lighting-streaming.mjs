import {chromium} from 'playwright';import {mkdir,writeFile} from 'node:fs/promises';
const variant=process.env.WG_STREAM_VARIANT??'global-lighting';const out='docs/qa/global-visual-lab/global-lighting-integrated'+(variant==='0'?'/baseline-stream':'');await mkdir(out,{recursive:true});const records=[];const browser=await chromium.launch({channel:'chrome',headless:true});
try{const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
await page.goto('http://127.0.0.1:5190/tests/browser/african-toon.html?case=21&q=media&visualLab='+variant+'&visualLabReference=1');await page.waitForFunction(()=>window.qaVisualReference&&document.querySelector('#status').textContent.includes('/30 ·'),null,{timeout:120000});
await page.addStyleTag({content:'header,#benchmarkPanel,#noise-spatial-panel{display:none!important}'});
const start=await page.evaluate(()=>{const w=window.qaVisualReference.world;w.updateCamera=()=>{w.camera.lookAt(w.controls.target);w.camera.updateMatrixWorld()};return{camera:w.camera.position.toArray(),target:w.controls.target.toArray()}});
for(const quality of ['baja','media','alta'])for(const shift of [0,96,0]){
 await page.evaluate(async({quality,shift,start})=>{const w=window.qaVisualReference.world;w.qualitySetting(quality);w.controls.target.fromArray(start.target);w.camera.position.fromArray(start.camera);w.controls.target.x+=shift;w.camera.position.x+=shift;w.syncChunks(true);await w.whenChunksReady();w.render(.016)},{quality,shift,start});
 await page.waitForTimeout(500);
 const info=await page.evaluate(()=>{const w=window.qaVisualReference.world;return{chunks:[...w.chunks.keys()].sort(),terrain:w.terrainMeshes.length,casters:w.terrainMeshes.filter(m=>m.castShadow).length,camera:w.camera.position.toArray(),target:w.controls.target.toArray(),shadowEnabled:w.renderer.shadowMap.enabled,geometries:w.renderer.info.memory.geometries,textures:w.renderer.info.memory.textures}});
 if((variant==='0'?0:info.terrain)!==info.casters)throw Error('New terrain lost experimental caster flag');
 const file=`stream-${quality}-${records.length}-${shift}.png`;await page.locator('#world').screenshot({path:`${out}/${file}`});records.push({quality,shift,file,...info,errors:[...errors]});
 await writeFile(`${out}/streaming.json`,JSON.stringify({note:'Fixed-camera chunk traversal and quality switches; not simulation navigation or exhaustive residency test.',records},null,2)+'\n');
}
}finally{await browser.close()}
